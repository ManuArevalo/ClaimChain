// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * ClaimManagerV2
 * - Slashing for wrong votes, stake-weighted rewards
 * - Minimum quorum of revealed votes
 * - Commit-reveal voting to mitigate bribery/front-running
 * - Signed evidence from approved providers (ECDSA)
 * - Oracle verdict via off-chain signature (configurable signer)
 * - Paid appeals start a new round without expensive cleanup loops
 * - Adjustable timing/parameters via owner setters
 * - Pagination helpers
 */
contract ClaimManagerV2 is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // ------------------------- Types -------------------------

    struct Claim {
        address claimant;
        string description;
        uint256 createdAt;
        uint256 currentRound; // starts at 0, increments on appeal
        bool exists;
    }

    struct EvidenceItem {
        address provider;
        string inputType; // e.g., "oracle", "expert", "police", "community"
        bytes32 inputHash; // hash of evidence payload off-chain
        bool verdict; // provider's boolean opinion
        bool verified; // signature validated and provider approved
        uint256 timestamp;
    }

    struct VoteInfo {
        uint256 stake; // ETH staked by juror for this round
        bytes32 commitment; // keccak256(voteYes, nonce, msg.sender, claimId, round)
        bool revealed;
        bool voteYes; // valid only if revealed
        bool rewardClaimed;
    }

    struct Round {
        uint256 commitDeadline;
        uint256 revealDeadline;
        bool resolved;
        bool passed; // final outcome for this round
        bool quorumFailed; // if true, voters can refund stake, no slashing/rewards

        uint256 totalCommittedStake; // sum of all committed stakes
        uint256 totalYesStake; // revealed yes stake
        uint256 totalNoStake;  // revealed no stake
        uint256 numRevealedVoters;

        uint256 disputeBond; // bond posted to open/appeal this round; added to winners pool if resolved
        uint256 losersPool;  // computed at resolution (loser side + dispute bond)
        uint256 winnersTotalStake; // computed at resolution (yes or no side total)

        // Juror state per round
        mapping(address => VoteInfo) votes;
        // We store juror addresses only for light off-chain indexing of participants per round.
        address[] jurors;

        // Evidence submitted in this round
        EvidenceItem[] evidences;
    }

    // ------------------------- Storage -------------------------

    Claim[] public claims;

    // claimId => roundId => Round
    mapping(uint256 => mapping(uint256 => Round)) private claimRounds;

    // Provider approvals: provider => inputType => approved
    mapping(address => mapping(string => bool)) public approvedProviders;

    // Parameters
    uint256 public cooldownTime = 1 minutes;
    uint256 public commitPeriod = 3 minutes;
    uint256 public revealPeriod = 2 minutes;
    uint256 public minQuorumVotes = 3; // minimum number of revealed votes required

    // Appeals / fees
    address public treasury; // receives fees and slashed unrevealed stakes
    uint256 public appealFee = 0.02 ether; // must be sent when appealing

    // Oracle signer (off-chain) for verdicts
    address public oracleSigner;

    // Anti-spam submission cooldown
    mapping(address => uint256) public lastClaimTime;

    // ------------------------- Events -------------------------

    event ClaimSubmitted(uint256 indexed id, address indexed claimant, string reason);
    event RoundOpened(uint256 indexed claimId, uint256 indexed roundId, uint256 commitDeadline, uint256 revealDeadline, uint256 disputeBond);
    event VoteCommitted(uint256 indexed claimId, uint256 indexed roundId, address indexed juror, bytes32 commitment, uint256 stake);
    event VoteRevealed(uint256 indexed claimId, uint256 indexed roundId, address indexed juror, bool voteYes, uint256 stake);
    event ClaimResolved(uint256 indexed claimId, uint256 indexed roundId, bool passed, bool quorumFailed, uint256 winnersTotalStake, uint256 losersPool);
    event RewardClaimed(uint256 indexed claimId, uint256 indexed roundId, address indexed juror, uint256 amount);
    event EvidenceSubmitted(uint256 indexed claimId, uint256 indexed roundId, address indexed provider, string inputType, bool verdict);
    event OracleVerdictSubmitted(uint256 indexed claimId, bool verdict);

    // Parameter updates
    event ParamsUpdated(uint256 cooldownTime, uint256 commitPeriod, uint256 revealPeriod, uint256 minQuorumVotes);
    event AppealFeeUpdated(uint256 appealFee);
    event TreasuryUpdated(address treasury);
    event OracleSignerUpdated(address oracleSigner);
    event ProviderApprovalUpdated(address indexed provider, string inputType, bool approved);

    // ------------------------- Modifiers -------------------------

    modifier noSybilSpam() {
        require(block.timestamp > lastClaimTime[msg.sender] + cooldownTime, "Cooldown active");
        _;
    }

    modifier claimExists(uint256 claimId) {
        require(claimId < claims.length && claims[claimId].exists, "Invalid claim");
        _;
    }

    // ------------------------- Constructor -------------------------

    constructor(address initialOwner, address initialTreasury) Ownable(initialOwner) {
        treasury = initialTreasury;
    }

    // ------------------------- Core: Claims -------------------------

    function submitClaim(string calldata reason) external noSybilSpam returns (uint256 claimId) {
        require(bytes(reason).length > 0, "Description required");

        claimId = claims.length;
        claims.push(Claim({
            claimant: msg.sender,
            description: reason,
            createdAt: block.timestamp,
            currentRound: 0,
            exists: true
        }));

        lastClaimTime[msg.sender] = block.timestamp;
        emit ClaimSubmitted(claimId, msg.sender, reason);
    }

    function openOrDisputeRound(uint256 claimId) external payable claimExists(claimId) {
        // Acts as: open first round if none is active yet; or allow anyone to post a dispute bond for the active round
        Claim storage c = claims[claimId];
        Round storage r = claimRounds[claimId][c.currentRound];

        if (r.commitDeadline == 0) {
            // Initialize first round lazily
            r.commitDeadline = block.timestamp + commitPeriod;
            r.revealDeadline = r.commitDeadline + revealPeriod;
            r.disputeBond = msg.value; // initial bond becomes part of pool for winners on resolve
            emit RoundOpened(claimId, c.currentRound, r.commitDeadline, r.revealDeadline, r.disputeBond);
        } else {
            require(!r.resolved, "Round resolved");
            // Additional dispute bond can be added and will be included in winners pool
            r.disputeBond += msg.value;
        }
    }

    // ------------------------- Voting (Commit-Reveal) -------------------------

    // commitment must be: keccak256(abi.encodePacked(voteYes, nonce, msg.sender, claimId, roundId))
    function commitVote(uint256 claimId, bytes32 commitment) external payable nonReentrant claimExists(claimId) {
        Claim storage c = claims[claimId];
        Round storage r = claimRounds[claimId][c.currentRound];
        require(r.commitDeadline != 0, "Round not open");
        require(block.timestamp <= r.commitDeadline, "Commit phase ended");
        require(msg.value > 0, "Stake required");

        VoteInfo storage v = r.votes[msg.sender];
        require(v.stake == 0 && v.commitment == bytes32(0), "Already committed");

        v.stake = msg.value;
        v.commitment = commitment;

        r.totalCommittedStake += msg.value;
        r.jurors.push(msg.sender);

        emit VoteCommitted(claimId, c.currentRound, msg.sender, commitment, msg.value);
    }

    function revealVote(uint256 claimId, bool voteYes, bytes32 nonce) external nonReentrant claimExists(claimId) {
        Claim storage c = claims[claimId];
        Round storage r = claimRounds[claimId][c.currentRound];
        require(r.commitDeadline != 0, "Round not open");
        require(block.timestamp > r.commitDeadline, "Reveal not started");
        require(block.timestamp <= r.revealDeadline, "Reveal phase ended");

        VoteInfo storage v = r.votes[msg.sender];
        require(v.stake > 0 && v.commitment != bytes32(0), "No commitment");
        require(!v.revealed, "Already revealed");

        bytes32 expected = keccak256(abi.encodePacked(voteYes, nonce, msg.sender, claimId, c.currentRound));
        require(expected == v.commitment, "Invalid reveal");

        v.revealed = true;
        v.voteYes = voteYes;
        unchecked {
            r.numRevealedVoters += 1;
        }

        if (voteYes) {
            r.totalYesStake += v.stake;
        } else {
            r.totalNoStake += v.stake;
        }

        emit VoteRevealed(claimId, c.currentRound, msg.sender, voteYes, v.stake);
    }

    // ------------------------- Evidence -------------------------

    // Signed evidence by an approved provider. Signature binds contract, chainId, claimId, inputType hash, inputHash, verdict.
    function submitEvidenceSigned(
        uint256 claimId,
        string calldata inputType,
        bytes32 inputHash,
        bool verdict,
        bytes calldata signature
    ) external claimExists(claimId) {
        Claim storage c = claims[claimId];
        Round storage r = claimRounds[claimId][c.currentRound];
        require(!r.resolved, "Round resolved");

        bytes32 msgHash = keccak256(
            abi.encode(
                address(this),
                block.chainid,
                claimId,
                keccak256(bytes(inputType)),
                inputHash,
                verdict
            )
        );
        address signer = msgHash.toEthSignedMessageHash().recover(signature);
        require(approvedProviders[signer][inputType], "Provider not approved");

        r.evidences.push(EvidenceItem({
            provider: signer,
            inputType: inputType,
            inputHash: inputHash,
            verdict: verdict,
            verified: true,
            timestamp: block.timestamp
        }));

        emit EvidenceSubmitted(claimId, c.currentRound, signer, inputType, verdict);
    }

    // ------------------------- Oracle -------------------------

    // Off-chain oracle signer posts a verdict for the claim (informational; can influence auto-resolution rule below)
    function submitOracleVerdict(uint256 claimId, bool verdict, bytes calldata signature) external claimExists(claimId) {
        require(oracleSigner != address(0), "Oracle signer unset");
        bytes32 msgHash = keccak256(abi.encode(address(this), block.chainid, claimId, verdict));
        address signer = msgHash.toEthSignedMessageHash().recover(signature);
        require(signer == oracleSigner, "Invalid oracle signature");
        emit OracleVerdictSubmitted(claimId, verdict);
    }

    // ------------------------- Resolution -------------------------

    function resolve(uint256 claimId) external claimExists(claimId) {
        Claim storage c = claims[claimId];
        Round storage r = claimRounds[claimId][c.currentRound];
        require(r.commitDeadline != 0, "Round not open");
        require(!r.resolved, "Already resolved");
        require(block.timestamp > r.revealDeadline, "Reveal not finished");

        // Minimum quorum check on revealed votes
        if (r.numRevealedVoters < minQuorumVotes) {
            r.quorumFailed = true;
            r.resolved = true;
            r.passed = false; // unused when quorumFailed
            // On quorum failure, all revealed voters can refund their stake. Unrevealed stakes are slashed to treasury.
            uint256 unrevealedStake = r.totalCommittedStake - (r.totalYesStake + r.totalNoStake);
            if (unrevealedStake > 0 && treasury != address(0)) {
                (bool ok, ) = payable(treasury).call{value: unrevealedStake}("");
                ok; // ignore failure to avoid revert
            }
            emit ClaimResolved(claimId, c.currentRound, false, true, 0, 0);
            return;
        }

        // Hybrid rule example: if there exists both a verified police and oracle evidence in this round, auto-pass
        bool hasPolice;
        bool hasOracleEvidence;
        for (uint256 i = 0; i < r.evidences.length; i++) {
            if (keccak256(bytes(r.evidences[i].inputType)) == keccak256("police")) {
                hasPolice = true;
            }
            if (keccak256(bytes(r.evidences[i].inputType)) == keccak256("oracle")) {
                hasOracleEvidence = true;
            }
            if (hasPolice && hasOracleEvidence) {
                break;
            }
        }

        if (hasPolice && hasOracleEvidence) {
            r.passed = true;
        } else {
            r.passed = r.totalYesStake > r.totalNoStake;
        }

        r.resolved = true;

        // Compute winners' total stake and losers' pool (including dispute bond)
        if (r.passed) {
            r.winnersTotalStake = r.totalYesStake;
            r.losersPool = r.totalNoStake + r.disputeBond;
        } else {
            r.winnersTotalStake = r.totalNoStake;
            r.losersPool = r.totalYesStake + r.disputeBond;
        }

        // Unrevealed stakes are slashed to treasury to incentivize reveal
        uint256 unrevealedStake2 = r.totalCommittedStake - (r.totalYesStake + r.totalNoStake);
        if (unrevealedStake2 > 0 && treasury != address(0)) {
            (bool ok2, ) = payable(treasury).call{value: unrevealedStake2}("");
            ok2; // ignore failure
        }

        emit ClaimResolved(claimId, c.currentRound, r.passed, false, r.winnersTotalStake, r.losersPool);
    }

    // ------------------------- Rewards -------------------------

    function claimReward(uint256 claimId, uint256 roundId) external nonReentrant claimExists(claimId) {
        Claim storage c = claims[claimId];
        require(roundId <= c.currentRound, "Invalid round");
        Round storage r = claimRounds[claimId][roundId];
        require(r.resolved, "Not resolved");

        VoteInfo storage v = r.votes[msg.sender];
        require(v.stake > 0, "No stake");
        require(!v.rewardClaimed, "Already claimed");

        uint256 payout;

        if (r.quorumFailed) {
            // Refund only revealed voters
            require(v.revealed, "Only revealed can refund");
            payout = v.stake;
        } else {
            require(v.revealed, "Did not reveal");
            bool winner = (r.passed && v.voteYes) || (!r.passed && !v.voteYes);
            if (winner) {
                // Winners receive: original stake + pro-rata share of losersPool
                uint256 share = (r.winnersTotalStake > 0) ? (r.losersPool * v.stake) / r.winnersTotalStake : 0;
                payout = v.stake + share;
            } else {
                // Losers forfeited their stake
                payout = 0;
            }
        }

        v.rewardClaimed = true;
        if (payout > 0) {
            (bool ok, ) = payable(msg.sender).call{value: payout}("");
            require(ok, "Transfer failed");
        }
        emit RewardClaimed(claimId, roundId, msg.sender, payout);
    }

    // ------------------------- Appeals -------------------------

    // Starts a new round. Requires fee that will go to treasury; also allows optional additional dispute bond for the new round.
    function appeal(uint256 claimId) external payable claimExists(claimId) {
        Claim storage c = claims[claimId];
        Round storage prev = claimRounds[claimId][c.currentRound];
        require(prev.resolved, "Prev round not resolved");
        require(msg.value >= appealFee, "Appeal fee required");

        // Send appeal fee to treasury
        if (appealFee > 0 && treasury != address(0)) {
            (bool ok, ) = payable(treasury).call{value: appealFee}("");
            require(ok, "Treasury transfer failed");
        }

        // Remaining value (if any) is treated as dispute bond for new round
        uint256 newBond = msg.value - appealFee;

        unchecked { c.currentRound += 1; }
        Round storage r = claimRounds[claimId][c.currentRound];
        require(r.commitDeadline == 0, "Round already exists");

        r.commitDeadline = block.timestamp + commitPeriod;
        r.revealDeadline = r.commitDeadline + revealPeriod;
        r.disputeBond = newBond;

        emit RoundOpened(claimId, c.currentRound, r.commitDeadline, r.revealDeadline, r.disputeBond);
    }

    // ------------------------- Admin / Params -------------------------

    function setParams(
        uint256 _cooldownTime,
        uint256 _commitPeriod,
        uint256 _revealPeriod,
        uint256 _minQuorumVotes
    ) external onlyOwner {
        require(_commitPeriod > 0 && _revealPeriod > 0, "Bad periods");
        cooldownTime = _cooldownTime;
        commitPeriod = _commitPeriod;
        revealPeriod = _revealPeriod;
        minQuorumVotes = _minQuorumVotes;
        emit ParamsUpdated(cooldownTime, commitPeriod, revealPeriod, minQuorumVotes);
    }

    function setAppealFee(uint256 _appealFee) external onlyOwner {
        appealFee = _appealFee;
        emit AppealFeeUpdated(_appealFee);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setOracleSigner(address _oracleSigner) external onlyOwner {
        oracleSigner = _oracleSigner;
        emit OracleSignerUpdated(_oracleSigner);
    }

    function approveProvider(address provider, string calldata inputType, bool status) external onlyOwner {
        approvedProviders[provider][inputType] = status;
        emit ProviderApprovalUpdated(provider, inputType, status);
    }

    // ------------------------- Views / Pagination -------------------------

    function claimCount() external view returns (uint256) {
        return claims.length;
    }

    function getClaim(uint256 claimId) external view claimExists(claimId) returns (
        address claimant,
        string memory description,
        uint256 createdAt,
        uint256 currentRound
    ) {
        Claim storage c = claims[claimId];
        return (c.claimant, c.description, c.createdAt, c.currentRound);
    }

    function getRoundSummary(uint256 claimId, uint256 roundId) external view claimExists(claimId) returns (
        uint256 commitDeadline,
        uint256 revealDeadline,
        bool resolved,
        bool passed,
        bool quorumFailed,
        uint256 totalCommittedStake,
        uint256 totalYesStake,
        uint256 totalNoStake,
        uint256 numRevealedVoters,
        uint256 disputeBond,
        uint256 losersPool,
        uint256 winnersTotalStake
    ) {
        Round storage r = claimRounds[claimId][roundId];
        return (
            r.commitDeadline,
            r.revealDeadline,
            r.resolved,
            r.passed,
            r.quorumFailed,
            r.totalCommittedStake,
            r.totalYesStake,
            r.totalNoStake,
            r.numRevealedVoters,
            r.disputeBond,
            r.losersPool,
            r.winnersTotalStake
        );
    }

    function getJurorState(uint256 claimId, uint256 roundId, address juror) external view returns (
        uint256 stake,
        bytes32 commitment,
        bool revealed,
        bool voteYes,
        bool rewardClaimed
    ) {
        Round storage r = claimRounds[claimId][roundId];
        VoteInfo storage v = r.votes[juror];
        return (v.stake, v.commitment, v.revealed, v.voteYes, v.rewardClaimed);
    }

    function listClaims(uint256 offset, uint256 limit) external view returns (
        uint256[] memory ids,
        address[] memory claimants,
        uint256[] memory createdAts,
        uint256[] memory currentRounds
    ) {
        uint256 n = claims.length;
        if (offset >= n) {
            return (new uint256[](0), new address[](0), new uint256[](0), new uint256[](0));
        }
        uint256 end = offset + limit;
        if (end > n) end = n;
        uint256 size = end - offset;
        ids = new uint256[](size);
        claimants = new address[](size);
        createdAts = new uint256[](size);
        currentRounds = new uint256[](size);
        for (uint256 i = 0; i < size; i++) {
            uint256 id = offset + i;
            ids[i] = id;
            claimants[i] = claims[id].claimant;
            createdAts[i] = claims[id].createdAt;
            currentRounds[i] = claims[id].currentRound;
        }
    }

    // ------------------------- Receive -------------------------

    receive() external payable {}
    fallback() external payable {}
}
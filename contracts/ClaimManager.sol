// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ClaimManager is Ownable, ReentrancyGuard {
    struct Claim {
        address claimant;
        string description;
        bool disputed;
        bool resolved;
        bool appealed;
        bool oracleVerified;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalStaked;
        uint256 createdAt;
        uint256 votingDeadline;
        bool passed;
    }

    struct JurorInput {
        address provider;
        bytes32 inputHash;
        string inputType; // "oracle", "expert", "police", "community"
        bool verdict;
        bool verified;
    }

    Claim[] public claims;

    mapping(address => uint256) public lastClaimTime;
    mapping(uint256 => address[]) public jurors;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public hasClaimedReward;
    mapping(uint256 => JurorInput[]) public claimInputs;
    mapping(address => mapping(string => bool)) public approvedProviders; // provider => inputType => approved

    uint256 public cooldownTime = 1 minutes;
    uint256 public votingPeriod = 5 minutes;

    event ClaimSubmitted(uint256 indexed id, address indexed claimant, string reason);
    event ClaimDisputed(uint256 indexed id, address indexed disputer, uint256 stake);
    event Voted(uint256 indexed id, address indexed juror, bool voteYes);
    event ClaimResolved(uint256 indexed id, bool passed);
    event RewardDistributed(uint256 indexed id, address indexed juror, uint256 reward);
    event OracleVerified(uint256 indexed id);
    event ClaimAppealed(uint256 indexed id);
    event EvidenceSubmitted(uint256 indexed claimId, address indexed provider, string inputType);

    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlyBeforeDeadline(uint256 claimId) {
        require(block.timestamp <= claims[claimId].votingDeadline, "Voting ended");
        _;
    }

    modifier noSybilSpam() {
        require(block.timestamp > lastClaimTime[msg.sender] + cooldownTime, "Cooldown active");
        _;
    }

    function submitClaim(string calldata reason) external noSybilSpam {
        require(bytes(reason).length > 0, "Description required");

        uint256 claimId = claims.length;
        claims.push(Claim({
            claimant: msg.sender,
            description: reason,
            disputed: false,
            resolved: false,
            appealed: false,
            oracleVerified: false,
            yesVotes: 0,
            noVotes: 0,
            totalStaked: 0,
            createdAt: block.timestamp,
            votingDeadline: block.timestamp + votingPeriod,
            passed: false
        }));

        lastClaimTime[msg.sender] = block.timestamp;
        emit ClaimSubmitted(claimId, msg.sender, reason);
    }

    function disputeClaim(uint256 claimId) external payable {
        require(claimId < claims.length, "Invalid ID");
        Claim storage c = claims[claimId];
        require(!c.disputed, "Already disputed");
        require(msg.value > 0, "Stake required");

        c.disputed = true;
        c.totalStaked += msg.value;

        emit ClaimDisputed(claimId, msg.sender, msg.value);
    }

    function voteOnClaim(uint256 claimId, bool voteYes) external payable onlyBeforeDeadline(claimId) {
        require(claimId < claims.length, "Invalid ID");
        Claim storage c = claims[claimId];
        require(c.disputed, "Not disputed");
        require(!hasVoted[claimId][msg.sender], "Already voted");
        require(msg.value > 0, "Stake required");

        hasVoted[claimId][msg.sender] = true;
        jurors[claimId].push(msg.sender);

        if (voteYes) c.yesVotes++;
        else c.noVotes++;

        c.totalStaked += msg.value;

        emit Voted(claimId, msg.sender, voteYes);
    }

    function resolveClaim(uint256 claimId) external {
        require(claimId < claims.length, "Invalid ID");
        Claim storage c = claims[claimId];
        require(c.disputed, "Not disputed");
        require(!c.resolved, "Already resolved");
        require(block.timestamp > c.votingDeadline, "Too early");

        // Example hybrid rule: If police + oracle evidence exists, auto-pass
        bool autoResolved;
        uint256 found;

        for (uint i = 0; i < claimInputs[claimId].length; i++) {
            if (keccak256(bytes(claimInputs[claimId][i].inputType)) == keccak256("police") ||
                keccak256(bytes(claimInputs[claimId][i].inputType)) == keccak256("oracle")) {
                found++;
            }
        }

        if (found >= 2) {
            c.passed = true;
            autoResolved = true;
        } else {
            c.passed = c.yesVotes > c.noVotes;
        }

        c.resolved = true;
        emit ClaimResolved(claimId, c.passed);
    }

    function claimReward(uint256 claimId) external nonReentrant {
        require(claimId < claims.length, "Invalid ID");
        Claim storage c = claims[claimId];
        require(c.resolved, "Not resolved");
        require(hasVoted[claimId][msg.sender], "Did not vote");
        require(!hasClaimedReward[claimId][msg.sender], "Already claimed");

        uint256 reward = c.totalStaked / jurors[claimId].length;
        hasClaimedReward[claimId][msg.sender] = true;
        payable(msg.sender).transfer(reward);

        emit RewardDistributed(claimId, msg.sender, reward);
    }

    function verifyByOracle(uint256 claimId) external onlyOwner {
        require(claimId < claims.length, "Invalid ID");
        claims[claimId].oracleVerified = true;
        emit OracleVerified(claimId);
    }

    function appealClaim(uint256 claimId) external onlyOwner {
        require(claimId < claims.length, "Invalid ID");
        Claim storage c = claims[claimId];
        require(c.resolved, "Already resolved");
        require(!c.appealed, "Already appealed");

        c.disputed = true;
        c.resolved = false;
        c.appealed = true;
        c.votingDeadline = block.timestamp + votingPeriod;
        c.yesVotes = 0;
        c.noVotes = 0;

        for (uint i = 0; i < jurors[claimId].length; i++) {
            delete hasVoted[claimId][jurors[claimId][i]];
            delete hasClaimedReward[claimId][jurors[claimId][i]];
        }
        delete jurors[claimId];

        emit ClaimAppealed(claimId);
    }

    function submitEvidence(uint256 claimId, string memory inputType, bytes32 inputHash) public {
        require(approvedProviders[msg.sender][inputType], "Not approved");

        JurorInput memory input = JurorInput({
            provider: msg.sender,
            inputHash: inputHash,
            inputType: inputType,
            verdict: false,
            verified: true
        });

        claimInputs[claimId].push(input);
        emit EvidenceSubmitted(claimId, msg.sender, inputType);
    }

    function approveProvider(address provider, string memory inputType, bool status) external onlyOwner {
        approvedProviders[provider][inputType] = status;
    }

    function getClaim(uint256 claimId) external view returns (
        address,
        string memory,
        bool,
        bool,
        bool,
        bool,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        bool
    ) {
        Claim storage c = claims[claimId];
        return (
            c.claimant,
            c.description,
            c.disputed,
            c.resolved,
            c.appealed,
            c.oracleVerified,
            c.yesVotes,
            c.noVotes,
            c.totalStaked,
            c.createdAt,
            c.votingDeadline,
            c.passed
        );
    }

    receive() external payable {}
    fallback() external payable {}
}

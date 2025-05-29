// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClaimManager {
    struct Claim {
        address claimant;
        string description;
        bool disputed;
        bool resolved;
        uint yesVotes;
        uint noVotes;
    }

    Claim[] public claims;
    // Track if an address has voted on a specific claim
    mapping(uint => mapping(address => bool)) public hasVoted;

    function submitClaim(string calldata description) external {
        claims.push(Claim({
            claimant: msg.sender,
            description: description,
            disputed: false,
            resolved: false,
            yesVotes: 0,
            noVotes: 0
        }));
    }

    function disputeClaim(uint claimId) external {
        Claim storage c = claims[claimId];
        require(!c.disputed, "Already disputed");
        c.disputed = true;
    }

    function voteOnClaim(uint claimId, bool voteYes) external {
        Claim storage c = claims[claimId];
        require(!c.resolved, "Claim resolved");
        require(!hasVoted[claimId][msg.sender], "Already voted");

        hasVoted[claimId][msg.sender] = true;
        if (voteYes) c.yesVotes++;
        else c.noVotes++;
    }

    function resolveClaim(uint claimId) external {
        Claim storage c = claims[claimId];
        require(!c.resolved, "Already resolved");
        require(c.disputed, "Not disputed");

        c.resolved = true;
        // Logic for payouts can be added here
    }

    function getClaim(uint id) external view returns (
        address, string memory, bool, bool, uint, uint
    ) {
        Claim storage c = claims[id];
        return (
            c.claimant,
            c.description,
            c.disputed,
            c.resolved,
            c.yesVotes,
            c.noVotes
        );
    }
}
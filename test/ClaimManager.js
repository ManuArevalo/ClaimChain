const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ClaimManager", function () {
  let claimManager, owner, user1, user2;

  beforeEach(async () => {
    const ClaimManager = await ethers.getContractFactory("ClaimManager");
    claimManager = await ClaimManager.deploy();
    await claimManager.deployed();

    [owner, user1, user2] = await ethers.getSigners();
  });

  it("should allow a user to submit a claim", async function () {
    await claimManager.connect(user1).submitClaim("My wallet was hacked");
    const [claimant, description] = await claimManager.getClaim(0);
    expect(claimant).to.equal(user1.address);
    expect(description).to.equal("My wallet was hacked");
  });

  it("should allow dispute and voting", async function () {
    await claimManager.connect(user1).submitClaim("Protocol failed");

    await claimManager.connect(user2).disputeClaim(0);
    await claimManager.connect(owner).voteOnClaim(0, true);

    await claimManager.connect(user1).resolveClaim(0);

    const [, , , resolved] = await claimManager.getClaim(0);
    expect(resolved).to.be.true;
  });
});

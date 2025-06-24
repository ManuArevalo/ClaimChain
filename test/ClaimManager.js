const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ClaimManager - Oracle, Appeal, and Juror System", function () {
  let ClaimManager, claimManager, owner, user1, user2, juror1, juror2;

  beforeEach(async () => {
    [owner, user1, user2, juror1, juror2] = await ethers.getSigners();
    ClaimManager = await ethers.getContractFactory("ClaimManager");
    claimManager = await ClaimManager.connect(owner).deploy(owner.address);
    await claimManager.waitForDeployment();
  });

  it("should allow users to submit and dispute a claim", async () => {
    const reason = "Lost package due to storm damage";

    // Submit claim
    await claimManager.connect(user1).submitClaim(reason);
    const claim = await claimManager.getClaim(0);
    expect(claim[0]).to.equal(user1.address);
    expect(claim[1]).to.equal(reason);

    // Dispute claim
    await claimManager.connect(user2).disputeClaim(0, { value: ethers.parseEther("1") });
    const disputed = (await claimManager.getClaim(0))[2];
    expect(disputed).to.equal(true);
  });

  it("should allow jurors to vote and claim rewards equally", async () => {
    await claimManager.connect(user1).submitClaim("Rain destroyed documents");
    await claimManager.connect(user2).disputeClaim(0, { value: ethers.parseEther("2") });

    await claimManager.connect(juror1).voteOnClaim(0, true, { value: ethers.parseEther("1") });
    await claimManager.connect(juror2).voteOnClaim(0, false, { value: ethers.parseEther("1") });

    await ethers.provider.send("evm_increaseTime", [360]); // wait until voting is over
    await ethers.provider.send("evm_mine");

    await claimManager.connect(owner).resolveClaim(0);

    // Rewards
    const before1 = await ethers.provider.getBalance(juror1.address);
    await claimManager.connect(juror1).claimReward(0);
    const after1 = await ethers.provider.getBalance(juror1.address);
    expect(after1 > before1).to.be.true;
  });

  it("should allow oracle verification and appeal", async () => {
    await claimManager.connect(user1).submitClaim("Police report issued");
    await claimManager.connect(user2).disputeClaim(0, { value: ethers.parseEther("1") });
    await claimManager.connect(juror1).voteOnClaim(0, true, { value: ethers.parseEther("1") });

    await ethers.provider.send("evm_increaseTime", [360]);
    await ethers.provider.send("evm_mine");

    await claimManager.connect(owner).resolveClaim(0);
    const resolvedBefore = (await claimManager.getClaim(0))[3];
    expect(resolvedBefore).to.equal(true);

    // Oracle verifies
    await claimManager.connect(owner).verifyByOracle(0);
    const verified = (await claimManager.getClaim(0))[5];
    expect(verified).to.equal(true);

    // Appeal
    await claimManager.connect(owner).appealClaim(0);
    const appealed = (await claimManager.getClaim(0))[4];
    expect(appealed).to.equal(true);
  });
});

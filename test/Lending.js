const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lending", function () {
  let Lending, lending, owner, depositor, borrower;

  beforeEach(async function () {
    // Get the signers (accounts)
    [owner, depositor, borrower] = await ethers.getSigners();

    // Deploy the contract with initial parameters
    const repayTime = 86400; // e.g., 1 day in seconds
    const interest = 10; // 10% interest rate
    Lending = await ethers.getContractFactory("Lending");
    lending = await Lending.connect(depositor).deploy(repayTime, interest, { value: ethers.utils.parseEther("10") });
    await lending.deployed();
  });

  it("Should deposit successfully", async function () {
    // Check the initial deposit made in the constructor
    expect(await lending.availableFunds()).to.equal(ethers.utils.parseEther("10"));

    // Test additional deposit
    await lending.connect(depositor).deposit({ value: ethers.utils.parseEther("5") });
    expect(await lending.availableFunds()).to.equal(ethers.utils.parseEther("15"));
  });

  it("Should not allow non-depositor to deposit", async function () {
    await expect(
      lending.connect(borrower).deposit({ value: ethers.utils.parseEther("5") })
    ).to.be.revertedWith("You must be the depositor");
  });

  it("Should borrow successfully", async function () {
    await lending.connect(borrower).borrow(ethers.utils.parseEther("2"));
    expect(await lending.availableFunds()).to.equal(ethers.utils.parseEther("8"));
    expect(await lending.borrowed()).to.equal(ethers.utils.parseEther("2"));
    expect(await lending.isLoanActive()).to.be.true;
  });

  it("Should repay loan fully", async function () {
    // Borrow an amount first
    await lending.connect(borrower).borrow(ethers.utils.parseEther("2"));

    // Repay with interest
    const repayAmount = ethers.utils.parseEther("2.2"); // 2 ETH borrowed + 10% interest = 2.2 ETH
    await lending.connect(borrower).repay({ value: repayAmount });
    
    expect(await lending.borrowed()).to.equal(0);
    expect(await lending.availableFunds()).to.equal(0);
    expect(await lending.isLoanActive()).to.be.false;
  });

  it("Should handle overpayment and return excess", async function () {
    // Borrow an amount
    await lending.connect(borrower).borrow(ethers.utils.parseEther("2"));

    // Repay with excess amount
    const repayAmount = ethers.utils.parseEther("3"); // Overpaying by 0.8 ETH
    const initialBalance = await borrower.getBalance();
    
    const tx = await lending.connect(borrower).repay({ value: repayAmount });
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    const finalBalance = await borrower.getBalance();

    // Check that only the necessary amount was taken and excess returned
    expect(await lending.isLoanActive()).to.be.false;
    expect(await lending.borrowed()).to.equal(0);
    expect(await lending.availableFunds()).to.equal(0);
    expect(finalBalance).to.be.closeTo(initialBalance.sub(gasUsed).sub(ethers.utils.parseEther("2.2")), ethers.utils.parseEther("0.001"));
  });
});

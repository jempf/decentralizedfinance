const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lending", function () {
  let Lending, lending, owner, depositor, borrower;

  beforeEach(async function () {
    [owner, depositor, borrower] = await ethers.getSigners();

    const maxRepaymentPeriod = 86400;
    const annualInterestRate = 10;
    Lending = await ethers.getContractFactory("Lending");
    lending = await Lending.connect(depositor).deploy(maxRepaymentPeriod, annualInterestRate, { value: ethers.utils.parseEther("10") });
    await lending.deployed();
  });

  it("Should deposit successfully", async function () {
    expect(await lending.totalFunds()).to.equal(ethers.utils.parseEther("10"));

    await lending.connect(depositor).depositFunds({ value: ethers.utils.parseEther("5") });
    expect(await lending.totalFunds()).to.equal(ethers.utils.parseEther("15"));
  });

  it("Should not allow non-depositor to deposit", async function () {
    await expect(
      lending.connect(borrower).depositFunds({ value: ethers.utils.parseEther("5") })
    ).to.be.revertedWith("Only the owner can deposit funds");
  });

  it("Should borrow successfully", async function () {
    await lending.connect(borrower).borrowFunds(ethers.utils.parseEther("2"));
    expect(await lending.totalFunds()).to.equal(ethers.utils.parseEther("8"));
    expect(await lending.loanAmount()).to.equal(ethers.utils.parseEther("2"));
    expect(await lending.isActiveLoan()).to.be.true;
  });

  it("Should repay loan fully", async function () {
    await lending.connect(borrower).borrowFunds(ethers.utils.parseEther("2"));

    const repayAmount = ethers.utils.parseEther("2.2");
    await lending.connect(borrower).repayLoan({ value: repayAmount });
    
    expect(await lending.loanAmount()).to.equal(0);
    expect(await lending.totalFunds()).to.equal(0);
    expect(await lending.isActiveLoan()).to.be.false;
  });

  it("Should handle overpayment and return excess", async function () {
    await lending.connect(borrower).borrowFunds(ethers.utils.parseEther("2"));

    const repayAmount = ethers.utils.parseEther("3");
    const initialBalance = await borrower.getBalance();
    
    const tx = await lending.connect(borrower).repayLoan({ value: repayAmount });
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    const finalBalance = await borrower.getBalance();

    expect(await lending.isActiveLoan()).to.be.false;
    expect(await lending.loanAmount()).to.equal(0);
    expect(await lending.totalFunds()).to.equal(0);
    expect(finalBalance).to.be.closeTo(initialBalance.sub(gasUsed).sub(ethers.utils.parseEther("2.2")), ethers.utils.parseEther("0.001"));
  });
});

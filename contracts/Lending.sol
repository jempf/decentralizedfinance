// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract Lending {
    uint256 public totalFunds;
    address public owner;
    uint256 public annualInterestRate;
    uint256 public maxRepaymentPeriod;
    uint256 public totalRepaid;
    uint256 public loanIssuedTimestamp;
    uint256 public loanAmount;
    bool public isActiveLoan;

    constructor(uint256 repaymentPeriod, uint256 interestRate) payable {
        require(repaymentPeriod > 0, "Repayment period must be positive");
        require(interestRate > 0, "Interest rate must be positive");
        
        maxRepaymentPeriod = repaymentPeriod;
        annualInterestRate = interestRate;
        owner = msg.sender;
        _depositFunds(msg.value);
    }

    function depositFunds() external payable {
        require(msg.sender == owner, "Only the owner can deposit funds");
        _depositFunds(msg.value);
    }

    function borrowFunds(uint256 amount) external {
        require(amount > 0, "Borrow amount must be positive");
        require(totalFunds >= amount, "Insufficient funds in contract");
        require(
            !isActiveLoan || block.timestamp > loanIssuedTimestamp + maxRepaymentPeriod,
            "Existing loan must be repaid before borrowing again"
        );

        if (!isActiveLoan) {
            loanIssuedTimestamp = block.timestamp;
        }

        totalFunds -= amount;
        loanAmount += amount;
        isActiveLoan = true;

        payable(msg.sender).transfer(amount);
    }

    function repayLoan() external payable {
        require(isActiveLoan, "No active loan to repay");

        uint256 repaymentDue = loanAmount + (loanAmount * annualInterestRate / 100);
        uint256 remainingBalance = repaymentDue - totalRepaid;
        uint256 excessAmount = 0;

        if (msg.value >= remainingBalance) {
            excessAmount = msg.value - remainingBalance;
            isActiveLoan = false;
        } else {
            totalRepaid += msg.value;
        }

        payable(owner).transfer(msg.value - excessAmount);

        if (excessAmount > 0) {
            payable(msg.sender).transfer(excessAmount);
        }

        if (!isActiveLoan) {
            _resetLoanState();
        }
    }

    // Helper Functions
    function _depositFunds(uint256 amount) internal {
        totalFunds += amount;
    }

    function _resetLoanState() internal {
        loanAmount = 0;
        totalFunds = 0;
        totalRepaid = 0;
        loanIssuedTimestamp = 0;
    }
}

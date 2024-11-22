// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
contract Lending {
    uint256 public availableFunds;
	address public depositor;
	uint256 public interest = 10;t
	uint256 public repayTime;
	uint256 public repayed;
	uint256 public loanStartTime;
	uint256 public borrowed;
	bool public isLoanActive;


    constructor(uint256 _repayTime, uint256 _interest) payable {
        repayTime = _repayTime;
        interest = _interest;
        depositor = msg.sender;
        deposit();
    }

    function deposit() public payable {
        require(msg.sender == depositor, 'You must be the depositor');
        availableFunds = availableFunds + msg.value;
    }


    function borrow(uint256 _amount) public {
	require(_amount > 0, 'Must borrow something');
	require(availableFunds >= _amount, 'No funds available');
	require(block.timestamp > loanStartTime + repayTime, 'Loan expired must be repayed first');
	
     if (borrowed == 0) {
         loanStartTime = block.timestamp;
     }
     availableFunds = availableFunds - _amount;
     borrowed = borrowed + _amount;
     isLoanActive = true;
     payable(msg.sender).transfer(_amount);
    }

    function repay() public payable {
	require(isLoanActive, 'Must be an active loan');
	uint256 amountToRepay = borrowed + (borrowed * interest / 100);
	uint256 leftToPay = amountToRepay - repayed;
	uint256 exceeding = 0;

    if (msg.value > leftToPay) {
        exceeding = msg.value - leftToPay;
        isLoanActive = false;
    } else if (msg.value == leftToPay) {
        isLoanActive = false;
    } else {
        repayed = repayed + msg.value;
    }

    payable(depositor).transfer(msg.value - exceeding);
    if (exceeding > 0) {
        payable(msg.sender).transfer(exceeding);
    }
    
    if (!isLoanActive) {
        borrowed = 0;
        availableFunds = 0;
        repayed = 0;
        loanStartTime = 0;
    }
    }



}
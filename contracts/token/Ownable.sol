//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
contract Ownable {
    address internal _owner;

    constructor() {
        _owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == _owner, "Ownable: caller is not the owner");
        _;
    } 
}
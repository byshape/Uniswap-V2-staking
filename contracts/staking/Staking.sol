//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IStaking.sol";
import "../token/ERC20.sol";
import "../uniswap/interfaces/IUniswapV2Pair.sol";

/// @title A staking contract for Uniswap V2 tokens
/// @author Xenia Shape
/// @notice This contract can be used for only the most basic staking test experiments
contract Staking is IStaking, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Stake {
        uint256 amount;
        uint256 timestamp;
        uint256 claimed;
    }

    mapping(address => Stake) internal _stakes;
    IUniswapV2Pair public pair;
    IERC20 public rewardToken;

    uint256 public rewardTime;
    uint256 public rewardShare;
    uint256 public freezeTime;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Function for setting up staking parameters
    /// @param pair_ Address of the Uniswap liquidity pool
    /// @param rewardToken_ Address of the ERC20 reward token
    /// @param rewardTime_ Reward time interval in seconds
    /// @param rewardShare_ Reward percentage of staked tokens value
    /// @param freezeTime_ Lock time for the stake in seconds
    function setUpConfig(
        IUniswapV2Pair pair_,
        IERC20 rewardToken_,
        uint256 rewardTime_,
        uint256 rewardShare_,
        uint256 freezeTime_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        pair = pair_;
        rewardToken = rewardToken_;
        rewardTime = rewardTime_;
        freezeTime = freezeTime_;
        rewardShare = rewardShare_;

        emit ConfigChanged();
    }

    /// @notice Function for staking LP tokens
    /// @param amount Amount of tokens to stake
    function stake(uint256 amount) external override {
        require(amount > 0, "Zero stake");
        require(pair.balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(pair.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        pair.transferFrom(msg.sender, address(this), amount);
        
        if(_stakes[msg.sender].amount > 0) {
            _stakes[msg.sender].amount += amount;
            // solhint-disable-next-line not-rely-on-time
            _stakes[msg.sender].timestamp = block.timestamp;
        } else {
        // solhint-disable-next-line not-rely-on-time
            _stakes[msg.sender] = Stake({amount: amount, timestamp: block.timestamp, claimed: 0});
        }

        emit Staked(amount, msg.sender);
    }

    /// @notice Function for claiming staked tokens
    function claim() external override nonReentrant {
        // solhint-disable-next-line not-rely-on-time
        require(_stakes[msg.sender].timestamp + rewardTime <= block.timestamp, "Rewards are not available");
        
        uint256 rewardInToken0 = _getRewardInTokens(msg.sender);
        require(_stakes[msg.sender].amount > 0 && rewardInToken0 > 0, "Nothing to claim");
        _stakes[msg.sender].claimed += rewardInToken0;
        rewardToken.safeTransfer(msg.sender, rewardInToken0);

        emit Claimed(rewardInToken0, msg.sender);
    }

    /// @notice Function for unstaking staked tokens
    function unstake() external override nonReentrant {
        // solhint-disable-next-line not-rely-on-time
        require(_stakes[msg.sender].timestamp + freezeTime <= block.timestamp, "Unstake is not available");
        pair.transfer(msg.sender, _stakes[msg.sender].amount);

        emit Unstaked(_stakes[msg.sender].amount, msg.sender);
        
        delete _stakes[msg.sender];
    }

    /// @notice Function for setting up the reward share
    /// @dev Only admin can do that
    function setupRewardShare(uint256 rewardShare_) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardShare = rewardShare_;
        emit ConfigChanged();
    }

    /// @notice Function for setting up the freeze time
    /// @dev Only admin can do that
    function setupFreezeTime(uint256 freezeTime_) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        freezeTime = freezeTime_;
        emit ConfigChanged();
    }

    /* 
    * This function returns the amount of tokens in according to the amount of reward periods since stake
    * minus claimed earlier tokens
    */
    function _getRewardInTokens(address owner) internal view returns(uint256) {
        // solhint-disable-next-line not-rely-on-time
        uint256 rewardPeriods = (block.timestamp - _stakes[msg.sender].timestamp) / rewardTime;
        uint256 rewardLP = _stakes[owner].amount * rewardShare / 100;
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = pair.getReserves();
        return rewardLP * reserve0 / pair.totalSupply() * rewardPeriods - _stakes[owner].claimed;
        
    }
}
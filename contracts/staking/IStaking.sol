//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IStaking {
    event ConfigChanged();
    event Staked(uint256 amount, address account);
    event Claimed(uint256 amount, address account);
    event Unstaked(uint256 amount, address account);

    function stake(uint256 amount) external;
    function claim() external;
    function unstake() external;
    function setupRewardShare(uint256 rewardShare_) external;
    function setupFreezeTime(uint256 freezeTime_) external;
}

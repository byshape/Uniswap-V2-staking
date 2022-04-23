# Description
This is a simple contract for staking Uniswap V2 liquidity pool tokens. Its main features:
* It stakes tokens.
* It allows to claim a reward for staked tokens in ERC20 reward tokens.
* It unstakes staked tokens.

## Launch instructions
Run this command in terminal
```
npm install --save-dev hardhat
```
When installation process is finished, create `.env` file and add `API_URL`, `FORK_URL`, `PRIVATE_KEY`, `ETHERSCAN_API_KEY`, `ROUTER_ADDRESS` (Uniswap V2 router address) and `FACTORY_ADDRESS` (Uniswap V2 factory address) variables there.

Run:
* `npx hardhat test --network hardhat` to run tests
* `npx hardhat coverage` to get coverage report
* `npx hardhat run --network ropsten scripts/deploy-tokens.ts` to deploy two ERC20 smart contracts to the ropsten testnet
* `npx hardhat run --network ropsten scripts/deploy-staking.ts` to deploy staking smart contracts to the ropsten testnet, please add `UNISWAP_PAIR_ADDRESS` after deploying tokens and creating pair on Uniswap
* `npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS` to verify staking contract or ERC20 tokens
* `npx hardhat help` to get the list of available tasks, including tasks for interaction with deployed contract: stake, claim, unstake.


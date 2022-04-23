import { task } from "hardhat/config";
import { types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const getContract = async (contract: string, hre:HardhatRuntimeEnvironment) => {
  const Factory = await hre.ethers.getContractFactory("Staking");
  return Factory.attach(contract);
}

task("stake", "Stakes LP tokens")
.addParam("contract", "Staking contract address", undefined, types.string)
.addParam("value", "Amount in LP to stake", undefined, types.string)
.setAction(async (taskArgs, hre) => {
    let staking = await getContract(taskArgs.contract, hre);
    await staking.stake(taskArgs.value);
    console.log(taskArgs.value, "LP tokens were staked");
});

task("claim", "Claims reward tokens")
.addParam("contract", "Staking contract address", undefined, types.string)
.setAction(async (taskArgs, hre) => {
    let staking = await getContract(taskArgs.contract, hre);
    await staking.claim();
    console.log("Reward tokens were claimed");
});

task("unstake", "Unstakes LP tokes")
.addParam("contract", "Staking contract address", undefined, types.string)
.setAction(async (taskArgs, hre) => {
    let staking = await getContract(taskArgs.contract, hre);
    await staking.unstake();
    console.log("LP were unstaked");
});
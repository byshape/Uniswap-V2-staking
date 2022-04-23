import { task } from "hardhat/config";
import { types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const getContract = async (contract: string, hre:HardhatRuntimeEnvironment) => {
  const erc20Factory = await hre.ethers.getContractFactory("ERC20");
  return erc20Factory.attach(contract);
}

task("balances", "Prints the account balance")
.addParam("contract", "ERC20 address", undefined, types.string)
.addParam("owner", "Owner address", undefined, types.string)
.setAction(async (taskArgs, hre) => {
    let erc20 = await getContract(taskArgs.contract, hre);
    let balance = await erc20.balanceOf(taskArgs.owner);
     console.log(taskArgs.owner, "has balance", balance.toString());
  });

task("allowances", "Prints the account allowance")
.addParam("contract", "ERC20 address", undefined, types.string)
.addParam("from", "Owner address", undefined, types.string)
.addParam("to", "Spender address", undefined, types.string)
.setAction(async (taskArgs, hre) => {
    let erc20 = await getContract(taskArgs.contract, hre);
    let balance = await erc20.allowance(taskArgs.from, taskArgs.to,);
    console.log(taskArgs.to, "has approval", balance.toString());
  });

task("transfer", "Transfers tokens to address")
.addParam("contract", "ERC20 address", undefined, types.string)
.addParam("to", "Recipient address", undefined, types.string)
.addParam("value", "Amount to transfer", undefined, types.int)
.setAction(async (taskArgs, hre) => {
    let erc20 = await getContract(taskArgs.contract, hre);
    await erc20.transfer(taskArgs.to, taskArgs.value);
    console.log(`Tokens were transferred`);
});

task("approve", "Approves tokens to address")
.addParam("contract", "ERC20 address", undefined, types.string)
.addParam("to", "Spender address", undefined, types.string)
.addParam("value", "Amount to approve", undefined, types.int)
.setAction(async (taskArgs, hre) => {
    let erc20 = await getContract(taskArgs.contract, hre);
    await erc20.approve(taskArgs.to, taskArgs.value);
    console.log(`Tokens were approved`);
});

task("transferFrom", "Transfers approved tokens to address")
.addParam("contract", "ERC20 address", undefined, types.string)
.addParam("from", "Sender address", undefined, types.string)
.addParam("to", "Recipient address", undefined, types.string)
.addParam("value", "Amount to transfer", undefined, types.int)
.setAction(async (taskArgs, hre) => {
    let erc20 = await getContract(taskArgs.contract, hre);
    await erc20.transferFrom(taskArgs.from, taskArgs.to, taskArgs.value);
    console.log(`Tokens were transferred`);
});

task("mint", "Mints tokens to address")
.addParam("contract", "ERC20 address", undefined, types.string)
.addParam("to", "Recipient address", undefined, types.string)
.addParam("value", "Amount to mint", undefined, types.string)
.setAction(async (taskArgs, hre) => {
    let erc20 = await getContract(taskArgs.contract, hre);
    await erc20.mint(taskArgs.to, taskArgs.value);
    console.log(`Tokens were minted`);
});
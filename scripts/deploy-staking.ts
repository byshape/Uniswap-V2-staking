import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { IUniswapV2Router02, IUniswapV2Factory, IUniswapV2Pair, ERC20 } from "../typechain";

async function main() {
  const initialSupply: bigint = BigInt(1000 * 10 ** 18);
  const rewardTime: number = 60;
  const freezeTime: number = 120;
  const rewardShare: number = 10;

  let admin: SignerWithAddress;
  [admin] = await ethers.getSigners();

  // get uniswap contracts
  const router = <IUniswapV2Router02>(await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER_ADDRESS as string));
  const factory = <IUniswapV2Factory>(await ethers.getContractAt("IUniswapV2Factory", process.env.FACTORY_ADDRESS as string));
  console.log(`router ${router.address}, factory ${factory.address}`);

  const erc20A = <ERC20>(await ethers.getContractAt("ERC20", process.env.ERC20A_ADDRESS as string));
  console.log(`erc20A ${erc20A.address}`);
  const tokenDecimals = await erc20A.decimals();
  console.log(`tokenDecimals ${tokenDecimals}`);
  const erc20B = <ERC20>(await ethers.getContractAt("ERC20", process.env.ERC20B_ADDRESS as string));
  console.log(`erc20B ${erc20B.address}`);

  // get a pair
  const pair = <IUniswapV2Pair>(await ethers.getContractAt("IUniswapV2Pair", process.env.UNISWAP_PAIR_ADDRESS as string));
  console.log(`pair ${pair.address}`);

  // deploy staking contract
  const stakingFactory = await ethers.getContractFactory("Staking", admin);
  const staking = await stakingFactory.deploy();
  await staking.deployed();
  console.log(`staking ${staking.address}`);
  await staking.connect(admin).setUpConfig(pair.address, erc20A.address, rewardTime, rewardShare, freezeTime);
  console.log("config is set up");

  // approve LP tokens to the staking contract
  pair.connect(admin).approve(staking.address, await pair.balanceOf(admin.address));
  console.log("LP approved");

  // mint reward tokens
  await erc20A.connect(admin).mint(staking.address, ethers.utils.parseUnits("100000", tokenDecimals));
  console.log("erc20A minted");

  console.log("Staking contract deployed to:", staking.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

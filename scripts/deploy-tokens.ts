import fs from 'fs';
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


async function main() {
  const initialSupply: bigint = BigInt(1000 * 10 ** 18);

  let admin: SignerWithAddress;
  [admin] = await ethers.getSigners();

  // deploy tokens
  const erc20Factory = await ethers.getContractFactory("ERC20", admin);
  const erc20A = await erc20Factory.deploy("Test token A", "TSTA", 18, initialSupply, admin.address);
  await erc20A.deployed();
  console.log(`erc20A ${erc20A.address}`);
  const tokenDecimals = await erc20A.decimals();
  console.log(`tokenDecimals ${tokenDecimals}`);
  const erc20B = await erc20Factory.deploy("Test token B", "TSTB", 18, initialSupply, admin.address);
  await erc20B.deployed();
  console.log(`erc20B ${erc20B.address}`);

  fs.appendFileSync(`.env`, 
    `\rERC20A_ADDRESS=${erc20A.address}\rERC20B_ADDRESS=${erc20B.address}\r`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

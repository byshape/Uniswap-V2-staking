import { expect } from "chai";
import { network, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ERC20, ERC20__factory } from "../typechain";
import { BigNumber } from "ethers";

const zeroAddress: string = "0x0000000000000000000000000000000000000000";
const maxInt: bigint = BigInt(2 ** 256) - BigInt(1);

const getSigner = async (accountAddress: string):Promise<SignerWithAddress> => {
    const acc = accountAddress;
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [acc]
    });

    return await ethers.getSigner(acc);
};

describe("ERC20", () => {
    const initialSupply: bigint = BigInt(1000 * 10 ** 18);

    let admin: SignerWithAddress;
    let tokensOwner: SignerWithAddress;
    let user: SignerWithAddress;
    let user2: SignerWithAddress;
    let user3: SignerWithAddress;
    let erc20Factory: ERC20__factory;
    let erc20: ERC20;
    let currentSupply: bigint = initialSupply;
    let zeroSigner: SignerWithAddress;

    before(async () => {
        zeroSigner = await getSigner(zeroAddress);
    });

    it("Gets signers", async () => {
        [admin, tokensOwner, user, user2, user3] = await ethers.getSigners();
        await admin.sendTransaction({
            to: zeroSigner.address,
            value: ethers.utils.parseEther("1.0"),
          });
    });

    it("Deploys token contract", async () => {
        erc20Factory = await ethers.getContractFactory("ERC20", admin);
        erc20 = await erc20Factory.deploy("Test token", "TST", 18, initialSupply, tokensOwner.address);
        await erc20.deployed();
        expect(erc20.address).to.be.not.equal(zeroAddress);
        expect(await erc20.balanceOf(tokensOwner.address)).to.be.equal(initialSupply);
    });

    it("Does not mint tokens by non-owner",async () => {
        let amountToMint: bigint = BigInt(10);
        expect(await erc20.balanceOf(user.address)).to.be.equal(0);
        await expect(erc20.connect(user).mint(user.address, amountToMint)).to.be.revertedWith("Ownable: caller is not the owner");
        expect(await erc20.balanceOf(user.address)).to.be.equal(0);
    });

    it("Does not mint tokens to the zero address",async () => {
        let amountToMint: bigint = BigInt(10);
        expect(await erc20.balanceOf(zeroAddress)).to.be.equal(0);
        await expect(erc20.connect(admin).mint(zeroAddress, amountToMint)).to.be.revertedWith("Mint to the zero address");
        expect(await erc20.balanceOf(zeroAddress)).to.be.equal(0);
    });

    it("Mints tokens by the owner",async () => {
        let amountToMint: bigint = BigInt(10);
        expect(await erc20.balanceOf(user.address)).to.be.equal(0);
        await expect(erc20.connect(admin).mint(user.address, amountToMint)).to.emit(erc20, "Transfer").withArgs(zeroAddress, user.address, amountToMint);
        currentSupply += amountToMint;
        expect(await erc20.balanceOf(user.address)).to.be.equal(amountToMint);
    });

    it("Does not burn tokens from the zero address", async () => {
        let zeroAdressBalance: BigNumber = await erc20.balanceOf(zeroAddress);
        let amountToBurn: number = 10;
        await expect(erc20.connect(zeroSigner).burn(amountToBurn)).to.be.revertedWith("Burn from the zero address");
        expect(await erc20.balanceOf(zeroAddress)).to.be.equal(zeroAdressBalance);
    });

    it("Does not burn tokens more than balance", async () => {
        let tokensOwnerBalance: BigNumber = await erc20.balanceOf(tokensOwner.address);
        let amountToBurn: BigNumber = tokensOwnerBalance.add(10);
        await expect(erc20.connect(tokensOwner).burn(amountToBurn)).to.be.revertedWith("Burn amount exceeds balance");
        expect(await erc20.balanceOf(tokensOwner.address)).to.be.equal(tokensOwnerBalance);
    });

    it("Burns tokens", async () => {
        let amountToBurn: bigint = BigInt(10);
        expect(await erc20.balanceOf(tokensOwner.address)).to.be.equal(initialSupply);
        await expect(erc20.connect(tokensOwner).burn(amountToBurn)).to.emit(erc20, "Transfer").withArgs(tokensOwner.address, zeroAddress, amountToBurn);
        currentSupply -= amountToBurn;
        expect(await erc20.balanceOf(tokensOwner.address)).to.be.equal(initialSupply - amountToBurn);
    });

    it("Does not approve tokens from the zero address", async () => {
        let amountToApprove: bigint = BigInt(10);
        let userAllowance: BigNumber = await erc20.allowance(zeroAddress, user.address);
        await expect(erc20.connect(zeroSigner).approve(user.address, amountToApprove)).to.be.revertedWith("Approve from the zero address");
        expect(await erc20.allowance(zeroAddress, user.address)).to.be.equal(userAllowance);
    });

    it("Approves tokens", async () => {
        let amountToApprove: bigint = BigInt(10);
        await expect(erc20.connect(tokensOwner).approve(user.address, amountToApprove)).to.emit(erc20, "Approval").withArgs(tokensOwner.address, user.address, amountToApprove);
        expect(await erc20.allowance(tokensOwner.address, user.address)).to.be.equal(amountToApprove);
    });

    it("Allows to make an infinite approve", async () => {
        await expect(erc20.connect(tokensOwner).approve(user3.address, maxInt)).to.emit(erc20, "Approval").withArgs(tokensOwner.address, user3.address, maxInt);
        expect(await erc20.allowance(tokensOwner.address, user3.address)).to.be.equal(maxInt);
    });

    it("Does not approve tokens to the zero address", async () => {
        let amountToApprove: bigint = BigInt(10);
        await expect(erc20.connect(tokensOwner).approve(zeroAddress, amountToApprove)).to.be.revertedWith("Approve to the zero address");
        expect(await erc20.allowance(tokensOwner.address, zeroAddress)).to.be.equal(0);
    });

    it("Transfers approved tokens", async () => {
        let amountToTransfer: number = 5;
        let tokensOwnerBalance: BigNumber = await erc20.balanceOf(tokensOwner.address);
        expect(await erc20.balanceOf(user2.address)).to.be.equal(0);
        await expect(erc20.connect(user).transferFrom(tokensOwner.address, user2.address, amountToTransfer)).to.emit(erc20, "Transfer").withArgs(tokensOwner.address, user2.address, amountToTransfer);
        expect(await erc20.balanceOf(tokensOwner.address)).to.be.equal(tokensOwnerBalance.sub(amountToTransfer));
        expect(await erc20.balanceOf(user2.address)).to.be.equal(amountToTransfer);
    });

    it("Does not reduce infinite approval", async () => {
        let amountToTransfer: number = 5;
        let tokensOwnerBalance: BigNumber = await erc20.balanceOf(tokensOwner.address);
        expect(await erc20.balanceOf(user3.address)).to.be.equal(0);
        await expect(erc20.connect(user3).transferFrom(tokensOwner.address, user3.address, amountToTransfer)).to.emit(erc20, "Transfer").withArgs(tokensOwner.address, user3.address, amountToTransfer);
        expect(await erc20.balanceOf(tokensOwner.address)).to.be.equal(tokensOwnerBalance.sub(amountToTransfer));
        expect(await erc20.balanceOf(user3.address)).to.be.equal(amountToTransfer);
        expect(await erc20.allowance(tokensOwner.address, user3.address)).to.be.equal(maxInt);
    });

    it("Does not transfer tokens more than allowance", async () => {
        let tokensOwnerBalance: BigNumber = await erc20.balanceOf(tokensOwner.address);
        let amountToTransfer: BigNumber = tokensOwnerBalance.add(10);
        let user2Balance: BigNumber = await erc20.balanceOf(user2.address);
        await expect(erc20.connect(user).transferFrom(tokensOwner.address, user2.address, amountToTransfer)).to.be.revertedWith("Insufficient allowance");
        expect(await erc20.balanceOf(tokensOwner.address)).to.be.equal(tokensOwnerBalance);
        expect(await erc20.balanceOf(user2.address)).to.be.equal(user2Balance);
    });

    it("Does not transfer tokens more than balance", async () => {
        let userBalance: BigNumber = await erc20.balanceOf(user.address);
        let amountToTransfer: BigNumber = userBalance.add(10);
        let user2Balance: BigNumber = await erc20.balanceOf(user2.address);
        await expect(erc20.connect(user2).transfer(user.address, amountToTransfer)).to.be.revertedWith("Not enough tokens");
        expect(await erc20.balanceOf(user2.address)).to.be.equal(user2Balance);
        expect(await erc20.balanceOf(user.address)).to.be.equal(userBalance);
    });

    it("Transfers tokens", async () => {
        let amountToTransfer: number = 5;
        let userBalance: BigNumber = await erc20.balanceOf(user.address);
        let user2Balance: BigNumber = await erc20.balanceOf(user2.address);
        await expect(erc20.connect(user2).transfer(user.address, amountToTransfer)).to.emit(erc20, "Transfer").withArgs(user2.address, user.address, amountToTransfer);
        expect(await erc20.balanceOf(user2.address)).to.be.equal(user2Balance.sub(amountToTransfer));
        expect(await erc20.balanceOf(user.address)).to.be.equal(userBalance.add(amountToTransfer));
    });
});
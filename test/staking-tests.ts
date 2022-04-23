import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { IUniswapV2Router02, IUniswapV2Factory, IUniswapV2Pair, ERC20, ERC20__factory, Staking, Staking__factory } from "../typechain";
import { BigNumber } from "ethers";

describe("Staking", () => {
    const initialSupply: bigint = BigInt(1000 * 10 ** 18);
    const rewardTime: number = 1200;
    const freezeTime: number = 86400;
    const rewardShare: number = 10;

    let admin: SignerWithAddress;
    let user: SignerWithAddress;
    let user2: SignerWithAddress;
    let router: IUniswapV2Router02;
    let factory: IUniswapV2Factory;
    let erc20Factory: ERC20__factory;
    let erc20A: ERC20, erc20B: ERC20;
    let pair: IUniswapV2Pair;
    let stakingFactory: Staking__factory, staking: Staking;
    let tokenDecimals: number;
    let amountToStake: BigNumber;
    let rewardInTokens: BigNumber;

    before(async () => {
        // get signers
        [admin, user, user2] = await ethers.getSigners();

        // get uniswap contracts
        router = <IUniswapV2Router02>(await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER_ADDRESS as string));
        factory = <IUniswapV2Factory>(await ethers.getContractAt("IUniswapV2Factory", process.env.FACTORY_ADDRESS as string));
        expect(await router.factory()).to.be.equal(factory.address);

        // deploy tokens
        erc20Factory = await ethers.getContractFactory("ERC20", admin);
        erc20A = await erc20Factory.deploy("Test token A", "TSTA", 18, initialSupply, admin.address);
        await erc20A.deployed();
        expect(erc20A.address).to.be.not.equal("0x0000000000000000000000000000000000000000");
        expect(await erc20A.balanceOf(admin.address)).to.be.equal(initialSupply);
        erc20B = await erc20Factory.deploy("Test token B", "TSTB", 18, initialSupply, admin.address);
        await erc20B.deployed();
        expect(erc20B.address).to.be.not.equal("0x0000000000000000000000000000000000000000");
        expect(await erc20B.balanceOf(admin.address)).to.be.equal(initialSupply);
        tokenDecimals = await erc20A.decimals();

        // approve tokens to the router
        await erc20A.connect(admin).approve(router.address, ethers.constants.MaxUint256);
        await erc20B.connect(admin).approve(router.address, ethers.constants.MaxUint256);

        // create a pair
        let tokensAmount: BigNumber = ethers.utils.parseUnits("100", tokenDecimals);
        let minAmount: number = 0;
        let deadline: bigint = BigInt((await ethers.provider.getBlock("latest"))["timestamp"]) + BigInt(1000);
        await router.connect(admin).addLiquidity(erc20A.address, erc20B.address, tokensAmount, tokensAmount, minAmount, minAmount, admin.address, deadline);
        let pairAddress: string = await factory.getPair(erc20A.address, erc20B.address);
        pair = <IUniswapV2Pair>(await ethers.getContractAt("IUniswapV2Pair", pairAddress));
        let reserves = await pair.getReserves();
        expect(reserves["reserve0"]).to.be.equal(tokensAmount);
        expect(reserves["reserve1"]).to.be.equal(tokensAmount);

        // mint tokens to user and approve them to the router
        let amountToMint: BigNumber = ethers.utils.parseUnits("50", tokenDecimals);
        await erc20A.connect(admin).mint(user.address, amountToMint);
        await erc20B.connect(admin).mint(user.address, amountToMint);
        await erc20A.connect(user).approve(router.address, ethers.constants.MaxUint256);
        await erc20B.connect(user).approve(router.address, ethers.constants.MaxUint256);

        // add liquidity by user
        reserves = await pair.getReserves();
        let reservesA: BigNumber = reserves["reserve0"];
        let reservesB: BigNumber = reserves["reserve0"];
        tokensAmount = ethers.utils.parseUnits("10", tokenDecimals);
        minAmount = 0;
        deadline = BigInt((await ethers.provider.getBlock("latest"))["timestamp"]) + BigInt(1000);
        await router.connect(user).addLiquidity(erc20A.address, erc20B.address, tokensAmount, tokensAmount, minAmount, minAmount, user.address, deadline);
        expect(await factory.getPair(erc20A.address, erc20B.address)).to.be.equal(pair.address);
        reserves = await pair.getReserves();
        expect(reserves["reserve0"]).to.be.equal(reservesA.add(tokensAmount));
        expect(reserves["reserve1"]).to.be.equal(reservesB.add(tokensAmount));
        expect(await pair.balanceOf(user.address)).to.be.equal(tokensAmount);

        // deploy staking contract
        stakingFactory = await ethers.getContractFactory("Staking", admin);
        staking = await stakingFactory.deploy();
        await staking.deployed();
    });

    it("Sets the config up", async () => {
        await expect(staking.connect(admin).setUpConfig(pair.address, erc20A.address, rewardTime, rewardShare, freezeTime)).to.emit(staking, "ConfigChanged");
    });

    it("Mints reward tokens to the staking", async () => {
        await erc20A.connect(admin).mint(staking.address, ethers.utils.parseUnits("100000", tokenDecimals));
    });

    it("Does not stake LP tokens without approval", async () => {
        let amountToStake: BigNumber = await pair.balanceOf(user.address);
        await expect(staking.connect(user).stake(amountToStake)).to.be.revertedWith("Insufficient allowance");
        expect(await pair.balanceOf(user.address)).to.be.equal(amountToStake);
    });

    it("Approves LP tokens to staking", async () => {
        pair.connect(user).approve(staking.address, await pair.balanceOf(user.address));
    });

    it("Does not stake 0 LP tokens", async () => {
        let userBalance: BigNumber = await pair.balanceOf(user.address)
        await expect(staking.connect(user).stake(0)).to.be.revertedWith("Zero stake");
        expect(await pair.balanceOf(user.address)).to.be.equal(userBalance);
    });

    it("Does not stake more LP tokens than balance", async () => {
        let amountToStake: BigNumber = (await pair.balanceOf(user.address)).add(100);
        await expect(staking.connect(user).stake(amountToStake)).to.be.revertedWith("Insufficient balance");
        expect(await pair.balanceOf(user.address)).to.be.equal(amountToStake.sub(100));
    });

    it("Does not allow to claim reward with zero stake", async () => {
        let userBalanceTokens: BigNumber = await erc20A.balanceOf(user.address);
        await expect(staking.connect(user).claim()).to.be.revertedWith("Nothing to claim");
        expect(await erc20A.balanceOf(user.address)).to.be.equal(userBalanceTokens);
    });

    it("Stakes LP tokens", async () => {
        amountToStake = (await pair.balanceOf(user.address)).sub(1);
        await expect(staking.connect(user).stake(amountToStake)).to.emit(staking, "Staked").withArgs(amountToStake, user.address);
        amountToStake = amountToStake.add(1);
    });

    it("Stakes LP tokens the second time", async () => {
        await expect(staking.connect(user).stake(1)).to.emit(staking, "Staked").withArgs(1, user.address);
    });

    it("Does not allow to claim reward before reward time", async () => {
        let userBalanceTokens: BigNumber = await erc20A.balanceOf(user.address);
        await expect(staking.connect(user).claim()).to.be.revertedWith("Rewards are not available");
        expect(await erc20A.balanceOf(user.address)).to.be.equal(userBalanceTokens);
    });

    it("Allows to claim reward", async () => {
        let userBalanceTokens: BigNumber = await erc20A.balanceOf(user.address);
        let userRewardLP: BigNumber = amountToStake.div(10).mul(2);
        let totalSupplyLP: BigNumber = await pair.totalSupply();
        let reservesA: BigNumber = (await pair.getReserves())["reserve1"];
        rewardInTokens = userRewardLP.mul(reservesA).div(totalSupplyLP); 
        await ethers.provider.send('evm_increaseTime', [rewardTime * 2.8]);
        await staking.connect(user).claim();
        expect(await erc20A.balanceOf(user.address)).to.be.equal(userBalanceTokens.add(rewardInTokens));
    });

    it("Allows to claim reward the second time", async () => {
        let userBalanceTokens: BigNumber = await erc20A.balanceOf(user.address);
        let userRewardLP: BigNumber = amountToStake.div(10).mul(3);
        let totalSupplyLP: BigNumber = await pair.totalSupply();
        let reservesA: BigNumber = (await pair.getReserves())["reserve1"];
        let secondRewardInTokens = userRewardLP.mul(reservesA).div(totalSupplyLP).sub(rewardInTokens); 
        await ethers.provider.send('evm_increaseTime', [rewardTime]);
        await staking.connect(user).claim();
        expect(await erc20A.balanceOf(user.address)).to.be.equal(userBalanceTokens.add(secondRewardInTokens));
    });

    it("Does not unstakes LP tokens before freeze time ends", async () => {
        expect(await pair.balanceOf(user.address)).to.be.equal(0);
        await expect(staking.connect(user).unstake()).to.be.revertedWith("Unstake is not available");
        expect(await pair.balanceOf(user.address)).to.be.equal(0);
    });

    it("Unstakes LP tokens", async () => {
        await ethers.provider.send('evm_increaseTime', [freezeTime]);
        expect(await pair.balanceOf(user.address)).to.be.equal(0);
        await staking.connect(user).unstake();
        expect(await pair.balanceOf(user.address)).to.be.equal(amountToStake);
    });

    it("Does not set up the reward share by the non-admin", async () => {
        let newShare = 20;
        expect(await staking.rewardShare()).to.be.equal(rewardShare);
        await expect(staking.connect(user).setupRewardShare(newShare)).to.be.revertedWith("AccessControl:");
        expect(await staking.rewardShare()).to.be.equal(rewardShare);
    });

    it("Sets up the reward share by the admin", async () => {
        let newShare = 20;
        expect(await staking.rewardShare()).to.be.equal(rewardShare);
        await staking.connect(admin).setupRewardShare(newShare);
        expect(await staking.rewardShare()).to.be.equal(newShare);
    });

    it("Does not set up the freeze time by the admin", async () => {
        let newTime = freezeTime * 2;
        expect(await staking.freezeTime()).to.be.equal(freezeTime);
        await expect(staking.connect(user).setupFreezeTime(newTime)).to.be.revertedWith("AccessControl:");
        expect(await staking.freezeTime()).to.be.equal(freezeTime);
    });

    it("Sets up the freeze time by the admin", async () => {
        let newTime = freezeTime * 2;
        expect(await staking.freezeTime()).to.be.equal(freezeTime);
        await staking.connect(admin).setupFreezeTime(newTime);
        expect(await staking.freezeTime()).to.be.equal(newTime);
    });

});
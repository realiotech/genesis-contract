const { ether } = require('@openzeppelin/test-helpers');
const { BN } = require('@openzeppelin/test-helpers');
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');

const { expect, assert, should } = require('chai');


// Import utilities from Test Helpers
const { expectEvent, time } = require('@openzeppelin/test-helpers');

describe('Genesis smart contract test suite', () => {
    const [owner, account1, account2, account3, account4, account5, account6, stakingContractAddress] = accounts;
    const contractArtifact = contract.fromArtifact('Genesis');
    const xRIOTokenArtifact = contract.fromArtifact('xRIO');
    const rioTokenContractArtifact = contract.fromArtifact('RIOToken');
    const nftFactoryContractArtifact = contract.fromArtifact("RealioNFTFactory");

    const advanceBlock = async () => {
        const blockNumber = await web3.eth.getBlockNumber();
        await time.advanceBlockTo(blockNumber + 1)
    }

    before(async () => {
        try {
            console.log('create token contract')
            this.rioTokenContract = await rioTokenContractArtifact.new({from: owner})
            console.log(`rioToken contract deployed at ${this.rioTokenContract.address}`);

            console.log('create NFT factory contract')
            this.nftFactoryContract = await nftFactoryContractArtifact.new(
                'https://metadata-api.realio.fund', '0xf57b2c51ded3a29e6891aba85459d600256cf317',
                {from: owner})
            console.log(`NFT factory contract deployed at ${this.nftFactoryContract.address}`);

            this.xRIOTokenContract = await xRIOTokenArtifact.new(
              'Realio Issuance Network Token Voucher', 'xRIO',
                {from: owner}
            )

            console.log('create genesis contract')
            this.genesisContract = await contractArtifact.new({from: owner});
            console.log(`Genesis  contract deployed at ${this.genesisContract.address}`);
        } catch (e) {
            console.log(JSON.stringify(e));
            assert.fail('no error', 'error', `got an error=${e}`, null)
        }
    })

    beforeEach(async () => {
        await advanceBlock();
    })

    it ('should be locked', async () => {
        try {
            const contractLockStatus = await this.genesisContract.locked();
            console.log(`contractLockStatus=${contractLockStatus}`);
            expect(contractLockStatus).to.be.true;
        } catch (e) {
            console.log(JSON.stringify(e));
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

    it ('should set owner to deployer address', async() => {
        let contractOwner = await this.genesisContract.owner();
        console.log(`owner=${contractOwner}`)
        expect(contractOwner).to.equal(owner);
    })

    it ('should not allow staking while locked', async() => {
        try {
            should.fail(await this.genesisContract.stake(1));
        } catch (e) {

        }
    })

    it ('should not allow setting by non-owner', async() => {
        try {
            should.fail(await this.genesisContract.setWhaleThreshold(10, {from: account1}))
        } catch (e) {

        }
    })

    it ('should initialize the contract params', async () => {
        // check default value
        const result = await this.genesisContract.init(
            stakingContractAddress,
            this.xRIOTokenContract.address,
            this.rioTokenContract.address, {from: owner});
        expect(result.tx).to.be.exist
    })

    it ('should set realio token contract', async () => {
        // check default value
        const result = await this.genesisContract.setRIOToken(this.rioTokenContract.address, {from: owner});
        expect(result.tx).to.be.exist
    })

    it ('should set whale threshold', async () => {
        // check default value
        let val = await this.genesisContract.whaleThreshold()
        let expectedVal = web3.utils.toWei(`10000`);
        console.log(`whale threshold val=${val}`)
        expect(val.toString(10)).to.equal(expectedVal)
        const newVal = web3.utils.toWei('1000');
        const result = await this.genesisContract.setWhaleThreshold(newVal, {from: owner});
        expect(result.tx).to.be.exist
        await advanceBlock();
        // check updated value
        val = await this.genesisContract.whaleThreshold()
        console.log(`whale threshold updated val=${val}`)
        expect(val.toString(10)).to.equal(`${newVal}`)
        const r = await this.genesisContract.setWhaleThreshold(expectedVal, {from: owner});
        expect(r.tx).to.be.exist
        val = await this.genesisContract.whaleThreshold()
        console.log(`whaleVal   =${val}`)
        console.log(`expectedVal=${expectedVal}`)
        expect(expectedVal.toString(10)).to.equal(`${val}`)
    })

    it ('should set realio staking contract', async () => {
        // check default value
        const res = await this.genesisContract.setStakingContractAddress(stakingContractAddress, {from: owner});
        expect(res.tx).to.be.exist
        const address = await this.genesisContract.getStakingContractAddress();
        console.log(`staking contract address=${address}`)
        expect(address).to.equal(stakingContractAddress);
    })

    it ('should set realio NFT Factory contract', async () => {
        const result = await this.genesisContract.setRealioNFTContract(this.nftFactoryContract.address, {from: owner});
        expect(result.tx).to.be.exist
    })

    it ('should set xRIO contract', async () => {
        const result = await this.genesisContract.setxRIOToken(this.xRIOTokenContract.address, {from: owner});
        expect(result.tx).to.be.exist
    })

    it ('should set network genesis', async () => {
        // check default value
        let val = await this.genesisContract.networkGenesis()
        expect(val).to.be.false
        const result = await this.genesisContract.setNetworkGenesis({from: owner});
        expect(result.tx).to.be.exist
        await advanceBlock();
        // check updated value
        val = await this.genesisContract.networkGenesis()
        expect(val).to.be.true
    })

    it ('should flip the lock', async () => {
        // check default value
        let val = await this.genesisContract.locked()
        expect(val).to.be.false
        await this.genesisContract.flipLock({from: owner});
        await advanceBlock();
        // check updated value
        val = await this.genesisContract.locked()
        expect(val).to.be.true
        // unlock contract
        await this.genesisContract.flipLock({from: owner});
        val = await this.genesisContract.locked()
        expect(val).to.be.false

    })

    it ('should not be able to claim', async() => {
        try {
            const id = 1;
            const amount = 1;
            const data = null;
            should.fail(await this.genesisContract.claim(id, amount, data, {from: account1}));
        } catch (e) {

        }
    })

    describe('staking', async () => {
        before(async () => {
            const isLocked = await this.genesisContract.locked();
            if (isLocked) {
                console.log('flipping contract lock')
                await this.genesisContract.flipLock({ from: owner });
            }
            await this.genesisContract.setRealioNFTContract(this.nftFactoryContract.address, {from: owner});
            await this.nftFactoryContract.setMinterRole(this.genesisContract.address, {from: owner});
            await this.xRIOTokenContract.setMinter(this.genesisContract.address, {from: owner});
            await this.xRIOTokenContract.flipLock({from: owner});
        })

        const fundAccountWithRio = async (account, amount) => {
            await this.rioTokenContract.transfer(account, amount, {from: owner})
        }

        it ('should stake and xRIO go to staker', async () => {
            const stakingAmountStr = '100'
            const stakingAmount = web3.utils.toWei(stakingAmountStr);
            await fundAccountWithRio(account2, stakingAmount);
            const approvalResult = await this.rioTokenContract.approve(this.genesisContract.address, stakingAmount, { from: account2 })
            expect(approvalResult.tx).to.be.exist
            const result = await this.genesisContract.stake(stakingAmount, {from: account2});
            expect(result.tx).to.be.exist
            // check xRIO holdings
            const expectedXRIOBalance = web3.utils.toWei(`${+stakingAmountStr * 3}`)
            console.log(`expectedXRIOBalance=${expectedXRIOBalance}`);
            const xRIOBalance = await this.xRIOTokenContract.balanceOf(account2, {from: account2})
            expect(xRIOBalance.toString()).to.equal(expectedXRIOBalance)
        })

        it ('should get staked balance', async () => {
            const stakingAmount = web3.utils.toWei('100');
            const result = await this.genesisContract.getStakedBalance({from: account2});
            expect(result.toString()).to.equal(stakingAmount)
        })

        it ('should get staked balance for address', async () => {
            const stakingAmount = web3.utils.toWei('0');
            const result = await this.genesisContract.getStakedBalanceForAddress(account3, {from: account3});
            expect(result.toString()).to.equal(stakingAmount)
        })

        it ('should stake and award proper multiplier tier 1->2', async () => {
            const stakingVal = 100000
            const stakingAmount = web3.utils.toWei(`${stakingVal}`);
            await fundAccountWithRio(account4, stakingAmount);
            const approvalResult = await this.rioTokenContract.approve(this.genesisContract.address, stakingAmount, { from: account4 })
            expect(approvalResult.tx).to.be.exist
            const result = await this.genesisContract.stake(stakingAmount, {from: account4});
            expect(result.tx).to.be.exist
            // check xRIO holdings
            const xRIOBalance = await this.xRIOTokenContract.balanceOf(account4, {from: account4})
            console.log(`xRIOBalance=${xRIOBalance.toString(10)}`)
            console.log(`estimated  =${web3.utils.toWei('299900').toString(10)}`)
            // (99900 * 3) + (100 * 2)
            // 299900000000000000000000
            expect(xRIOBalance.toString(10)).to.be.equal(web3.utils.toWei('299900').toString(10))
        })

        it ('should stake and award proper multiplier tier 2->3', async () => {
            const stakingVal = 500000
            const stakingAmount = web3.utils.toWei(`${stakingVal}`);
            const stakedSupply = await this.genesisContract.stakedSupply()
            console.log(`stakedSupply=${stakedSupply}`)
            /// 100100000000000000000000
            await fundAccountWithRio(account5, stakingAmount);
            const approvalResult = await this.rioTokenContract.approve(this.genesisContract.address, stakingAmount, { from: account5 })
            expect(approvalResult.tx).to.be.exist
            const result = await this.genesisContract.stake(stakingAmount, {from: account5});
            expect(result.tx).to.be.exist
            // check xRIO holdings
            const xRIOBalance = await this.xRIOTokenContract.balanceOf(account5, {from: account5})
            console.log(`xRIOBalance=${xRIOBalance}`);
            // ((500000 - 100100) * 2) + (100100 * 1.5) = 949950
            expect(xRIOBalance.toString(10)).to.be.equal(web3.utils.toWei('949950').toString(10))
        })

        it ('should stake and award proper multiplier tier 3', async () => {
            const stakingAmount = web3.utils.toWei('1000');
            const stakedSupply = await this.genesisContract.stakedSupply()
            console.log(`stakedSupply=${stakedSupply}`)
            await fundAccountWithRio(account6, stakingAmount);
            const approvalResult = await this.rioTokenContract.approve(this.genesisContract.address, stakingAmount, { from: account6 })
            expect(approvalResult.tx).to.be.exist
            const result = await this.genesisContract.stake(stakingAmount, {from: account6});
            expect(result.tx).to.be.exist
            // check xRIO holdings
            const xRIOBalance = await this.xRIOTokenContract.balanceOf(account6, {from: account6})
            console.log(`xRIOBalance=${xRIOBalance}`);
            // (1000 * 1.5) = 1500
            expect(xRIOBalance.toString(10)).to.be.equal(web3.utils.toWei('1500').toString(10))
        })

        it ('should allow claim', async () => {
            let claimResult = await this.genesisContract.claim({from: account4});
            console.log(`claimResult=${claimResult}`)
            expect(claimResult.tx).to.be.exist

            expectEvent.inTransaction(claimResult.tx, nftFactoryContractArtifact, 'Create', {
                user: account4,
                tokenId: 1,
                amount: 1,
            });

            claimResult = await this.genesisContract.claim({from: account5});
            console.log(`claimResult=${claimResult}`)
            expect(claimResult.tx).to.be.exist

            expectEvent.inTransaction(claimResult.tx, nftFactoryContractArtifact, 'Create', {
                user: account5,
                tokenId: 2,
                amount: 1,
            });
        })

        it ('should not allow claim', async () => {
            try {
                should.fail(await this.genesisContract.claim({from: account6}));
            } catch (e) {

            }
        })

    })
})

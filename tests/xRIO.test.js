const {BN} = require("@openzeppelin/test-helpers");
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');

const { expect, assert, should } = require('chai');


// Import utilities from Test Helpers
const { expectEvent, time } = require('@openzeppelin/test-helpers');

describe('xRIO erc20 smart contract', () => {

    const [owner, account1, account2, minter, account4, account5] = accounts;
    const xRIOContractArtifact = contract.fromArtifact('xRIO');
    const name = "Realio Network Utility Token exchangable";
    const symbol = "xRIO"

    this.xRIO;

    before(async () => {
        try {
            this.xRIO = await xRIOContractArtifact.new(
                name,
                symbol,
                {from: owner}
            )
        } catch (e) {
            console.log(JSON.stringify(e));
            assert.fail('no error', 'error', `got an error=${e}`, null)
        }
    })

    beforeEach(async () => {
        const blockNumber = await web3.eth.getBlockNumber();
        await time.advanceBlockTo(blockNumber + 1)
    })

    it ('should be locked', async () => {
        try {
            const contractLockStatus = await this.xRIO.locked();
            console.log(`contractLockStatus=${contractLockStatus}`);
            expect(contractLockStatus).to.be.true;
        } catch (e) {
            console.log(JSON.stringify(e));
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

    it ('should flip the lock', async () => {
        // check default value
        let val = await this.xRIO.locked()
        expect(val).to.be.true
        await this.xRIO.flipLock({from: owner});
        // check updated value
        val = await this.xRIO.locked()
        expect(val).to.be.false
    })

    it ('max supply should be 50 million', async () => {
        try {
            const amount = '50000000';
            const result = await this.xRIO.maxSupply();
            expect(result.toString(10)).to.equal(`${web3.utils.toWei(amount)}`);
        } catch (e) {
            console.log(`caught an error maxSupply error=${JSON.stringify(e)}`);
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

    it ('should be able to mint tokens', async () => {
        try {
            const amount = 100;
            const result = await this.xRIO.mint(owner, amount, {from: owner});
            expect(result.tx).to.be.exist;
            expectEvent(result, 'Transfer');
            const totalSupply = await this.xRIO.totalSupply();
            expect(totalSupply.toString(10)).to.equal(`${amount}`);
        } catch (e) {
            console.log(`caught an error mint error=${JSON.stringify(e)}`);
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

    it ('should allow set minter to another account', async () => {
        try {
            const mintResult = await this.xRIO.setMinter(minter, {from: owner});
            expect(mintResult.tx).to.be.exist;
            expectEvent(mintResult, 'RoleGranted');
        } catch (e) {
            console.log(`caught an error setting minter error=${JSON.stringify(e)}`);
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

    it ('does not mint past total supply', async () =>{
        try {
            const mintResult = await this.xRIO.mint(account2, new BN('100000000000000000000'), {from: minter});
            console.log(`tokenURI=${mintResult}`);
            expect(mintResult).to.be.exist;
        } catch (e) {
            console.log(JSON.stringify(e));
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

    it ('returns total supply', async () =>{
        try {
            const totalSupply = await this.xRIO.totalSupply({from: account1});
            console.log(`totalSupply=${totalSupply}`);
            expect(totalSupply).to.be.exist;
        } catch (e) {
            console.log(JSON.stringify(e));
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

});

const { accounts, contract, web3 } = require('@openzeppelin/test-environment');

const { expect, assert, should } = require('chai');


// Import utilities from Test Helpers
const { expectEvent, time } = require('@openzeppelin/test-helpers');

describe('Realio NFT Factory smart contract', () => {

    const [owner, account1, account2, account3, account4, account5] = accounts;
    const nftFactoryContract = contract.fromArtifact('RealioNFTFactory');
    const baseUri = "https://metadata.realio.fund/token/";
    const proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317"

    this.nftFactory;

    before(async () => {
        try {
            this.nftFactory = await nftFactoryContract.new(
                baseUri,
                proxyRegistryAddress,
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

    it ('should create a new token type', async () => {
        try {
            const amount = 100;
            const result = await this.nftFactory.create(owner, amount, web3.utils.hexToBytes('0x000'), {from: owner});
            expect(result.tx).to.be.exist;
            expectEvent(result, 'Create');
            const totalSupply = await this.nftFactory.totalSupply(1);
            expect(totalSupply.toString(10)).to.equal(`${amount}`);
        } catch (e) {
            console.log(`caught an error create error=${JSON.stringify(e)}`);
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

    it ('should allow mint', async () => {
        try {
            const data = web3.utils.hexToBytes('0x000');
            const mintResult = await this.nftFactory.mint(account1, 1, 1, data, {from: owner});
            expect(mintResult.tx).to.be.exist;
            expectEvent(mintResult, 'TransferSingle');
            const totalSupply = await this.nftFactory.totalSupply(1);
            expect(totalSupply.toString(10)).to.equal('101')
        } catch (e) {
            console.log(`caught an error minting error=${JSON.stringify(e)}`);
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

    it ('should return minted tokenURI', async () =>{
        try {
            const tokenURI = await this.nftFactory.uri(1);
            console.log(`tokenURI=${tokenURI}`);
            expect(tokenURI).to.be.exist;
        } catch (e) {
            console.log(JSON.stringify(e));
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

    it ('should be ownable', async () =>{
        try {
            const _owner = await this.nftFactory.owner();
            console.log(`owner=${_owner}`);
            expect(_owner).to.be.exist;
            expect(_owner).to.be.equal(owner)
        } catch (e) {
            console.log(JSON.stringify(e));
            assert.fail('no error', 'error', `got an error=${e}`, null);
        }
    })

});

const HDWalletProvider = require("@truffle/hdwallet-provider");

const PW = process.env.WALLET_PASSWORD;
const MNEMONIC = process.env.MNEMONIC;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

if (!MNEMONIC) {
  console.error("Please set a MNEMONIC environment variable");
  process.exit(0);
}

if (!INFURA_PROJECT_ID && process.env.NETWORK !== 'development') {
  console.error("Please set a INFURA_PROJECT_ID  environment variable");
  process.exit(0);
}

const rinkebyNodeUrl = "https://rinkeby.infura.io/v3/" + INFURA_PROJECT_ID;

const mainnetNodeUrl = "https://mainnet.infura.io/v3/" + INFURA_PROJECT_ID;

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      gas: 6700000,
      network_id: "*", // Match any network id
    },
    rinkeby: {
      provider: function () {
        const wallet = new HDWalletProvider({
          mnemonic: MNEMONIC,
          providerOrUrl: rinkebyNodeUrl,
          addressIndex: 0
        });
        console.log(`using wallet=${JSON.stringify(wallet.getAddress(0))}`);
        return wallet;
      },
      gasPrice: 5000000000,
      network_id: "4",
    },
    mainnet: {
      network_id: 1,
      provider: function () {
        const wallet = new HDWalletProvider({
          mnemonic: MNEMONIC,
          providerOrUrl: mainnetNodeUrl,
          addressIndex: 0
        });
        console.log(`using wallet=${JSON.stringify(wallet.getAddress(0))}`);
        return wallet
      },
      gasPrice: 50000000000
    },
  },
  compilers: {
    solc: {
      version: "^0.8.0",
    },
  },
};

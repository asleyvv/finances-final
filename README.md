Educational project for the course Introduction to Finance. Not a real product, service or investment offer. Do not use with real funds.

# EduVerify: Decentralized Academic Credential Registry (Prototype)

**Course:** Introduction to Finance, Astana IT University (2026–2027)
**Team Members:** Duman Zhanybekov, Abil Yelaman
**Supervisor:** Nurkhat Ibadildin, Associate Professor | **Practice Teacher:** Shakenov Daulet
**Demo Video:** [Insert Your Google Drive Link Here]

## Overview

`CredentialRegistry.sol` is an EVM-compatible smart contract designed for Hyperledger Besu (IBFT 2.0) and tested on a local Hardhat network. It stores salted hashes of university diplomas on-chain while keeping all student personally identifiable information (PII) off-chain, in line with Kazakhstan's Law No. 94-V.

## Project Structure

```
eduverify-credential-protocol/
├── contracts/CredentialRegistry.sol
├── scripts/deploy_and_demo.js
├── test/CredentialRegistry.test.js
├── hardhat.config.js
├── package.json
└── README.md
```

## How to Run Locally

Requires Node.js v18 or v20 LTS and Git.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Compile the smart contract:

   ```bash
   npx hardhat compile
   ```

3. Run the 8 automated unit tests:

   ```bash
   npx hardhat test
   ```

4. Run the full deployment + demo script. The quick way uses Hardhat's built-in network:

   ```bash
   npx hardhat run scripts/deploy_and_demo.js
   ```

   Or against a persistent local node (two terminals):

   ```bash
   # Terminal 1
   npx hardhat node

   # Terminal 2
   npx hardhat run scripts/deploy_and_demo.js --network localhost
   ```

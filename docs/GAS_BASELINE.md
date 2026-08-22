# Gas Baseline (P6-11)

Measured 2026-08-23 against `Transactions.sol` (0.8.27, optimizer enabled, 200 runs) on Hardhat's local network. Recorded for future contract-change comparison.

| Operation | Gas used |
|---|---|
| Contract deployment | 1,478,237 |
| Single transfer (`addToBlockchain`) | 229,470 |
| Batch transfer, 3 legs (`addToBlockchainBatch`) | 494,021 total (~164,673 / leg) |
| `setFeePercentage` (owner) | 28,640 |

**Batch vs. single, per leg:** a 3-leg batch costs ~164,673 gas/leg vs. 229,470 for a single transfer — batching saves ~28% per transfer at this size (one transaction's base 21,000 gas overhead amortized across 3 legs, plus shared calldata setup).

Regenerate with `npx hardhat run <a script calling addToBlockchain/addToBlockchainBatch and reading receipt.gasUsed>` against `smart_contract/` after any change to `Transactions.sol`.

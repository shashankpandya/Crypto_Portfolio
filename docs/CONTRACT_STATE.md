# Contract State Record

**Task:** P0-04  
**Date:** 2026-08-02  
**Purpose:** Preserve the on-chain facts that become unrecoverable if the address is lost or misplaced.

> **Warning:** This file records state at a point in time. On-chain state (fee percentage, owner, transaction count) may have changed since. Re-query the chain to confirm current values.

---

## Contract Identity

| Field | Value |
|-------|-------|
| **Contract address** | `0x911F681f9eB8fdfc4D9df9a881E81Ce0E83B7395` |
| **Network** | Sepolia testnet (chain ID 11155111) |
| **Token name** | MyToken |
| **Token symbol** | MTK |
| **Solidity version** | 0.8.27 |
| **License** | MIT |
| **Inherited from** | OpenZeppelin ERC20, Ownable |
| **Deployer** | Address derived from `DEPLOYER_PRIVATE_KEY` in `smart_contract/.env` |

---

## On-chain State (at deploy / last verified)

| Field | Value | Source |
|-------|-------|--------|
| **`owner()`** | Deployer address (same as minter) | Ownable constructor |
| **`feePercentage()`** | `100` (1.00%) | Default in constructor |
| **`feePercentage` max** | `1000` (10%) | `setFeePercentage` require |
| **Initial supply** | Set at deploy time via constructor arg | `deploy.js` |
| **`transactions` count** | Unknown (cannot query without network) | On-chain only |

> Re-query current on-chain state:
> ```javascript
> const contract = new ethers.Contract(address, abi, provider);
> const owner = await contract.owner();
> const fee = await contract.feePercentage();
> const txs = await contract.getAllTransactions();
> console.log({ owner, fee: fee.toString(), txCount: txs.length });
> ```

---

## ABI Location

The ABI exists in **three places** — all must be kept in sync when the contract changes:

| Location | Role |
|----------|------|
| `smart_contract/artifacts/contracts/Transactions.sol/Transactions.json` | Hardhat compilation output (source of truth) |
| `vite-project/src/utils/Transactions.json` | Frontend copy |
| `server/src/services/blockchainService.js` (hand-written inline) | Server event listener |

**Contract change → new deploy → update all three ABI copies + `VITE_CONTRACT_ADDRESS` + `smart_contract/.env` `CONTRACT_ADDRESS`.**

---

## Environment Variable Map

| Variable | File | Used by |
|----------|------|---------|
| `VITE_CONTRACT_ADDRESS` | root `.env` | Frontend (via `import.meta.env`) |
| `CONTRACT_ADDRESS` | `server/.env` | Server blockchain service |
| `ALCHEMY_URL` (https) | `server/.env` | Server WebSocket listener |
| `ALCHEMY_URL` (https/wss) | `smart_contract/.env` | Hardhat deploy script |
| `DEPLOYER_PRIVATE_KEY` | `smart_contract/.env` | Hardhat deploy script |

---

## Hardhat Config Correction

`smart_contract/hardhat.config.js` line 3 loads **root `.env`**:

```js
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
```

The comment on line 5 says *"All secrets are loaded from smart_contract/.env"* — this is **wrong**. Root `.env` does not contain `ALCHEMY_URL` or `DEPLOYER_PRIVATE_KEY`. As a result:

- `hardhat compile` works (no network needed).
- `hardhat test` on the local `hardhat` network works.
- `hardhat run scripts/deploy.js --network sepolia` **fails** with empty URL.

To deploy, temporarily copy `ALCHEMY_URL` and `DEPLOYER_PRIVATE_KEY` into root `.env`, or fix hardhat.config.js to load `smart_contract/.env` instead. **Neither option is in `.gitignore`-safe form yet.**

> Tracked as P1-XX: fix dotenv path in hardhat.config.js (or add explicit load of `smart_contract/.env`).

---

## Immutability Note

Solidity contracts are immutable once deployed. If a bug is found:

1. Fix the contract.
2. Deploy a new instance.
3. Update `VITE_CONTRACT_ADDRESS` (root `.env`).
4. Update `CONTRACT_ADDRESS` (`server/.env`).
5. Copy new ABI from `artifacts/` to `vite-project/src/utils/Transactions.json`.
6. Update hand-written ABI in `blockchainService.js`.
7. The old contract remains at the old address — users must be migrated.

---

## Deploy Script Reference

`smart_contract/scripts/deploy.js` — see file for deploy parameters. The initial supply is passed as a constructor argument; review the script before a new deploy to confirm the supply amount.

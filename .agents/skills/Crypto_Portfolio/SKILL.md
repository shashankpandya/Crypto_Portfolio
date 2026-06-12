```markdown
# Crypto_Portfolio Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you the core development patterns and workflows used in the `Crypto_Portfolio` JavaScript codebase. You'll learn how to add new backend resources, extend smart contracts, manage dependencies and environment variables, and follow the project's coding conventions. This guide also covers the typical testing approach and provides handy commands for common tasks.

## Coding Conventions

- **File Naming:**  
  Use PascalCase for file names.  
  _Example:_  
  ```
  UserController.js
  CryptoPortfolioModel.js
  ```

- **Import Style:**  
  Use relative imports.  
  _Example:_  
  ```js
  import { getUser } from '../services/UserService.js';
  ```

- **Export Style:**  
  Use named exports.  
  _Example:_  
  ```js
  // In UserService.js
  export function getUser(id) { ... }
  export function createUser(data) { ... }
  ```

- **Commit Messages:**  
  - Use prefixes: `feat`, `fix`, `refactor`
  - Keep messages concise (average ~72 characters)
  - _Example:_  
    ```
    feat: add endpoint for retrieving user portfolio
    fix: correct asset calculation in PortfolioService
    refactor: move crypto API logic to separate service
    ```

## Workflows

### Add New Model and Related Controller/Route
**Trigger:** When you want to add a new resource/entity to the backend API  
**Command:** `/new-resource-backend`

1. **Create or update a model** in `server/src/models/`
   - _Example:_ `server/src/models/Asset.js`
2. **Create or update a controller** in `server/src/controllers/`
   - _Example:_ `server/src/controllers/AssetController.js`
3. **Create or update a route file** in `server/src/routes/`
   - _Example:_ `server/src/routes/asset.js`

_Example structure:_
```
server/src/models/Asset.js
server/src/controllers/AssetController.js
server/src/routes/asset.js
```

### Service Layer Feature Addition
**Trigger:** When you want to add new backend business logic or integrate with external APIs  
**Command:** `/add-service`

1. **Create or update a service file** in `server/src/services/`
   - _Example:_ `server/src/services/PortfolioService.js`
2. **Optionally update related controllers** to use the new service
   - _Example:_ In `AssetController.js`, import and use the new service

_Example:_
```js
// server/src/services/PortfolioService.js
export function calculatePortfolioValue(portfolio) { ... }
```

### Package Update or Fix
**Trigger:** When you need to update, add, or fix npm dependencies  
**Command:** `/update-deps`

1. **Edit `package.json`** as needed
2. **Update `package-lock.json`** (run `npm install` or update manually)
3. **Repeat for subprojects** as needed:
   - `server/package.json`
   - `smart_contract/package.json`
   - `vite-project/package.json`

_Example:_
```
npm install lodash
```

### Env and Config Management
**Trigger:** When you need to add, update, or fix environment variables or deployment configuration  
**Command:** `/update-env`

1. **Edit or add** `.env.example` or `.env.production` as appropriate
2. **Update config files** to use environment variables
   - _Examples:_
     - `server/src/config/db.js`
     - `smart_contract/hardhat.config.js`

_Example:_
```js
// server/src/config/db.js
const dbUrl = process.env.DB_URL;
```

### Smart Contract Feature Extension
**Trigger:** When you want to add or enhance a smart contract feature  
**Command:** `/extend-contract`

1. **Edit or add contract** in `smart_contract/contracts/`
   - _Example:_ `smart_contract/contracts/Portfolio.sol`
2. **Update deployment scripts and config**
   - `smart_contract/hardhat.config.js`
   - `smart_contract/scripts/deploy.js`
3. **Add or update test files** in `smart_contract/test/`
   - _Example:_ `smart_contract/test/Portfolio.test.js`

_Example:_
```solidity
// smart_contract/contracts/Portfolio.sol
contract Portfolio { ... }
```

## Testing Patterns

- **Test File Pattern:**  
  Test files are named with the pattern `*.test.*`  
  _Example:_ `PortfolioService.test.js`
- **Testing Framework:**  
  Not explicitly detected; check project files for details.
- **Location:**  
  - Backend: likely in `server/src/`
  - Smart contracts: `smart_contract/test/`
- **Example Test File:**
  ```js
  // PortfolioService.test.js
  import { calculatePortfolioValue } from '../services/PortfolioService.js';

  test('calculates total value', () => {
    // ...test logic...
  });
  ```

## Commands

| Command               | Purpose                                                      |
|-----------------------|--------------------------------------------------------------|
| /new-resource-backend | Add a new backend model, controller, and route               |
| /add-service          | Add a new backend service for business logic                 |
| /update-deps          | Update or fix npm dependencies in all relevant subprojects   |
| /update-env           | Add or update environment variables and related config files |
| /extend-contract      | Add or enhance a smart contract and update tests/scripts     |
```

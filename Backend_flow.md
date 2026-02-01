"#codebase Now focus only on the backend part of the project.
I want a clear, end-to-end backend guide, starting from scratch and going up to a fully working backend, explained in a step-by-step manner.
What to Cover (Backend Only)
Explain the backend with:
Overall backend role in this project and why it is needed
Backend architecture design and how it connects with:
Smart contracts
Frontend
Step-by-step backend implementation flow:
Initial setup and project structure
Backend responsibilities and logic separation
API design and how frontend will consume it
Blockchain interaction handling from backend
Data storage approach
Database Preference
I prefer MongoDB, but if another database fits the project better, explain why and then proceed with the best choice
Explain how data is modeled and stored (conceptually, not overly detailed)
Explanation Style Requirements
Keep explanations short, precise, and meaningful
Cover all important concepts, but do not over-explain
Explain what, why, and how — not just steps
Include how everything is linked together end-to-end
⚠️ Do not explicitly specify implementation details I did not ask for
(e.g., do not name specific auth mechanisms unless necessary — just explain conceptually)
Output Format
Deliver the backend explanation as one complete PDF
It should read like a practical backend guide + conceptual documentation
Suitable for someone who wants to build, understand, and extend the backend", 18 results

# CRYPTO PORTFOLIO - COMPLETE BACKEND GUIDE

---

## **1. BACKEND ROLE & NECESSITY**

---

### **1.1 Why Backend is Needed**

Your current project operates with a **direct frontend-to-blockchain** architecture:

```
┌─────────┐      ┌──────────┐      ┌────────────┐
│ React   │ ───► │ MetaMask │ ───► │ Blockchain │
│ Frontend│      │ (Signer) │      │ (Sepolia)  │
└─────────┘      └──────────┘      └────────────┘
```

**Current Limitations:**

| Problem | Impact |
|---------|--------|
| No user profiles | Can't store preferences, history across devices |
| No transaction caching | Repeated blockchain calls = slow + rate limits |
| No notifications | Users must manually check for updates |
| No analytics | Can't track usage patterns |
| API keys in frontend | Security risk (visible in browser) |
| No rate limiting | Vulnerable to abuse |

**With Backend:**

```
┌─────────┐      ┌─────────┐      ┌──────────┐      ┌────────────┐
│ React   │ ───► │ Backend │ ───► │ MetaMask │ ───► │ Blockchain │
│ Frontend│      │ (Node)  │      │ (Signer) │      │ (Sepolia)  │
└─────────┘      └─────────┘      └──────────┘      └────────────┘
                      │
                      ▼
                ┌──────────┐
                │ MongoDB  │
                └──────────┘
```

---

### **1.2 Backend Responsibilities**

| Responsibility | Description |
|----------------|-------------|
| **User Management** | Store user profiles linked to wallet addresses |
| **Transaction Cache** | Cache blockchain data to reduce RPC calls |
| **Event Indexing** | Listen to contract events, store in DB |
| **API Gateway** | Secure proxy for CoinGecko, hide API keys |
| **Watchlist Sync** | Persist watchlist across devices |
| **Notifications** | Alert users on transaction confirmations |
| **Rate Limiting** | Prevent abuse, manage request quotas |

---

## **2. ARCHITECTURE DESIGN**

---

### **2.1 High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  React Frontend (vite-project)                                          │
│  - Components call backend API instead of blockchain directly           │
│  - MetaMask still signs transactions (client-side)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Node.js + Express                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Routes    │  │ Controllers │  │  Services   │  │   Models    │    │
│  │  /api/...   │─►│  handlers   │─►│   logic     │─►│  MongoDB    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                           │                              │
│                                           ▼                              │
│                         ┌─────────────────────────────┐                 │
│                         │   Blockchain Service        │                 │
│                         │   - ethers.js provider      │                 │
│                         │   - Event listeners         │                 │
│                         │   - Contract interactions   │                 │
│                         └─────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │  MongoDB  │   │  Sepolia  │   │ CoinGecko │
            │ (Storage) │   │(Blockchain)│  │   (API)   │
            └───────────┘   └───────────┘   └───────────┘
```

---

### **2.2 Connection Points**

**Backend ↔ Smart Contract:**
- Backend uses ethers.js with a **read-only provider** (Alchemy RPC)
- Listens to `TransactionAdded` events from your contract
- Caches transaction history in MongoDB
- Does NOT sign transactions (that stays client-side with MetaMask)

**Backend ↔ Frontend:**
- REST API endpoints consumed by React
- Frontend sends wallet address for user identification
- Backend returns cached data, reducing blockchain calls

**Backend ↔ MongoDB:**
- Stores: Users, Transactions, Watchlists, Price Cache
- Indexed for fast queries by wallet address

---

## **3. DATABASE CHOICE: MongoDB**

---

### **3.1 Why MongoDB Fits This Project**

| Factor | MongoDB Advantage |
|--------|-------------------|
| **Schema Flexibility** | Blockchain data varies; MongoDB handles dynamic structures |
| **Document Model** | Transaction objects map naturally to documents |
| **Scalability** | Horizontal scaling for growing user base |
| **JSON Native** | API responses require minimal transformation |
| **Indexing** | Efficient queries by wallet address, timestamp |

**Alternative Considered:** PostgreSQL would work for strict relational needs, but your data (transactions, watchlists) is document-oriented with varying fields.

---

### **3.2 Data Models (Conceptual)**

**User Model:**
```
User {
  walletAddress: string (unique, indexed)
  createdAt: timestamp
  lastActive: timestamp
  settings: {
    notifications: boolean
    theme: string
  }
}
```

**Transaction Model:**
```
Transaction {
  txHash: string (unique)
  from: string (indexed)
  to: string (indexed)
  amount: string
  message: string
  timestamp: timestamp
  blockNumber: number
  status: enum [pending, confirmed, failed]
}
```

**Watchlist Model:**
```
Watchlist {
  walletAddress: string (indexed)
  coins: [
    { coinId: string, addedAt: timestamp }
  ]
}
```

**PriceCache Model:**
```
PriceCache {
  coinId: string (indexed)
  price: number
  marketCap: number
  volume24h: number
  updatedAt: timestamp (TTL index for auto-expiry)
}
```

---

## **4. PROJECT STRUCTURE**

---

### **4.1 Directory Layout**

```
cryptoportfolio/
├── smart_contract/          # Existing - unchanged
├── vite-project/            # Existing - modified to call backend
└── backend/                 # NEW
    ├── src/
    │   ├── config/          # Environment, database config
    │   │   ├── db.js
    │   │   └── index.js
    │   ├── models/          # MongoDB schemas
    │   │   ├── User.js
    │   │   ├── Transaction.js
    │   │   ├── Watchlist.js
    │   │   └── PriceCache.js
    │   ├── routes/          # API route definitions
    │   │   ├── users.js
    │   │   ├── transactions.js
    │   │   ├── watchlist.js
    │   │   └── market.js
    │   ├── controllers/     # Request handlers
    │   │   ├── userController.js
    │   │   ├── transactionController.js
    │   │   ├── watchlistController.js
    │   │   └── marketController.js
    │   ├── services/        # Business logic
    │   │   ├── blockchainService.js
    │   │   ├── cacheService.js
    │   │   └── marketService.js
    │   ├── middleware/      # Auth, validation, rate limiting
    │   │   ├── auth.js
    │   │   ├── validate.js
    │   │   └── rateLimiter.js
    │   ├── utils/           # Helpers
    │   │   └── helpers.js
    │   └── app.js           # Express app setup
    ├── .env                 # Environment variables
    ├── package.json
    └── server.js            # Entry point
```

---

### **4.2 Logic Separation**

| Layer | Purpose | Example |
|-------|---------|---------|
| **Routes** | Define endpoints, apply middleware | `router.get('/transactions/:address', controller.getTransactions)` |
| **Controllers** | Handle request/response | Parse params, call service, send response |
| **Services** | Business logic | Query DB, call blockchain, transform data |
| **Models** | Data structure | MongoDB schema definitions |
| **Middleware** | Cross-cutting concerns | Auth verification, rate limiting |

---

## **5. STEP-BY-STEP IMPLEMENTATION FLOW**

---

### **Step 1: Initialize Backend Project**

```bash
mkdir backend && cd backend
npm init -y
npm install express mongoose ethers dotenv cors helmet express-rate-limit
npm install -D nodemon
```

**Purpose of each package:**
- `express`: Web framework
- `mongoose`: MongoDB ODM
- `ethers`: Blockchain interaction
- `dotenv`: Environment variables
- `cors`: Cross-origin requests
- `helmet`: Security headers
- `express-rate-limit`: Rate limiting

---

### **Step 2: Environment Configuration**

```
# backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cryptoportfolio
ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CONTRACT_ADDRESS=0x22664A9539c165f2A462Dc0eBE78b85063613A12
COINGECKO_API_KEY=CG-Vg854mvNNJR3N8KfKxKZ68N8
NODE_ENV=development
```

**Why:** Keeps secrets out of code, allows different configs per environment.

---

### **Step 3: Database Connection**

````javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
````

---

### **Step 4: Define Models**

````javascript
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  txHash: { type: String, unique: true, required: true },
  from: { type: String, required: true, index: true },
  to: { type: String, required: true, index: true },
  amount: { type: String, required: true },
  message: { type: String, default: '' },
  timestamp: { type: Date, required: true },
  blockNumber: { type: Number },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'confirmed' }
}, { timestamps: true });

// Compound index for efficient queries
transactionSchema.index({ from: 1, timestamp: -1 });
transactionSchema.index({ to: 1, timestamp: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
````

````javascript
const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true, lowercase: true },
  coins: [{
    coinId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
````

---

### **Step 5: Blockchain Service**

````javascript
const { ethers } = require('ethers');
const Transaction = require('../models/Transaction');

// Contract ABI (only events and view functions needed)
const CONTRACT_ABI = [
  "event TransactionAdded(address from, address receiver, uint256 amount, string message, uint256 timestamp)",
  "function getAllTransactions() view returns (tuple(address sender, address receiver, uint256 amount, string message, uint256 timestamp)[])",
  "function getTransactionCount() view returns (uint256)"
];

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      this.provider
    );
  }

  // Start listening to contract events
  startEventListener() {
    this.contract.on('TransactionAdded', async (from, receiver, amount, message, timestamp, event) => {
      try {
        const tx = new Transaction({
          txHash: event.log.transactionHash,
          from: from.toLowerCase(),
          to: receiver.toLowerCase(),
          amount: ethers.formatEther(amount),
          message: message,
          timestamp: new Date(Number(timestamp) * 1000),
          blockNumber: event.log.blockNumber,
          status: 'confirmed'
        });
        await tx.save();
        console.log('Transaction indexed:', event.log.transactionHash);
      } catch (error) {
        if (error.code !== 11000) { // Ignore duplicate key errors
          console.error('Error indexing transaction:', error);
        }
      }
    });
    console.log('Blockchain event listener started');
  }

  // Fetch historical transactions and sync to DB
  async syncHistoricalTransactions() {
    try {
      const transactions = await this.contract.getAllTransactions();
      for (const tx of transactions) {
        await Transaction.findOneAndUpdate(
          { from: tx.sender.toLowerCase(), timestamp: new Date(Number(tx.timestamp) * 1000) },
          {
            from: tx.sender.toLowerCase(),
            to: tx.receiver.toLowerCase(),
            amount: ethers.formatEther(tx.amount),
            message: tx.message,
            timestamp: new Date(Number(tx.timestamp) * 1000),
            status: 'confirmed'
          },
          { upsert: true, new: true }
        );
      }
      console.log('Historical transactions synced');
    } catch (error) {
      console.error('Error syncing transactions:', error);
    }
  }

  // Get transaction count from contract
  async getTransactionCount() {
    return await this.contract.getTransactionCount();
  }
}

module.exports = new BlockchainService();
````

**Key Points:**
- Uses **read-only provider** (no private key on backend)
- **Event listener** indexes new transactions in real-time
- **Historical sync** catches up on past transactions at startup
- Transactions signing stays on frontend (MetaMask)

---

### **Step 6: API Routes & Controllers**

````javascript
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

router.get('/:address', transactionController.getByAddress);
router.get('/:address/count', transactionController.getCount);

module.exports = router;
````

````javascript
const Transaction = require('../models/Transaction');

exports.getByAddress = async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { page = 1, limit = 20 } = req.query;
    
    const transactions = await Transaction.find({
      $or: [{ from: address }, { to: address }]
    })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Transaction.countDocuments({
      $or: [{ from: address }, { to: address }]
    });
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCount = async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const count = await Transaction.countDocuments({
      $or: [{ from: address }, { to: address }]
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
````

---

### **Step 7: Watchlist API**

````javascript
const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');

router.get('/:address', watchlistController.get);
router.post('/:address/add', watchlistController.addCoin);
router.delete('/:address/remove/:coinId', watchlistController.removeCoin);

module.exports = router;
````

````javascript
const Watchlist = require('../models/Watchlist');

exports.get = async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    let watchlist = await Watchlist.findOne({ walletAddress: address });
    
    if (!watchlist) {
      watchlist = { walletAddress: address, coins: [] };
    }
    
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addCoin = async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { coinId } = req.body;
    
    const watchlist = await Watchlist.findOneAndUpdate(
      { walletAddress: address },
      { $addToSet: { coins: { coinId } } },
      { upsert: true, new: true }
    );
    
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeCoin = async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { coinId } = req.params;
    
    const watchlist = await Watchlist.findOneAndUpdate(
      { walletAddress: address },
      { $pull: { coins: { coinId } } },
      { new: true }
    );
    
    res.json(watchlist || { walletAddress: address, coins: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
````

---

### **Step 8: Market Data Proxy (CoinGecko)**

````javascript
const PriceCache = require('../models/PriceCache');

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const CACHE_TTL = 60 * 1000; // 1 minute

class MarketService {
  async getCoins(limit = 100) {
    // Check cache first
    const cached = await PriceCache.find({
      updatedAt: { $gte: new Date(Date.now() - CACHE_TTL) }
    }).limit(limit);
    
    if (cached.length >= limit) {
      return cached;
    }
    
    // Fetch fresh data
    const response = await fetch(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&sparkline=true`,
      {
        headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
      }
    );
    
    const coins = await response.json();
    
    // Update cache
    for (const coin of coins) {
      await PriceCache.findOneAndUpdate(
        { coinId: coin.id },
        {
          coinId: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          price: coin.current_price,
          marketCap: coin.market_cap,
          volume24h: coin.total_volume,
          priceChange24h: coin.price_change_percentage_24h,
          image: coin.image,
          sparkline: coin.sparkline_in_7d?.price,
          updatedAt: new Date()
        },
        { upsert: true }
      );
    }
    
    return coins;
  }
}

module.exports = new MarketService();
````

**Why Proxy:**
- Hides API key from frontend
- Enables caching to reduce API calls
- Adds rate limiting protection

---

### **Step 9: Express App Setup**

````javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const transactionRoutes = require('./routes/transactions');
const watchlistRoutes = require('./routes/watchlist');
const marketRoutes = require('./routes/market');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json());

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/market', marketRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;
````

---

### **Step 10: Server Entry Point**

````javascript
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const blockchainService = require('./src/services/blockchainService');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Sync historical transactions
    await blockchainService.syncHistoricalTransactions();
    
    // Start event listener for new transactions
    blockchainService.startEventListener();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
````

---

## **6. API DESIGN**

---

### **6.1 Endpoint Reference**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transactions/:address` | Get transactions for wallet |
| `GET` | `/api/transactions/:address/count` | Get transaction count |
| `GET` | `/api/watchlist/:address` | Get user's watchlist |
| `POST` | `/api/watchlist/:address/add` | Add coin to watchlist |
| `DELETE` | `/api/watchlist/:address/remove/:coinId` | Remove coin |
| `GET` | `/api/market/coins` | Get market data (cached) |
| `GET` | `/api/market/coin/:id` | Get single coin details |
| `GET` | `/health` | Health check |

---

### **6.2 Frontend Integration Example**

**Before (Direct blockchain call):**
```javascript
// TransactionContext.jsx
const getAllTransactions = async () => {
  const contract = await getEthereumContract();
  const transactions = await contract.getAllTransactions();
  // ... process
};
```

**After (Via backend):**
```javascript
// api/backend.js
const API_URL = 'http://localhost:5000/api';

export const getTransactions = async (address) => {
  const response = await fetch(`${API_URL}/transactions/${address}`);
  return response.json();
};

// TransactionContext.jsx
import { getTransactions } from '../api/backend';

const getAllTransactions = async () => {
  if (!currentAccount) return;
  const data = await getTransactions(currentAccount);
  setTransactions(data.transactions);
};
```

---

## **7. DATA FLOW SUMMARY**

---

### **7.1 Transaction Creation Flow**

```
1. User fills form in TokenTransfer component
2. Frontend calls contract.addToBlockchain() via MetaMask
3. MetaMask signs and broadcasts transaction
4. Transaction mined on Sepolia
5. Contract emits TransactionAdded event
6. Backend event listener catches event
7. Backend saves to MongoDB
8. Frontend queries backend for updated list
9. UI displays new transaction
```

### **7.2 Market Data Flow**

```
1. Frontend requests /api/market/coins
2. Backend checks MongoDB cache
3. If cache valid (< 1 min), return cached data
4. If cache expired, fetch from CoinGecko
5. Update MongoDB cache
6. Return data to frontend
7. Frontend renders coin list
```

### **7.3 Watchlist Flow**

```
1. User clicks "Add to Watchlist" on coin
2. Frontend POSTs to /api/watchlist/:address/add
3. Backend upserts to MongoDB
4. User visits Watchlist page
5. Frontend GETs /api/watchlist/:address
6. Backend returns saved coins
7. Frontend fetches prices from /api/market
8. UI displays personalized watchlist
```

---

## **8. RUNNING THE BACKEND**

---

### **8.1 Development**

```bash
cd backend

# Start MongoDB (if local)
mongod

# Start backend with hot reload
npm run dev
```

**package.json scripts:**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### **8.2 Production Considerations**

| Aspect | Recommendation |
|--------|----------------|
| **Process Manager** | Use PM2 for clustering and auto-restart |
| **Database** | MongoDB Atlas for managed hosting |
| **Hosting** | Railway, Render, or AWS EC2 |
| **Monitoring** | Add logging (Winston), APM (New Relic) |
| **SSL** | Use HTTPS in production |

---

## **9. END-TO-END CONNECTION MAP**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE SYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    FRONTEND (vite-project)              BACKEND (backend/)
    ═══════════════════════              ══════════════════
    
    ┌─────────────────┐                  ┌─────────────────┐
    │  React App      │                  │  Express Server │
    │  (localhost:5173)│                  │  (localhost:5000)│
    └────────┬────────┘                  └────────┬────────┘
             │                                     │
             │ HTTP Requests                       │
             │ GET /api/transactions/:addr         │
             │ GET /api/watchlist/:addr            │
             │ GET /api/market/coins               │
             ├────────────────────────────────────►│
             │                                     │
             │◄────────────────────────────────────┤
             │ JSON Responses                      │
             │                                     │
    ┌────────┴────────┐                  ┌────────┴────────┐
    │  TransactionContext│                │  MongoDB        │
    │  (State Management)│                │  (Data Storage) │
    └────────┬────────┘                  └─────────────────┘
             │                                     
             │ Contract Calls (Write)              
             │ via MetaMask                        
             ▼                                     
    ┌─────────────────┐                  ┌─────────────────┐
    │  MetaMask       │                  │  Event Listener │
    │  (Transaction   │                  │  (Read-only)    │
    │   Signing)      │                  │                 │
    └────────┬────────┘                  └────────┬────────┘
             │                                     │
             │                                     │
             ▼                                     ▼
    ┌───────────────────────────────────────────────────────┐
    │                    SEPOLIA TESTNET                     │
    │  ┌─────────────────────────────────────────────────┐  │
    │  │  Transactions Contract                          │  │
    │  │  0x22664A9539c165f2A462Dc0eBE78b85063613A12    │  │
    │  │                                                 │  │
    │  │  - addToBlockchain() ◄── Frontend (write)      │  │
    │  │  - TransactionAdded  ──► Backend (listen)      │  │
    │  └─────────────────────────────────────────────────┘  │
    └───────────────────────────────────────────────────────┘
```

---

## **10. SUMMARY**

| Component | Technology | Role |
|-----------|------------|------|
| **API Server** | Express.js | Handle HTTP requests, route to services |
| **Database** | MongoDB | Store users, transactions, watchlists, cache |
| **Blockchain Listener** | ethers.js | Index contract events in real-time |
| **Market Proxy** | Node.js fetch | Cache CoinGecko data, hide API key |
| **Rate Limiter** | express-rate-limit | Prevent abuse |

**Key Principle:** Backend handles **data persistence and caching**. Transaction signing remains on **frontend with MetaMask** for security (private keys never touch server).

---

*Document Version: 1.0*
*Backend Architecture Guide*
*Crypto Portfolio Project*
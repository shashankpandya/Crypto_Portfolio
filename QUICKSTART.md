# Quick Reference - Local Development

## 🚀 Start Development (5 seconds)

```bash
# Option 1: Both backend + frontend
npm start

# Option 2: Backend only
npm run server

# Option 3: Frontend only
npm run client

# Option 4: Using scripts
./start-local.sh          # Linux/Mac
start-local.bat          # Windows
```

## 📍 URLs

| Service      | URL                          | Port |
| ------------ | ---------------------------- | ---- |
| Backend      | http://localhost:3000        | 3000 |
| Frontend     | http://localhost:5173        | 5173 |
| Health Check | http://localhost:3000/health | 3000 |

## 🧪 Test API

```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"2024-05-22T..."}
```

## 📦 Build & Deploy

```bash
# Build frontend
npm run build

# Full build
npm run build:all

# Deploy to AWS Lambda
npm run deploy
```

## 🔧 Troubleshooting

### Port in use?

```bash
# Use different port
PORT=3001 npm run server
```

### Dependencies not working?

```bash
npm install --legacy-peer-deps
cd server && npm install --legacy-peer-deps
cd ../vite-project && npm install --legacy-peer-deps
```

### Node version issue?

```bash
node --version          # Should be >=20.x
npm --version           # Should be >=9.x
```

### Serverless offline auth error?

```bash
# ❌ Don't use this (requires free auth account)
serverless offline start

# ✅ Use this instead (no auth needed)
npm start
```

## 📚 Documentation

- [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) - Full local setup guide
- [LAMBDA_DEPLOYMENT.md](LAMBDA_DEPLOYMENT.md) - AWS Lambda deployment
- [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) - Complete setup overview
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues & fixes

## 🎯 Quick Workflow

1. **Development**

   ```bash
   npm start
   ```

   Edit code → Auto refresh → Test

2. **Build**

   ```bash
   npm run build:all
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

Done! 🎉

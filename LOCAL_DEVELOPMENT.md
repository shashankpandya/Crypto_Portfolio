# Local Development Setup

## ⚠️ Important: Serverless Framework V4 Authentication

**Serverless Framework V4 requires free authentication** for offline mode. To avoid the license prompt, **use `npm start` instead** (recommended).

### Why Use `npm start`?
- ✅ No authentication required
- ✅ Same local development experience
- ✅ Faster to start
- ✅ No license restrictions
- ✅ Works exactly like the deployed Lambda function

## Quick Start

### Option 1: Using Start Script (Recommended)

**Linux/Mac:**
```bash
chmod +x start-local.sh
./start-local.sh
```

**Windows:**
```cmd
start-local.bat
```

This will:
- ✓ Install all dependencies
- ✓ Start backend on `http://localhost:3000`
- ✓ Start frontend on `http://localhost:5173`

### Option 2: Manual Setup

**Terminal 1 - Start Backend:**
```bash
npm run server
```

**Terminal 2 - Start Frontend:**
```bash
npm run client
```

### Option 3: Run Both Together
```bash
npm start
```

## Available Commands

```bash
# Start both backend and frontend
npm start

# Start only backend
npm run server

# Start only frontend  
npm run client

# Build frontend for production
npm run build

# Full build with all dependencies
npm run build:all

# Run linter on frontend
npm run lint

# Local Lambda testing (serverless offline)
npm run deploy:local
# Or directly:
serverless offline start --httpPort 3001
```

## Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-05-22T..."}
```

### Making API Requests
```bash
# Example API call
curl http://localhost:3000/api/data
```

## Frontend Development

The frontend is served at `http://localhost:5173` with:
- Hot module reloading (HMR)
- Fast refresh on code changes
- Vite dev server

## Troubleshooting

### Port Already in Use

**Backend (3000):**
```bash
npm run server -- --port 3001
# Or change PORT environment variable
PORT=3001 npm run server
```

**Frontend (5173):**
```bash
cd vite-project
npm run dev -- --port 5174
```

### Dependency Issues

```bash
# Clean install all dependencies
rm -rf node_modules server/node_modules vite-project/node_modules
npm install --legacy-peer-deps
cd server && npm install --legacy-peer-deps
cd ../vite-project && npm install --legacy-peer-deps
cd ..
```

### Node Version Issues

If you see warnings about Node version:
```bash
# Show current Node version
node --version

# Show current npm version
npm --version
```

Supported versions:
- Node.js: >=20.x (tested with 20.18.0, 22.x)
- npm: >=9.x

## Environment Variables

Create a `.env` file in the root directory:

```env
# Backend
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
API_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## File Structure

```
server/
├── app.js           # Express app logic
├── handler.js       # Lambda handler
├── index.js         # Entry point
└── package.json

vite-project/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── components/
├── public/
└── package.json
```

## Performance Tips

1. **Frontend Build**: Runs Vite dev server (very fast)
2. **Backend**: Direct Node.js execution (instant restart)
3. **HMR**: Frontend updates in milliseconds
4. **Fast Refresh**: React components update without page reload

## Debugging

### Backend Logs
All console.log statements from the Express server appear in Terminal 1

### Frontend Logs
All console.log statements from React appear in:
- Browser console (F12)
- Terminal 2 (if running vite dev server)

### Network Requests
Use browser DevTools (F12) → Network tab to inspect API calls

## Next Steps

After local testing:
1. Build for production: `npm run build`
2. Deploy to Lambda: `npm run deploy`
3. Or use GitHub Actions for automatic deployment

## Getting Help

- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)

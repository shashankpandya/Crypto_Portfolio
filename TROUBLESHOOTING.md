# Troubleshooting Serverless Deployment

## Common Issues and Solutions

### 1. "No version found for 3" Error

**Problem:** Serverless offline fails with "No version found for 3"

**Cause:** `serverless.yml` specifies framework version 3, but version 4 is installed

**Solution:**

```bash
# Update serverless.yml
# Change: frameworkVersion: "3"
# To: frameworkVersion: "4"

# Update http events to httpApi
# Change: - http:
# To: - httpApi:
```

✅ **Status:** Already fixed in this project

---

### 2. Node Version Warning

**Problem:**

```
Warning: The AWS SDK for JavaScript (v3) versions published after
the first week of January 2027 will require node >=22
```

**Cause:** Using Node.js 20.x (AWS SDK requires 22.x after Jan 2027)

**Solution:**

```bash
# Option 1: Update Node.js to 22.x
nvm install 22
nvm use 22

# Option 2: Use Node 20.x (currently still supported)
node --version  # Should show v20.x or higher

# Option 3: Check package.json engines
npm install  # Will show warnings but still work
```

---

### 3. Port Already in Use

**Problem:**

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**

```bash
# Kill the process using the port
# Linux/Mac:
lsof -ti:3001 | xargs kill -9

# Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process

# Or use a different port:
serverless offline start --httpPort 3002
```

---

### 4. Missing Dependencies

**Problem:**

```
Cannot find module 'serverless-http'
```

**Solution:**

```bash
# Install dependencies
npm install --save-dev serverless-offline
npm install serverless-http

# Or reinstall all:
npm install --legacy-peer-deps
cd server && npm install --legacy-peer-deps
```

---

### 5. Handler Not Found

**Problem:**

```
Error: Cannot find handler server/handler.handler
```

**Solution:**

```bash
# Verify files exist:
ls -la server/handler.js
ls -la server/app.js
ls -la server/index.js

# Check handler.js has correct export:
cat server/handler.js
# Should contain: module.exports.handler = serverless(app);
```

---

### 6. CORS Errors

**Problem:**

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
Update `.env` or environment variables:

```env
CORS_ORIGIN=*
```

Or update `serverless.yml`:

```yaml
provider:
  httpApi:
    cors: true
```

---

### 7. Environment Variables Not Loaded

**Problem:**

```
Cannot read property of undefined (environment variable)
```

**Solution:**

```bash
# Create .env file
cp .env.example .env

# Edit .env with your values
cat .env

# Run with env loaded
source .env  # Linux/Mac
# or on Windows: set NODE_ENV=development
npm run deploy:local
```

### 8. Serverless Framework V4 License Prompt

**Problem:**

```
Serverless Framework V4 CLI is free for developers and organizations
making less than $2 million annually, but requires an account or a license key.
```

**Cause:** Serverless Framework V4 requires free authentication for offline mode

**Solution - Option 1 (Recommended):**
Just use `npm start` instead:

```bash
npm start  # No auth required, same functionality
```

**Solution - Option 2:**
Create free Serverless account:

1. Go to https://www.serverless.com
2. Sign up for free account
3. Run: `serverless login`
4. Then: `serverless offline start --httpPort 3001`

**Solution - Option 3:**
Use Serverless V3 (older version without auth requirement):

```bash
npm uninstall serverless-offline
npm install --save-dev serverless@3 serverless-offline@13
# Update serverless.yml: frameworkVersion: "3"
serverless offline start
```

---

Run this to check your setup:

```bash
# 1. Check Node version
node --version          # Should be >=20.x

# 2. Check npm version
npm --version           # Should be >=9.x

# 3. Check Serverless Framework
serverless --version   # Should show v4.36.1 or higher

# 4. Verify files
ls server/handler.js
ls server/app.js
ls serverless.yml

# 5. Check dependencies
npm ls serverless
npm ls serverless-http
npm ls serverless-offline

# 6. Verify configuration
cat serverless.yml | grep frameworkVersion  # Should be "4"
```

---

## Recommended Local Development

Instead of `serverless offline`, use the simpler approach:

```bash
# Option 1: Use start scripts
./start-local.sh          # Linux/Mac
start-local.bat          # Windows

# Option 2: Manual terminals
npm run server           # Terminal 1
npm run client           # Terminal 2

# Option 3: Combined
npm start                # Runs both
```

See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for details.

---

## Testing the Setup

After starting, test with:

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2024-05-22T..."}

# Frontend
open http://localhost:5173  # Mac
start http://localhost:5173 # Windows
xdg-open http://localhost:5173 # Linux
```

---

## Getting Help

1. Check [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for simple setup
2. Check [LAMBDA_DEPLOYMENT.md](LAMBDA_DEPLOYMENT.md) for deployment
3. Check [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) for overview
4. Review GitHub Actions logs if automated deploy fails
5. Check CloudWatch logs if Lambda function fails

---

## Configuration Files

| File                | Purpose              | Status           |
| ------------------- | -------------------- | ---------------- |
| `serverless.yml`    | Lambda config        | ✅ Updated to v4 |
| `.env.example`      | Environment template | ✅ Ready         |
| `.env.production`   | Production config    | ✅ Ready         |
| `package.json`      | Dependencies         | ✅ Updated       |
| `server/handler.js` | Lambda handler       | ✅ Ready         |
| `server/app.js`     | Express app          | ✅ Ready         |

All configurations are correct and ready for deployment! 🚀

# Crypto Portfolio - AWS Lambda Deployment Setup

This project is now configured for deployment on AWS Lambda with the following improvements:

## ✅ Completed Setup

### 1. **Backend Refactoring**

- ✅ Separated app logic into `server/app.js`
- ✅ Created Lambda handler in `server/handler.js` using `serverless-http`
- ✅ Updated `server/index.js` to support both local and Lambda execution
- ✅ Added health check endpoint `/health`
- ✅ Improved error handling middleware
- ✅ Environment-based configuration

### 2. **Dependencies Updated**

- ✅ Added `serverless-http` for Lambda support
- ✅ Updated `server/package.json` with proper engines (Node 18.x)
- ✅ Fixed all import/require statements for compatibility

### 3. **Infrastructure as Code**

- ✅ Created `serverless.yml` configuration
- ✅ Configured API Gateway endpoints
- ✅ Set up proper Lambda memory and timeout
- ✅ Included CORS support

### 4. **CI/CD Pipeline**

- ✅ Created GitHub Actions workflow in `.github/workflows/deploy.yml`
- ✅ Automated build and deployment on push to main
- ✅ Environment validation and health checks
- ✅ Proper error handling

### 5. **Configuration Management**

- ✅ Created `.env.example` with all required variables
- ✅ Created `.env.production` for production settings
- ✅ Updated `.gitignore` for Lambda artifacts
- ✅ Environment-based configuration loading

### 6. **Code Issues Fixed**

- ✅ Fixed duplicate `storedWatchlist` declaration in `Watchlist.jsx`
- ✅ Fixed duplicate `debouncedSearch` declaration
- ✅ Added missing `isSearching` state
- ✅ Removed duplicate JSX elements
- ✅ Fixed undefined function references

## 🚀 Quick Start

### Local Development

```bash
# Install all dependencies
npm install
cd server && npm install
cd ../vite-project && npm install

# Run both frontend and backend
npm start

# Or run separately
npm run server    # Terminal 1
npm run client    # Terminal 2
```

### Local Lambda Testing (Optional - Use npm start Instead)

⚠️ **Note:** Serverless Framework V4 requires free authentication for offline mode. 

**Recommended approach:** Use `npm start` instead (see [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md))

If you want to test with serverless offline:
1. Create free Serverless account at https://www.serverless.com
2. Login to your account (one-time setup)
3. Then run:

```bash
serverless offline start --httpPort 3001
```

Easier option - just use:
```bash
npm start
```

### Deploy to AWS Lambda

```bash
# Build the project
npm run build:all

# Deploy (make sure AWS credentials are configured)
serverless deploy --region us-east-1

# Get API endpoint
serverless info --region us-east-1
```

## 📋 GitHub Actions Setup

To enable automatic deployment via GitHub Actions:

1. **Add AWS Credentials to GitHub Secrets**:
   - Go to your repository → Settings → Secrets
   - Add `AWS_ACCESS_KEY_ID`
   - Add `AWS_SECRET_ACCESS_KEY`

2. **Push to Deploy**:
   - Push to `main` branch to trigger deployment
   - Or push to `deploy` branch

3. **Monitor Deployment**:
   - Check GitHub Actions tab for status
   - View logs for deployment details

## 🔧 Project Structure

```
cryptoportfolio/
├── server/
│   ├── app.js           # Express app (NEW)
│   ├── handler.js       # Lambda handler (NEW)
│   ├── index.js         # Entry point
│   └── package.json
├── vite-project/
│   └── src/components/
│       └── Watchlist.jsx    # Fixed
├── .github/
│   └── workflows/
│       └── deploy.yml    # CI/CD (NEW)
├── serverless.yml        # Lambda config (NEW)
├── .env.example          # Environment template (NEW)
├── .env.production       # Production env (NEW)
├── LAMBDA_DEPLOYMENT.md  # Deployment guide (NEW)
└── package.json          # Updated
```

## 🌍 Environment Variables

**Development** (`.env`):

```
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
```

**Production** (`.env.production`):

```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_MAX=100
```

## 📊 Lambda Configuration

- **Runtime**: Node.js 22.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Region**: us-east-1 (configurable)

## 🔍 Health Check

```bash
curl https://your-api-endpoint/health
# Expected response: {"status":"ok","timestamp":"..."}
```

## 📝 Build Scripts

Added to `package.json`:

- `npm run build` - Build frontend
- `npm run build:all` - Full build with all dependencies
- `npm run deploy` - Deploy to AWS Lambda
- `npm run deploy:local` - Local Lambda testing

## ✅ Pre-Deployment Checklist

- [ ] AWS account configured with credentials
- [ ] GitHub secrets added (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- [ ] `.env` file created with proper values
- [ ] All dependencies installed (`npm install` in root, server, and vite-project)
- [ ] Frontend builds successfully (`cd vite-project && npm run build`)
- [ ] No TypeScript/JSX errors
- [ ] Tests pass (if any)
- [ ] Environment variables in `serverless.yml` are correct

## 🚨 Common Issues & Solutions

### **CORS Errors**

Update `CORS_ORIGIN` in environment variables to match your frontend domain.

### **Timeout Errors**

- Increase `timeout` in `serverless.yml`
- Check API response times

### **Cold Start Delays**

- First invocation may take 5-10 seconds
- Increase memory in `serverless.yml` for faster execution

### **Build Failures**

```bash
# Install with legacy peer deps if needed
npm install --legacy-peer-deps
```

## 📚 Additional Resources

- [Serverless Framework Guide](https://www.serverless.com/framework/docs/getting-started)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Express.js on Lambda](https://aws.amazon.com/blogs/compute/going-serverless-with-express-js-and-aws-lambda/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Support

For deployment issues, check:

1. CloudWatch logs in AWS console
2. GitHub Actions workflow logs
3. Local testing with `serverless offline start`

---

**Ready to deploy? Run `npm run deploy` after configuring AWS credentials!**

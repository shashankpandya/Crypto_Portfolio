@echo off
REM Build script for Lambda deployment (Windows)

echo 🔨 Building Crypto Portfolio for Lambda Deployment...

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install --legacy-peer-deps

REM Build server
echo 🔨 Preparing server...
cd server
call npm install --legacy-peer-deps
cd ..

REM Build client
echo 🔨 Building frontend...
cd vite-project
call npm install --legacy-peer-deps
call npm run build
cd ..

echo ✅ Build completed successfully!
echo.
echo Next steps:
echo 1. Set up AWS credentials: aws configure
echo 2. Deploy: serverless deploy --region us-east-1
echo 3. For local testing: serverless offline start

pause

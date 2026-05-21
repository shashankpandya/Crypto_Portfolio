#!/bin/bash

# Build script for Lambda deployment
set -e

echo "🔨 Building Crypto Portfolio for Lambda Deployment..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install --legacy-peer-deps

# Build server
echo "🔨 Preparing server..."
cd server
npm install --legacy-peer-deps
cd ..

# Build client
echo "🔨 Building frontend..."
cd vite-project
npm install --legacy-peer-deps
npm run build
cd ..

echo "✅ Build completed successfully!"
echo ""
echo "Next steps:"
echo "1. Set up AWS credentials: aws configure"
echo "2. Deploy: serverless deploy --region us-east-1"
echo "3. For local testing: serverless offline start"

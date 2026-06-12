#!/bin/bash

# Pre-deployment validation script

echo "🔍 Validating Crypto Portfolio Lambda Setup..."
echo ""

ERRORS=0

# Check Node.js version
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "  Node.js: $NODE_VERSION"
if [[ $NODE_VERSION != v18* ]]; then
  echo "  ⚠️  Warning: Expected Node.js 18.x, found $NODE_VERSION"
  ERRORS=$((ERRORS+1))
fi

# Check npm version
echo ""
echo "✓ Checking npm version..."
NPM_VERSION=$(npm --version)
echo "  npm: $NPM_VERSION"

# Check if files exist
echo ""
echo "✓ Checking required files..."
FILES=(
  "server/package.json"
  "server/app.js"
  "server/handler.js"
  "serverless.yml"
  ".env.example"
  ".github/workflows/deploy.yml"
  "LAMBDA_DEPLOYMENT.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
    ERRORS=$((ERRORS+1))
  fi
done

# Check dependencies
echo ""
echo "✓ Checking serverless-http in server package.json..."
if grep -q "serverless-http" server/package.json; then
  echo "  ✓ serverless-http found"
else
  echo "  ✗ serverless-http not found (required)"
  ERRORS=$((ERRORS+1))
fi

# Check environment file
echo ""
echo "✓ Checking environment configuration..."
if [ -f ".env" ]; then
  echo "  ✓ .env file exists"
else
  echo "  ⚠️  .env file not found (copy from .env.example)"
fi

if [ -f ".env.production" ]; then
  echo "  ✓ .env.production file exists"
else
  echo "  ⚠️  .env.production file not found"
fi

# Check Watchlist.jsx fixes
echo ""
echo "✓ Checking Watchlist.jsx fixes..."
if grep -q "const \[isSearching" vite-project/src/components/Watchlist.jsx; then
  echo "  ✓ isSearching state declared"
else
  echo "  ✗ isSearching state missing"
  ERRORS=$((ERRORS+1))
fi

if ! grep -q "const storedWatchlist =.*const storedWatchlist =" vite-project/src/components/Watchlist.jsx; then
  echo "  ✓ No duplicate storedWatchlist declarations"
else
  echo "  ✗ Duplicate storedWatchlist found"
  ERRORS=$((ERRORS+1))
fi

# Summary
echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
  echo "✅ All validations passed!"
  echo ""
  echo "Ready to deploy! Run:"
  echo "  npm run build:all"
  echo "  serverless deploy --region us-east-1"
else
  echo "⚠️  $ERRORS issue(s) found"
  echo "Please fix the above issues before deploying"
  exit 1
fi

echo "================================"

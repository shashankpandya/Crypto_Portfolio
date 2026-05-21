#!/bin/bash

# Local development server setup
# This runs the backend and frontend without serverless offline

echo "🚀 Starting Crypto Portfolio in local development mode..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed"
  exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing root dependencies..."
  npm install --legacy-peer-deps
fi

if [ ! -d "server/node_modules" ]; then
  echo "📦 Installing server dependencies..."
  cd server
  npm install --legacy-peer-deps
  cd ..
fi

if [ ! -d "vite-project/node_modules" ]; then
  echo "📦 Installing client dependencies..."
  cd vite-project
  npm install --legacy-peer-deps
  cd ..
fi

echo ""
echo "✓ All dependencies installed"
echo ""
echo "🔧 Starting services..."
echo ""
echo "  Backend: http://localhost:3000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start both services concurrently
npm start

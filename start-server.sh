#!/bin/bash

# Simple Express server for local development (no serverless needed)
# This is an alternative to 'serverless offline start' that doesn't require authentication

echo "🚀 Starting Express server locally (no serverless authentication required)..."
echo ""
echo "Backend server: http://localhost:3000"
echo "Health check: http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd server
PORT=3000 node index.js

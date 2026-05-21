@echo off
REM Local development server setup (Windows)
REM This runs the backend and frontend without serverless offline

echo 🚀 Starting Crypto Portfolio in local development mode...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
  echo ❌ Node.js is not installed
  exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo ✓ Node.js version: %NODE_VER%
echo.

REM Install dependencies if needed
if not exist "node_modules" (
  echo 📦 Installing root dependencies...
  call npm install --legacy-peer-deps
)

if not exist "server\node_modules" (
  echo 📦 Installing server dependencies...
  cd server
  call npm install --legacy-peer-deps
  cd ..
)

if not exist "vite-project\node_modules" (
  echo 📦 Installing client dependencies...
  cd vite-project
  call npm install --legacy-peer-deps
  cd ..
)

echo.
echo ✓ All dependencies installed
echo.
echo 🔧 Starting services...
echo.
echo   Backend: http://localhost:3000
echo   Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop all services
echo.

REM Start both services concurrently
call npm start

pause

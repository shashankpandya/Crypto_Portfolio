@echo off
REM Pre-deployment validation script (Windows)

echo 🔍 Validating Crypto Portfolio Lambda Setup...
echo.

setlocal enabledelayedexpansion
set ERRORS=0

REM Check Node.js version
echo ✓ Checking Node.js version...
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   Node.js: %NODE_VERSION%

REM Check npm version
echo.
echo ✓ Checking npm version...
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo   npm: %NPM_VERSION%

REM Check if files exist
echo.
echo ✓ Checking required files...

if exist "server\package.json" (
  echo   ✓ server\package.json
) else (
  echo   ✗ server\package.json (MISSING)
  set /a ERRORS+=1
)

if exist "server\app.js" (
  echo   ✓ server\app.js
) else (
  echo   ✗ server\app.js (MISSING)
  set /a ERRORS+=1
)

if exist "server\handler.js" (
  echo   ✓ server\handler.js
) else (
  echo   ✗ server\handler.js (MISSING)
  set /a ERRORS+=1
)

if exist "serverless.yml" (
  echo   ✓ serverless.yml
) else (
  echo   ✗ serverless.yml (MISSING)
  set /a ERRORS+=1
)

if exist ".env.example" (
  echo   ✓ .env.example
) else (
  echo   ✗ .env.example (MISSING)
  set /a ERRORS+=1
)

if exist ".github\workflows\deploy.yml" (
  echo   ✓ .github\workflows\deploy.yml
) else (
  echo   ✗ .github\workflows\deploy.yml (MISSING)
  set /a ERRORS+=1
)

REM Check environment files
echo.
echo ✓ Checking environment configuration...

if exist ".env" (
  echo   ✓ .env file exists
) else (
  echo   ⚠️  .env file not found (copy from .env.example^)
)

if exist ".env.production" (
  echo   ✓ .env.production file exists
) else (
  echo   ⚠️  .env.production file not found
)

REM Summary
echo.
echo ================================
if %ERRORS% equ 0 (
  echo ✅ All validations passed!
  echo.
  echo Ready to deploy! Run:
  echo   npm run build:all
  echo   serverless deploy --region us-east-1
) else (
  echo ⚠️  %ERRORS% issue^(s^) found
  echo Please fix the above issues before deploying
  exit /b 1
)

echo ================================

pause

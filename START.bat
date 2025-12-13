@echo off
REM ============================================================
REM Oil Production Prediction App - Simple Windows Launcher
REM Just double-click this file to start the application!
REM ============================================================

title Oil Production App - Starting...

color 0A
echo.
echo ============================================================
echo   Oil Production Prediction App
echo   Simple Windows Launcher
echo ============================================================
echo.

REM Get the directory where this script is located
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

REM ============================================================
REM Step 1: Check for Python
REM ============================================================
echo [Step 1/4] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python is not installed or not in PATH!
    echo.
    echo Please install Python 3.11 or newer:
    echo   1. Go to: https://www.python.org/downloads/
    echo   2. Download and install Python 3.11+
    echo   3. IMPORTANT: Check "Add Python to PATH" during installation
    echo   4. Restart this script after installation
    echo.
    echo Press any key to open Python download page...
    pause >nul
    start https://www.python.org/downloads/
    exit /b 1
)
python --version
echo [OK] Python found!
echo.

REM ============================================================
REM Step 2: Check for Node.js
REM ============================================================
echo [Step 2/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js:
    echo   1. Go to: https://nodejs.org/
    echo   2. Download and install the LTS version
    echo   3. Restart this script after installation
    echo.
    echo Press any key to open Node.js download page...
    pause >nul
    start https://nodejs.org/
    exit /b 1
)
node --version
echo [OK] Node.js found!
echo.

REM ============================================================
REM Step 3: Setup Backend
REM ============================================================
echo [Step 3/4] Setting up backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment (this may take a minute)...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment!
        pause
        exit /b 1
    )
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Upgrade pip
python -m pip install --upgrade pip --quiet

REM Install dependencies if needed
if not exist "venv\Lib\site-packages\fastapi" (
    echo Installing backend dependencies (this may take a few minutes)...
    pip install -r requirements.txt --quiet
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies!
        pause
        exit /b 1
    )
    echo [OK] Backend dependencies installed!
) else (
    echo [OK] Backend dependencies already installed!
)

cd ..
echo.

REM ============================================================
REM Step 4: Setup Frontend
REM ============================================================
echo [Step 4/4] Setting up frontend...
cd frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies (this may take a few minutes)...
    call npm install --silent
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies!
        pause
        exit /b 1
    )
    echo [OK] Frontend dependencies installed!
) else (
    echo [OK] Frontend dependencies already installed!
)

cd ..
echo.

REM ============================================================
REM Step 5: Start the Application
REM ============================================================
echo ============================================================
echo   Starting Application...
echo ============================================================
echo.

REM Start backend in a new window
echo Starting backend server (port 8000)...
start "Oil Production - Backend Server" cmd /k "cd /d %PROJECT_DIR%\backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend in a new window
echo Starting frontend server (port 3000)...
start "Oil Production - Frontend Server" cmd /k "cd /d %PROJECT_DIR%\frontend && npm run dev"

REM Wait a bit more
timeout /t 3 /nobreak >nul

REM Clear screen and show success message
cls
color 0A
echo.
echo ============================================================
echo   SUCCESS! Application is starting...
echo ============================================================
echo.
echo   Backend API:  http://localhost:8000
echo   Frontend UI:  http://localhost:3000
echo   API Docs:     http://localhost:8000/docs
echo.
echo   Two windows have opened:
echo     - Backend Server (Python/FastAPI)
echo     - Frontend Server (React/Vite)
echo.
echo   The application will open in your browser automatically.
echo   If not, manually open: http://localhost:3000
echo.
echo   To stop the application, close the two server windows.
echo.
echo ============================================================
echo.

REM Try to open browser automatically
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo Press any key to close this window (servers will keep running)...
pause >nul


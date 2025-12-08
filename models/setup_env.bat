@echo off
echo 🚀 Setting up Python VENV for PMR-DQN...

:: Check if python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH. Please install Python.
    pause
    exit /b
)

:: Create Virtual Environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment 'venv'...
    python -m venv venv
) else (
    echo ✅ Virtual environment 'venv' already exists.
)

:: Activate VENV
call venv\Scripts\activate

:: Install Dependencies
echo ⬇️ Installing dependencies from requirements.txt...
pip install -r requirements.txt

echo.
echo ✅ Setup Complete!
echo.
echo To start working, run:
echo    call venv\Scripts\activate
echo.
pause

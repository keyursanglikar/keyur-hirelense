@echo off
title CA SaaS Platform Setup & Runner
cls

echo ====================================================
echo   CA SaaS Platform Setup and Runner (Local/Prod)
echo ====================================================
echo.
echo 1. Start Local Development Mode (Frontend + Backend)
echo 2. Setup Local Environment (Pip Install + Npm Install + Fake Migrations)
echo 3. Build for Production (Build Frontend + Collect Static)
echo 4. Run Production Server (Windows Fallback)
echo 5. Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto setup
if "%choice%"=="3" goto build
if "%choice%"=="4" goto prod
if "%choice%"=="5" goto exit
goto invalid

:dev
echo Starting Local Development...
echo.
echo [1/2] Starting Vite Frontend on http://localhost:5173...
start "Frontend (Vite)" cmd /k "cd frontend && npm run dev"
echo [2/2] Starting Django Backend on http://127.0.0.1:8000...
start "Backend (Django)" cmd /k "cd backend && venv\Scripts\activate && python manage.py runserver"
echo.
echo Both servers have been launched in separate terminal windows.
echo You can view their logs in the respective opened windows.
goto exit

:setup
echo Setting up local environment...
echo.
echo [1/3] Installing Python dependencies...
cd backend
if not exist venv (
    echo Creating python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt
echo.
echo [2/3] Faking Django database migrations...
python manage.py migrate --fake
cd ..
echo.
echo [3/3] Installing frontend dependencies...
cd frontend
call npm install
cd ..
echo.
echo Setup completed successfully!
pause
goto exit

:build
echo Building for Production...
echo.
echo [1/2] Building Vite Frontend...
cd frontend
call npm run build
cd ..
echo.
echo [2/2] Collecting Django Static Files...
cd backend
call venv\Scripts\activate
python manage.py collectstatic --noinput
cd ..
echo.
echo Build completed successfully! Built assets are ready in:
echo   - Frontend: frontend/dist
echo   - Static: backend/staticfiles
pause
goto exit

:prod
echo Running Production Server...
echo.
echo Note: Gunicorn is installed but runs natively only on POSIX (Linux/macOS).
echo For Windows production, a WSGI server like Waitress is recommended.
echo.
echo Starting Django Backend in production mode (Windows Fallback)...
cd backend
call venv\Scripts\activate
start "Backend Production (Django)" cmd /k "python manage.py runserver 0.0.0.0:8000 --noreload"
cd ..
echo.
echo Server started. Access it at http://localhost:8000
goto exit

:invalid
echo Invalid choice. Please try again.
pause
goto exit

:exit
echo Thank you!

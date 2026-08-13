#!/bin/bash

# Exit on error
set -e

echo "===================================================="
echo "  CA SaaS Platform Setup and Runner (Unix/Linux)"
echo "===================================================="
echo ""
echo "1. Start Local Development Mode (Frontend + Backend)"
echo "2. Setup Local Environment (Pip Install + Npm Install + Fake Migrations)"
echo "3. Build for Production (Build Frontend + Collect Static)"
echo "4. Run Production Server (Gunicorn)"
echo "5. Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "Starting Local Development..."
        echo ""
        echo "[1/2] Starting Vite Frontend on http://localhost:5173..."
        (cd frontend && npm run dev) &
        FRONTEND_PID=$!
        
        echo "[2/2] Starting Django Backend on http://127.0.0.1:8000..."
        (cd backend && source venv/bin/activate && python manage.py runserver) &
        BACKEND_PID=$!
        
        echo "Servers running. Press Ctrl+C to stop both."
        trap "kill $FRONTEND_PID $BACKEND_PID; exit" INT TERM EXIT
        wait
        ;;
    2)
        echo "Setting up local environment..."
        echo ""
        echo "[1/3] Installing Python dependencies..."
        cd backend
        if [ ! -d "venv" ]; then
            echo "Creating python virtual environment..."
            python3 -m venv venv
        fi
        source venv/bin/activate
        pip install -r requirements.txt
        echo ""
        echo "[2/3] Faking Django database migrations..."
        python manage.py migrate --fake
        cd ..
        echo ""
        echo "[3/3] Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        echo ""
        echo "Setup completed successfully!"
        ;;
    3)
        echo "Building for Production..."
        echo ""
        echo "[1/2] Building Vite Frontend..."
        cd frontend
        npm run build
        cd ..
        echo ""
        echo "[2/2] Collecting Django Static Files..."
        cd backend
        source venv/bin/activate
        python manage.py collectstatic --noinput
        cd ..
        echo ""
        echo "Build completed successfully!"
        ;;
    4)
        echo "Running Production Server (Gunicorn)..."
        echo ""
        cd backend
        source venv/bin/activate
        gunicorn saas_platform.wsgi:application --bind 0.0.0.0:8000
        ;;
    5)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

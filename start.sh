#!/bin/bash

echo "Starting zeeeestack Cloud Music..."

echo ""
echo "Building Backend..."
cd backend
./gradlew build -x test
if [ $? -ne 0 ]; then
    echo "Backend build failed!"
    exit 1
fi

echo ""
echo "Installing Frontend Dependencies..."
cd ../frontend-uniapp
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "Frontend dependencies installation failed!"
        exit 1
    fi
fi

echo ""
echo "Starting Backend..."
cd ../backend
./gradlew bootRun --console=plain &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 10

echo ""
echo "Starting Frontend..."
cd ../frontend-uniapp
npm run dev:h5 &
FRONTEND_PID=$!

echo ""
echo "Both services are starting!"
echo "Backend: http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both services"

trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
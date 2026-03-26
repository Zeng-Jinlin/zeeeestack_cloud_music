@echo off
echo Starting zeeeestack Cloud Music...

echo.
echo Building Backend...
cd backend
call gradlew.bat build -x test
if errorlevel 1 (
    echo Backend build failed!
    pause
    exit /b 1
)

echo.
echo Installing Frontend Dependencies...
cd ..\frontend-uniapp
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo Frontend dependencies installation failed!
        pause
        exit /b 1
    )
)

echo.
echo Starting Backend in background...
start "Backend" cmd /k "cd ..\backend && gradlew.bat bootRun --console=plain"

echo Waiting for backend to start...
timeout /t 10 /nobreak >nul

echo.
echo Starting Frontend...
start "Frontend" cmd /k "cd ..\frontend-uniapp && npm run dev:h5"

echo.
echo Both services are starting!
echo Backend: http://localhost:8080
echo Frontend: http://localhost:3000
echo.
pause
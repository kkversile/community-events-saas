@echo off
setlocal
call npm install
if errorlevel 1 exit /b 1
call npm run dev

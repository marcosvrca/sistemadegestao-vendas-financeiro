@echo off
title Recanto da Fe - Reiniciar Backend
setlocal EnableExtensions

set "PROJETO=%~dp0"
set "PROJETO=%PROJETO:~0,-1%"

echo.
echo  Reiniciando backend (porta 8000)...
echo.

for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo  Encerrando processo PID %%P
    taskkill /F /PID %%P >nul 2>&1
)

timeout /t 2 /nobreak >nul

start "Recanto da Fe - Backend" cmd /k "cd /d ""%PROJETO%\backend"" && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"

echo.
echo  Backend reiniciado. Aguarde alguns segundos e atualize a pagina do Caixa.
echo.
pause

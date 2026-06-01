@echo off
title Recanto da Fe
setlocal EnableExtensions

set "PROJETO=%~dp0"
set "PROJETO=%PROJETO:~0,-1%"
set "URL=http://localhost:5173"

if not exist "%PROJETO%\backend\main.py" (
    echo ERRO: backend nao encontrado em %PROJETO%
    pause
    exit /b 1
)

where python >nul 2>&1 || (echo Instale Python 3.10+ & pause & exit /b 1)
where npm >nul 2>&1 || (echo Instale Node.js LTS & pause & exit /b 1)

echo.
echo  Recanto da Fe - Iniciando...
echo.

if not exist "%PROJETO%\backend\venv" (
    echo  Criando ambiente Python...
    cd /d "%PROJETO%\backend"
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt -q
)

if not exist "%PROJETO%\frontend\node_modules" (
    echo  Instalando dependencias do frontend...
    cd /d "%PROJETO%\frontend"
    call npm install
)

netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo  Encerrando backend antigo para carregar atualizacoes...
    for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
        taskkill /F /PID %%P >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)
echo  Subindo backend...
start /min "Recanto da Fe - Backend" cmd /k "cd /d ""%PROJETO%\backend"" && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"

netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo  Subindo frontend...
    start /min "Recanto da Fe - Frontend" cmd /k "cd /d ""%PROJETO%\frontend"" && npm run dev"
    echo  Aguardando sistema ficar pronto...
    timeout /t 5 /nobreak >nul
) else (
    echo  Frontend ja esta rodando.
)

echo  Abrindo navegador...
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --new-window "%URL%"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --new-window "%URL%"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --new-window "%URL%"
) else (
    start "" "%URL%"
)

echo.
echo  Sistema pronto: %URL%
echo  Para encerrar, feche as janelas minimizadas na barra de tarefas.
echo.
exit /b 0

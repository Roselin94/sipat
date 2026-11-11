@echo off
title SIPAT - Lancement Plateforme Gouvernementale
echo ========================================================
echo  SIPAT - REPUBLIQUE DU CONGO
echo  Systeme Integre de Pilotage de l'Amenagement du Territoire
echo ========================================================
echo.

:: 1. Verifier et demarrer MySQL Wamp si necessaire
echo [1/3] Verification de MySQL...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MySQL est deja actif.
) else (
    echo Demarrage autonome de MySQL Wamp (mysql9.1.0)...
    if exist "C:\wamp64\bin\mysql\mysql9.1.0\bin\mysqld.exe" (
        start "SIPAT_MYSQL" /B "C:\wamp64\bin\mysql\mysql9.1.0\bin\mysqld.exe" --defaults-file="C:\wamp64\bin\mysql\mysql9.1.0\my.ini" --console
    ) else if exist "C:\wamp64\bin\mysql\mysql8.4.7\bin\mysqld.exe" (
        start "SIPAT_MYSQL" /B "C:\wamp64\bin\mysql\mysql8.4.7\bin\mysqld.exe" --defaults-file="C:\wamp64\bin\mysql\mysql8.4.7\my.ini" --console
    )
    timeout /t 3 >nul
)

:: 2. Demarrer le Backend Express
echo [2/3] Demarrage du Backend Core (Port 5000)...
start "SIPAT_BACKEND" cmd /k "cd /d %~dp0backend && npm run dev"

:: 3. Demarrer le Frontend Vite PWA
echo [3/3] Demarrage du Frontend React PWA (Port 5173)...
start "SIPAT_FRONTEND" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo  SIPAT est operationnel :
echo  - Frontend Web & PWA : http://localhost:5173
echo  - API Backend        : http://localhost:5000/api/v1
echo  - Bilan de sante     : http://localhost:5000/health
echo ========================================================
echo.
pause


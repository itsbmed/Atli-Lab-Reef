@echo off
rem Startet das Laravel-Backend lokal unter http://localhost:8000
rem (Ziel des Vite-Proxys im Frontend, siehe client/.env.example).
rem Voraussetzung: PHP im PATH und MySQL laeuft (z. B. XAMPP).
rem Optional: start-local.bat 8080  -> anderer Port

setlocal
cd /d "%~dp0"

set PORT=%~1
if "%PORT%"=="" set PORT=8000

where php >nul 2>nul || (echo PHP wurde nicht gefunden. Bitte PHP installieren oder zum PATH hinzufuegen. & pause & exit /b 1)
if not exist ".env" (echo Die Datei .env fehlt. Bitte .env.example nach .env kopieren und anpassen. & pause & exit /b 1)
if not exist "vendor\autoload.php" (echo Abhaengigkeiten fehlen - fuehre composer install aus ... & call composer install || (pause & exit /b 1))

echo Backend startet auf http://localhost:%PORT%  (beenden mit Strg+C)
php artisan serve --host=127.0.0.1 --port=%PORT%

endlocal

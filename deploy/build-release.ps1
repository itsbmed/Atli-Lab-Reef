<#
.SYNOPSIS
    Baut ein Archiv mit Backend und Frontend fuer den Server.

.DESCRIPTION
    Backend (backend/):
    - Nimmt alle Dateien, die Git kennt oder kennen wuerde (versioniert und neu, ohne .gitignore-Treffer).
      Ein nicht committeter Stand landet also mit im Archiv; der Name endet dann auf "-dirty".
    - Laesst Entwicklungsdateien weg: tests, phpunit.xml, Laravel-Frontend-Quellen, lokale Skripte, Agent-Dateien.
    - Installiert vendor/ frisch ohne Dev-Pakete (composer install --no-dev).

    Frontend (client/):
    - Baut die Vue-App mit dem Basispfad (Standard /lab-test/) und Login ueber das Backend.
    - Legt den Build in public/ des Backends; deploy/public.htaccess verteilt die Anfragen:
      api/, sanctum/, up an Laravel, alles andere an die Vue-App.

    Keine .env, keine Logs, keine Inhalte aus storage/: ein Update ueberschreibt auf dem Server nichts davon.
    RELEASE.txt im Archiv beschreibt die Schritte auf dem Server.

.PARAMETER BasePath
    URL-Pfad, unter dem die Anwendung auf dem Server liegt, mit "/" am Anfang und Ende. Standard: /lab-test/

.PARAMETER SkipFrontend
    Nur das Backend packen (mit der normalen Laravel-.htaccess).

.PARAMETER Format
    zip (Standard) oder tar.gz

.PARAMETER OutDir
    Zielordner, Standard: releases/ im Projektordner

.EXAMPLE
    deploy\build-release.bat
    powershell -ExecutionPolicy Bypass -File deploy\build-release.ps1 -BasePath /lab/ -Format tar.gz
    powershell -ExecutionPolicy Bypass -File deploy\build-release.ps1 -SkipFrontend
#>
param(
    [ValidatePattern('^/([A-Za-z0-9._-]+/)*$')]
    [string]$BasePath = '/lab-test/',
    [switch]$SkipFrontend,
    [ValidateSet('zip', 'tar.gz')]
    [string]$Format = 'zip',
    [string]$OutDir = (Join-Path (Split-Path $PSScriptRoot -Parent) 'releases')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
[Console]::OutputEncoding = [Text.Encoding]::UTF8

# Backend-Dateien, die auf dem Server nicht gebraucht werden (Pfade relativ zu backend/).
$exclude = @(
    '^tests/'
    '^phpunit\.xml$'
    '^\.phpunit'
    '^\.editorconfig$'
    '^\.gitattributes$'
    '^\.gitignore$'
    '^\.npmrc$'
    '^\.env(?!\.example$)'
    '^(AGENTS|CLAUDE|README)\.md$'
    '^start-local\.bat$'
    '^package(-lock)?\.json$'
    '^vite\.config\.js$'
    '^resources/(css|js)/'
    '^database/.*\.sqlite'
)

function Step([string]$text) { Write-Host "==> $text" -ForegroundColor Cyan }

$root = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $root 'backend'
$client = Join-Path $root 'client'
$staging = $null
$frontendDist = $null
$savedEnv = @{}
$startLocation = Get-Location

try {
    # --- Version ---------------------------------------------------------------------
    Push-Location $root
    $commit = (git rev-parse --short HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'git rev-parse ist fehlgeschlagen.' }
    $dirtyPaths = if ($SkipFrontend) { @('backend') } else { @('backend', 'client', 'deploy') }
    $dirty = [bool](git status --porcelain -- @dirtyPaths)
    Pop-Location

    $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
    $name = if ($SkipFrontend) { "backend-$stamp-$commit" } else { "reefpilot-$stamp-$commit" }
    if ($dirty) { $name += '-dirty' }
    $staging = Join-Path ([IO.Path]::GetTempPath()) "ati-$name"
    if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }

    # --- Backend-Dateien -------------------------------------------------------------
    Step 'Backend: Dateien sammeln'
    Push-Location $backend
    $files = git -c core.quotepath=off ls-files --cached --others --exclude-standard
    if ($LASTEXITCODE -ne 0) { throw 'git ls-files ist fehlgeschlagen.' }
    $files = @($files | Where-Object {
        $path = $_
        (Test-Path -LiteralPath $path -PathType Leaf) -and -not ($exclude | Where-Object { $path -match $_ })
    })
    foreach ($file in $files) {
        $target = Join-Path $staging $file
        New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
        Copy-Item -LiteralPath $file -Destination $target
    }
    Pop-Location
    Write-Host "    $($files.Count) Dateien"

    # --- Frontend --------------------------------------------------------------------
    if (-not $SkipFrontend) {
        Step "Frontend: vite build --base=$BasePath"
        Push-Location $client
        if (-not (Test-Path 'node_modules')) {
            npm ci --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw 'npm ci ist fehlgeschlagen.' }
        }
        # Werte aus der Umgebung haben Vorrang vor client/.env*; nach dem Build wiederhergestellt.
        $buildEnv = @{ VITE_AUTH_BACKEND = 'true'; VITE_API_URL = "${BasePath}api" }
        foreach ($key in $buildEnv.Keys) {
            $savedEnv[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
            [Environment]::SetEnvironmentVariable($key, $buildEnv[$key], 'Process')
        }
        $frontendDist = Join-Path ([IO.Path]::GetTempPath()) "ati-$name-dist"
        npx vite build --base=$BasePath --outDir $frontendDist --emptyOutDir --logLevel warn
        if ($LASTEXITCODE -ne 0) { throw 'vite build ist fehlgeschlagen.' }
        Pop-Location

        # Build in public/ legen; die Vue-Dateien gewinnen bei gleichen Namen.
        Copy-Item -Path (Join-Path $frontendDist '*') -Destination (Join-Path $staging 'public') -Recurse -Force
        Copy-Item (Join-Path $PSScriptRoot 'public.htaccess') (Join-Path $staging 'public/.htaccess') -Force
        Write-Host "    $(@(Get-ChildItem $frontendDist -Recurse -File).Count) Dateien nach public/"
    } elseif (Test-Path (Join-Path $backend 'public/build/manifest.json')) {
        Copy-Item (Join-Path $backend 'public/build') (Join-Path $staging 'public/build') -Recurse
    } else {
        Write-Warning 'public/build fehlt: Die Laravel-Startseite / zeigt auf dem Server einen Fehler. Die API ist davon nicht betroffen.'
    }

    # --- Abhaengigkeiten -------------------------------------------------------------
    Step 'Backend: composer install --no-dev'
    composer install --working-dir="$staging" --no-dev --optimize-autoloader --no-interaction --no-progress --prefer-dist --quiet
    if ($LASTEXITCODE -ne 0) { throw 'composer install ist fehlgeschlagen.' }

    # Mindestversion von PHP laut der installierten Pakete.
    $phpMin = 'unbekannt'
    $check = Join-Path $staging 'vendor/composer/platform_check.php'
    if ((Test-Path $check) -and ((Get-Content $check -Raw) -match 'PHP_VERSION_ID >= (\d+)')) {
        $id = [int]$Matches[1]
        $phpMin = '{0}.{1}.{2}' -f [math]::Floor($id / 10000), ([math]::Floor($id / 100) % 100), ($id % 100)
    }

    # --- RELEASE.txt -----------------------------------------------------------------
    $state = if ($dirty) { 'mit nicht committeten Aenderungen' } else { 'sauber' }
    $content = if ($SkipFrontend) { 'nur Backend' } else { "Backend und Frontend, Basispfad $BasePath, API unter ${BasePath}api" }
    $release = @"
ATI Reef Pilot $name
Inhalt:         $content
Commit:         $commit ($state)
Gebaut:         $(Get-Date -Format 'yyyy-MM-dd HH:mm')
PHP mindestens: $phpMin (Erweiterungen: pdo_mysql, mbstring, openssl, tokenizer, xml, ctype, json, bcmath, fileinfo)
Apache:         mod_rewrite, mod_headers empfohlen

Das Archiv hat keinen Oberordner: direkt in den Zielordner entpacken.
Die URL $BasePath muss auf den Ordner public/ zeigen.

Erste Installation
  1. cp .env.example .env und anpassen:
     APP_ENV=production, APP_DEBUG=false, APP_URL, DB_*, MAIL_*
  2. php artisan key:generate
  3. php artisan migrate --force
  4. php artisan db:seed --force            (Analysekatalog und Empfehlungsregeln)
  5. php artisan optimize
  6. storage/ und bootstrap/cache/ fuer den Webserver beschreibbar machen

Update
  1. Archiv ueber den bestehenden Ordner entpacken (.env und storage/ bleiben erhalten)
  2. php artisan migrate --force
  3. php artisan optimize
  Neue Empfehlungsregeln aus dem Seeder: php artisan db:seed --class=RecommendationRuleSeeder --force
  Alte Build-Dateien in public/assets/ stoeren nicht und koennen gelegentlich geloescht werden.

Pruefen
  curl -i https://<host>${BasePath}up                                   -> 200
  curl -i https://<host>${BasePath}api/auth/me                          -> 401 als JSON
  https://<host>$BasePath im Browser                                 -> Startseite der App
"@
    [IO.File]::WriteAllText((Join-Path $staging 'RELEASE.txt'), ($release -replace "`r`n", "`n"), (New-Object Text.UTF8Encoding $false))

    # --- Archiv ----------------------------------------------------------------------
    Step "Archiv packen ($Format)"
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
    $archive = Join-Path (Resolve-Path $OutDir) "$name.$Format"
    if (Test-Path $archive) { Remove-Item $archive -Force }

    # tar.exe von Windows (bsdtar): schreibt ZIP mit "/" als Trenner, anders als Compress-Archive in PS 5.1.
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    $entries = @((Get-ChildItem -LiteralPath $staging -Force).Name)
    if ($Format -eq 'zip') {
        & $tar -a -c -f $archive -C $staging @entries
    } else {
        & $tar -c -z -f $archive -C $staging @entries
    }
    if ($LASTEXITCODE -ne 0) { throw 'Packen ist fehlgeschlagen.' }

    $size = '{0:N1} MB' -f ((Get-Item $archive).Length / 1MB)
    Write-Host ''
    Write-Host "Fertig: $archive ($size)" -ForegroundColor Green
    Write-Host "PHP auf dem Server: mindestens $phpMin"
    if ($dirty) { Write-Warning 'Das Archiv enthaelt nicht committete Aenderungen.' }
}
finally {
    Set-Location $startLocation
    foreach ($key in $savedEnv.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnv[$key], 'Process') }
    foreach ($dir in @($staging, $frontendDist)) {
        if ($dir -and (Test-Path $dir)) { Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

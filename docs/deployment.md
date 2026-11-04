# Deployment

Frontend und Backend laufen auf dem Server in einem Ordner unter einem gemeinsamen URL-Pfad, z. B. `https://reefpilot.atiaquaristik.com/lab-test/`. Die Vue-App liegt im `public/`-Ordner von Laravel. Weil beide auf derselben Domain laufen, braucht es kein CORS.

| URL | Ziel |
|---|---|
| `/lab-test/api/…`, `/lab-test/sanctum/…`, `/lab-test/up` | Laravel (`public/index.php`) |
| vorhandene Dateien, z. B. `/lab-test/assets/…`, `/lab-test/ati-logo.png` | direkt von Apache |
| alle übrigen Pfade, z. B. `/lab-test/dashboard` | Vue-App (`public/index.html`) |

## Archiv bauen

```bat
deploy\build-release.bat
```

Das Archiv landet in `releases/`, z. B. `reefpilot-20261104-1727-d9b5ee9.zip`.

| Option | Wirkung |
|---|---|
| `-BasePath /lab/` | anderer URL-Pfad (Standard `/lab-test/`), mit `/` am Anfang und Ende |
| `-SkipFrontend` | nur das Backend, mit der normalen Laravel-`.htaccess` |
| `-Format tar.gz` | tar.gz statt zip |

Das Script:
- nimmt alle Backend-Dateien, die Git kennt oder kennen würde, ohne Tests und Entwicklungsdateien. Nicht committete Änderungen kommen mit; der Name endet dann auf `-dirty`.
- installiert `vendor/` ohne Dev-Pakete.
- baut das Frontend mit `vite build --base=<BasePath>`, `VITE_AUTH_BACKEND=true` und `VITE_API_URL=<BasePath>api` und legt es nach `public/`.
- ersetzt `public/.htaccess` durch [deploy/public.htaccess](../deploy/public.htaccess).
- legt `RELEASE.txt` mit Version, PHP-Mindestversion und den Schritten auf dem Server bei.

`.env`, Logs und die Inhalte von `storage/` sind nicht im Archiv. Ein Update kann deshalb über den bestehenden Ordner entpackt werden.

## Server

- **PHP:** mindestens 8.3. `composer.json` legt die Plattform auf 8.3.0 fest, damit `composer update` keine Pakete holt, die PHP 8.4 brauchen.
- **Apache:** `mod_rewrite`, für die Cache-Header außerdem `mod_headers`. Der URL-Pfad (`/lab-test`) muss auf `public/` zeigen, und `AllowOverride All` muss für diesen Ordner gelten.
- **`.env`:** `APP_ENV=production` und `APP_DEBUG=false`, sonst zeigt Laravel bei Fehlern Stack-Traces. Nach jeder Änderung `php artisan optimize`, weil Laravel sonst die zwischengespeicherte Konfiguration weiter nutzt.

Erste Installation und Update: siehe `RELEASE.txt` im Archiv.

### Verzeichnisschutz (htaccess-Passwort)

Der htaccess-Schutz und die App melden sich beide über den Header `Authorization` an: Basic gegen Bearer-Token. Nach dem Login in der App schickt der Browser die Basic-Daten nicht mehr mit, und Apache weist jede API-Anfrage mit 401 ab. Die API muss deshalb vom Schutz ausgenommen sein. Sie ist über Sanctum geschützt:

```apache
<RequireAny>
    Require expr "%{THE_REQUEST} =~ m#^\S+ /lab-test/(api|up)(/|\s|$)#"
    Require valid-user
</RequireAny>
```

## Frontend und Basispfad

Lokal ist der Basispfad `/`, im Archiv `/lab-test/`. Damit das Frontend unter beiden läuft:
- liest der Router den Pfad aus `import.meta.env.BASE_URL` ([router/index.js](../client/src/router/index.js)).
- ist die API ohne `VITE_API_URL` unter `<Basispfad>api` ([api.js](../client/src/services/api.js)).
- setzt Vite den Basispfad selbst an `src="/…"` in Templates und an `url(/…)` in CSS. **Pfade im JS-Code ergänzt Vite nicht.** Dort gehört eine Datei aus `client/public` immer in `publicUrl('/bild.png')` bzw. für Druckfenster in `absolutePublicUrl()` ([publicUrl.js](../client/src/services/publicUrl.js)).

## Prüfen

```bash
curl -i https://<host>/lab-test/up              # 200
curl -i https://<host>/lab-test/api/auth/me     # 401 mit {"error":"Nicht angemeldet."}
```

Danach `https://<host>/lab-test/` im Browser öffnen, dann z. B. `/lab-test/dashboard` direkt aufrufen und neu laden.

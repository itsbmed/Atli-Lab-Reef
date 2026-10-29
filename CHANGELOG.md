# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei festgehalten.
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## [Unveröffentlicht]

### Hinzugefügt

- **Login über das Laravel-Backend (optional).** Mit `VITE_AUTH_BACKEND=true` laufen Login,
  Registrierung und Logout über `backend/` (`/api/auth/*`, Sanctum-Token) statt über den lokalen
  Test-Speicher im Browser. Ohne den Schalter bleibt alles beim Alten.
- Vite-Dev-Proxy: `/api` wird an `http://localhost:8000` (`php artisan serve`) weitergeleitet,
  eine CORS-Konfiguration ist dadurch nicht nötig. Ziel über `VITE_API_PROXY_TARGET` änderbar.
- `client/.env.example` als Vorlage für `VITE_AUTH_BACKEND` und `VITE_API_PROXY_TARGET`.
- `authApi.logout()` in `client/src/services/api.js`.
- Auth-Store `restore()`: prüft beim App-Start einen gespeicherten Token über `GET /api/auth/me`,
  frischt das Profil auf und meldet bei `401` ab. Die App wird erst danach eingebunden.

- **Konto-API im Backend:**
  - `PATCH /api/auth/me` speichert das Profil (Name, Nutzername, E-Mail, Land, Sprache,
    Newsletter, Analyse-Erinnerung samt Intervall, Fachhändler-Freigabe). Rolle und Kontoart
    sind darüber nicht änderbar; Nutzername/E-Mail werden ohne Beachtung der Groß-/Kleinschreibung
    auf Eindeutigkeit geprüft.
  - `PUT /api/auth/password` ändert das Passwort (`current_password`, `new_password`,
    `confirm_password`), setzt `password_updated_at` und meldet alle anderen Geräte ab
    (übrige Sanctum-Tokens werden widerrufen). Begrenzt auf 10 Versuche pro Minute.
  - Neue Request-Klassen `UpdateProfileRequest` und `UpdatePasswordRequest` mit deutschen
    Fehlermeldungen; Feature-Tests in `tests/Feature/Auth/AccountTest.php`.
- Frontend: `authApi.updateProfile()` und `authApi.updatePassword()`; die Konto-Seite speichert
  Profil und Passwort im Backend-Modus jetzt über diese Endpunkte.
- **Aquarien-API im Backend:**
  - Tabelle `aquariums` (Migration `2026_10_29_120000_create_aquariums_table`) mit allen Feldern
    des Aquarien-Formulars; Technikangaben als JSON (`water_details`), Foto vorerst als Data-URL.
    Löschen des Nutzers löscht seine Aquarien. `legacy_id` als Brücke für den späteren Import.
  - Verknüpfte Profile allgemein in der Tabelle `aquarium_links` (`aquarium_id`,
    `linked_aquarium_id`, `type`; je Becken und Typ höchstens eine Verknüpfung). Erlaubte Typen und
    die dafür nötige Wasserart stehen in `Aquarium::LINK_TYPES` – vorerst nur
    `osmosis_source` → Osmosewasser; weitere Typen sind dort eine Zeile. Wird ein Profil gelöscht,
    entfallen seine Verknüpfungen in beide Richtungen, die anderen Becken bleiben erhalten.
  - In der API als `links: { "osmosis_source": "<id>" }`. Ein `links`-Typ mit `null` entfernt die
    Verknüpfung, fehlt `links`, bleibt alles unverändert. Unbekannte Typen, fremde Profile, falsche
    Wasserart und Selbstverknüpfung werden abgelehnt.
  - `GET|POST /api/aquariums`, `GET|PATCH|DELETE /api/aquariums/{id}` – nur eigene Aquarien,
    fremde gelten als „Aquarium nicht gefunden.“ (404). Die Antwort hat dieselbe Form wie die
    Aquarien im Frontend-Speicher (leere Texte als `''`, `water_details` immer als Objekt).
  - `AquariumRequest` prüft u. a. Wasserart, Volumen, Fotoformat/-größe und die Verknüpfungen;
    deutsche Fehlermeldungen.
  - Modelle `Aquarium` (mit `links()` und `syncLinks()`) und `AquariumLink`, `User::aquariums()`,
    `AquariumFactory`, Feature-Tests in `tests/Feature/AquariumTest.php`.
  - `DemoAquariumSeeder`: die 14 Demo-Becken des Kontos `kunde` mit denselben IDs wie im Frontend
    (`demo-…`), damit die Demo-Analysen ihre Becken finden. Läuft mit `php artisan db:seed`.
- Tabelle `aquarium_images` (Modell `AquariumImage`, `Aquarium::images()`) für Profil-, Kopf- und
  Galeriebilder. Übernommene Bilder speichern vorerst nur den Pfad auf dem alten Server
  (`usercontent/tanks/…`); in der API sind sie noch nicht enthalten.
- **Import der alten Becken:** `php artisan legacy:import-aquariums [--dry-run] [--chunk=1000]`
  übernimmt `tanks` aus der alten Datenbank (Verbindung `legacy`). Voraussetzung:
  `legacy:import-users` ist gelaufen; Becken nicht übernommener Konten werden übersprungen.
  - Wasserart aus der **neuesten Analyse** des Beckens (`analysis.type` 3 → Osmosewasser,
    2 → Süßwasser, 4 → Meersalz, sonst Meerwasser); ohne Analyse Meerwasser, außer der Name
    deutet auf Osmose hin („Osmose“, „RODI“, „RO“ …).
  - Merkmale: Abmessungen → `dimensions`, Abschäumer → `skimmer`/`skimmer_model` (Antworten wie
    „kein Abschäumer“ → ohne), Versorgungssystem → `supply_system`, Beleuchtung/Pumpen/andere
    Filter → `water_details.light_product`/`flow_products`/`other_media`; Beschreibung und
    Kommentar → `notes`. Mehrere Werte je Merkmal werden mit „; “ verbunden, zu lange Texte gekürzt.
  - Volumen 0/1 l, über 100 000 l und bei Osmosewasser → leer. Nulldaten (`0000-00-00`) werden
    ersetzt.
  - Osmosequellen: Die Osmose-Analyse verweist per `parent_id` auf die Analyse des versorgten
    Beckens; die neueste solche Analyse bestimmt die Verknüpfung (`links.osmosis_source`). Nur
    innerhalb desselben Kontos und nur, wenn die Quelle laut neuester Analyse Osmosewasser ist.
  - Bildpfade aus `pictures` (`profile`, `header`, `images` → `gallery`).
  - `video` und `public` werden nicht übernommen.
  - Wiederholbar über `legacy_id` (Becken, Bilder) bzw. Becken+Typ (Verknüpfungen); im neuen
    System gemachte Änderungen an übernommenen Feldern werden dabei überschrieben.
  - Probelauf gegen `ati-2025-07-24` (in einer zurückgerollten Transaktion): 97 982 Becken
    (58 413 Meerwasser, 39 278 Osmosewasser, 275 Süßwasser, 16 Meersalz), 15 047
    Osmose-Verknüpfungen, 12 927 Bildpfade, 43 Becken gesperrter/gelöschter Konten übersprungen;
    Laufzeit ca. 17 s.
  - Feature-Tests in `tests/Feature/Legacy/ImportLegacyAquariumsTest.php`.
- Frontend: `aquariumApi` (`list`, `create`, `update`, `remove`). Der Aquarien-Store lädt und
  speichert im Backend-Modus über die API; beim App-Start werden die Aquarien vorgeladen.
  `aquariumApi` übersetzt zwischen `links.osmosis_source` (Backend) und dem flachen Feld
  `osmosis_source_id`, mit dem die Oberfläche weiter arbeitet (`AQUARIUM_LINK_FIELDS` in `api.js`).

### Geändert

- `User::usernameTaken()` kann eine eigene Benutzer-ID ausnehmen (für Profiländerungen).
- Aquarien-Store: `load()`, `create()`, `update()` und `remove()` sind asynchron (gleichzeitige
  `load()`-Aufrufe teilen sich eine Anfrage). Neu anlegen, Bearbeiten und Löschen warten auf das
  Ergebnis; ein fehlgeschlagenes Löschen wird im Bestätigungsdialog angezeigt.
- `aquariumStore.getAquarium()`/`getAquariums()` lesen im Backend-Modus aus einem Zwischenspeicher,
  den der Aquarien-Store befüllt – so finden Analysen und Berichte die Becken weiter ohne Umbau.

- `client/src/services/api.js`: sendet bei jeder Anfrage `Accept: application/json` und – sofern
  angemeldet – `Authorization: Bearer <token>`. Fehler enthalten jetzt zusätzlich den HTTP-Status
  (`status`); Antworten mit `204` werden unterstützt.
- `client/src/stores/auth.js`: speichert im Backend-Modus den echten Token samt Ablaufzeitpunkt
  (`expiresAt`). `logout` widerruft den Token zusätzlich serverseitig. Abgelaufene Sessions und
  Sessions aus dem jeweils anderen Modus werden beim Start verworfen.
- Login-Formular: „Angemeldet bleiben“ wird als `remember` übertragen (Token 30 Tage statt 1 Tag).

### Behoben

- `legacy:import-users` brach auf MySQL bei Konten mit Nulldatum (`0000-00-00 00:00:00`) ab
  (z. B. Konto 9). `created_at` fällt jetzt auf `updated_at` zurück, `email_verified_at` entsprechend.
- Notizen eines Aquariums dürfen bis zu 10 000 Zeichen lang sein (vorher 5 000), damit übernommene
  Beschreibungen (bis gut 6 000 Zeichen) weiter bearbeitet werden können.

- `ensureDemoUsers()` überschreibt beim App-Start keine Backend-Session mehr mit einem lokalen
  Demo-Token. Die Synchronisierung greift nur noch für lokale Sessions (`local-…`).

### Bekannte Einschränkungen

- Im Backend-Modus erscheinen für `kunde` die Demo-Aquarien, aber noch keine Demo-Analysen:
  Analysen liegen weiter im Browser und hängen an `ownerId: 'demo-full'` statt an der UUID.
- Die Benutzerverwaltung im Admin-Bereich liest weiterhin aus dem lokalen Speicher und zählt im
  Backend-Modus nur die Aquarien des angemeldeten Admins.
- Aquarium-Fotos werden als Data-URL in der Datenbank gespeichert; ein echter Datei-Upload folgt.

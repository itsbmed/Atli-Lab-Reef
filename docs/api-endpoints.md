# API-Endpoints

Übersicht der im Laravel-Backend implementierten Endpoints und wo das Frontend sie nutzt.
Bei jedem neuen oder geänderten Endpoint diese Tabelle mitpflegen.

- Routen: [`backend/routes/api.php`](../backend/routes/api.php), Präfix `/api`
- Frontend-Zugriff ausschließlich über [`client/src/services/api.js`](../client/src/services/api.js), aktiv nur mit `VITE_AUTH_BACKEND=true` (sonst lokaler Test-Speicher)
- Auth: Sanctum-Bearer-Token; 🔒 = erfordert Login

## Auth

| Methode | Pfad | Zweck | Backend | Frontend (api.js → Store → Verwendung) |
|---|---|---|---|---|
| `POST` | `/auth/register` | Konto anlegen und direkt einloggen (Token + User). Throttle 10/min. | `AuthController@register` | `authApi.register` → `auth.register` → [RegisterView.vue](../client/src/views/auth/RegisterView.vue) |
| `POST` | `/auth/login` | Login per E-Mail/Benutzername + Passwort, liefert Token und Ablaufzeit. Throttle 10/min. | `AuthController@login` | `authApi.login` → `auth.login` → [LoginView.vue](../client/src/views/auth/LoginView.vue) |
| `POST` | `/auth/logout` 🔒 | Aktuellen Token widerrufen. | `AuthController@logout` | `authApi.logout` → `auth.logout` → [AppLayout.vue](../client/src/components/layout/AppLayout.vue), [AccountView.vue](../client/src/views/AccountView.vue) |
| `GET` | `/auth/me` 🔒 | Gespeicherten Token prüfen und Profil auffrischen. | `AuthController@me` | `authApi.me` → `auth.restore` → [main.js](../client/src/main.js) (App-Start) |
| `PATCH` | `/auth/me` 🔒 | Profildaten ändern. | `AuthController@updateProfile` | `authApi.updateProfile` → `auth.updateProfile` → [AccountView.vue](../client/src/views/AccountView.vue) |
| `PUT` | `/auth/password` 🔒 | Passwort ändern (aktuelles Passwort erforderlich). Throttle 10/min. | `AuthController@updatePassword` | `authApi.updatePassword` → `auth.changePassword` → [AccountView.vue](../client/src/views/AccountView.vue) |

## Aquarien

Alle Endpoints liefern nur Aquarien des angemeldeten Nutzers. Verknüpfte Profile (z. B. Osmosequelle) laufen im Backend als `links: { osmosis_source: <id> }`; `api.js` mappt das auf das flache Feld `osmosis_source_id`.

| Methode | Pfad | Zweck | Backend | Frontend (api.js → Store → Verwendung) |
|---|---|---|---|---|
| `GET` | `/aquariums` 🔒 | Eigene Aquarien auflisten. | `AquariumController@index` | `aquariumApi.list` → `aquariums.load` → [main.js](../client/src/main.js) (Vorladen), [AppLayout.vue](../client/src/components/layout/AppLayout.vue), [AquariumsView.vue](../client/src/views/aquariums/AquariumsView.vue), [AquariumDetailView.vue](../client/src/views/aquariums/AquariumDetailView.vue), [AquariumNewView.vue](../client/src/views/aquariums/AquariumNewView.vue), [ActivateView.vue](../client/src/views/analyses/ActivateView.vue), [FullDashboard.vue](../client/src/components/dashboard/FullDashboard.vue), [toolsData.js](../client/src/services/toolsData.js); außerdem nach `remove` |
| `POST` | `/aquariums` 🔒 | Aquarium anlegen (inkl. Bild als Data-URL, max. 3 MB). | `AquariumController@store` | `aquariumApi.create` → `aquariums.create` → [AquariumNewView.vue](../client/src/views/aquariums/AquariumNewView.vue) |
| `GET` | `/aquariums/{id}` 🔒 | Einzelnes Aquarium abrufen. | `AquariumController@show` | – (Frontend liest aus der geladenen Liste) |
| `PATCH` | `/aquariums/{id}` 🔒 | Aquarium ändern (auch `PUT`). | `AquariumController@update` | `aquariumApi.update` → `aquariums.update` → [AquariumDetailView.vue](../client/src/views/aquariums/AquariumDetailView.vue) |
| `DELETE` | `/aquariums/{id}` 🔒 | Aquarium löschen; entfernt auch Verknüpfungen anderer Becken auf dieses Profil. Analysen bleiben erhalten (ohne Becken). | `AquariumController@destroy` | `aquariumApi.remove` → `aquariums.remove` → [AquariumDetailView.vue](../client/src/views/aquariums/AquariumDetailView.vue) |

`evaluation_scale_id` akzeptiert nur globale Bewertungsskalen (`ati-standard`, `nyos`, `fauna-marin`) oder eigene Skalen des Nutzers.

## Analysen

Nur Analysen des angemeldeten Nutzers; fremde gelten als nicht vorhanden (404). Antworten in camelCase wie im Frontend-Speicher ([`analysisStore.js`](../client/src/services/analysisStore.js)), siehe [`AnalysisResource`](../backend/app/Http/Resources/AnalysisResource.php). Schema: [schema-analyses.md](schema-analyses.md).

| Methode | Pfad | Zweck | Backend | Frontend (api.js → Store → Verwendung) |
|---|---|---|---|---|
| `GET` | `/analyses` 🔒 | Eigene Hauptanalysen, neueste zuerst, ohne Messwerte; mit Paket, Methode, Status, Qualitätsindex (`score`) und Anzahl Auffälligkeiten (`issueCount`). Mit `?include=details` zusätzlich alles aus dem Detail (Messwerte, Gruppen-Scores, Empfehlungen, Proben). | `AnalysisController@index` | `analysisApi.list` (mit `include=details`, Umrechnung in [analysisFromApi.js](../client/src/services/analysisFromApi.js)) → `analyses.load` → [AnalysesView.vue](../client/src/views/analyses/AnalysesView.vue), [ReportView.vue](../client/src/views/analyses/ReportView.vue), [FullDashboard.vue](../client/src/components/dashboard/FullDashboard.vue), [AppLayout.vue](../client/src/components/layout/AppLayout.vue), [AquariumDetailView.vue](../client/src/views/aquariums/AquariumDetailView.vue), [ChronikView.vue](../client/src/views/ChronikView.vue) und Tools über [toolsData.js](../client/src/services/toolsData.js) |
| `GET` | `/analyses/{id}` 🔒 | Bericht mit Messwerten (`parameters`: nur Elemente der Methode, mit Stufe 1–9, Idealwert, idealem Bereich und Dosierungen), Gruppen-Scores, Empfehlungen (`recommendations`: ausgewertete Karten in der Sprache des Nutzers, siehe [schema-recommendations.md](schema-recommendations.md); entstehen beim Abschluss der Analyse) und mitgeschickten Proben (`samples`, z. B. Osmose). | `AnalysisController@show` | – (Frontend liest aus der geladenen Liste) |
| `POST` | `/analyses` 🔒 | Barcode aktivieren: `barcode`, `aquarium_id`, optional `reason`, `addons[]`, `osmosis_aquarium_id`, `comment`. Paket vom Barcode, Methode aus Paket und Wasserart; mit Osmose-Becken entsteht eine Osmose-Probe. 422 bei unbekanntem/benutztem Barcode oder unpassendem Becken. Throttle 20/min. | `AnalysisController@store` | `analysisApi.activate` → `analyses.activate` → [ActivateView.vue](../client/src/views/analyses/ActivateView.vue) |

Das Frontend nutzt `recommendations` noch nicht; die Karten im Bericht berechnet weiterhin [directRecommendations.js](../client/src/services/directRecommendations.js).

## Barcodes

| Methode | Pfad | Zweck | Backend | Frontend (api.js → Store → Verwendung) |
|---|---|---|---|---|
| `GET` | `/vouchers/{code}` 🔒 | Barcode vor dem Aktivieren prüfen: Paket, Osmose-Auswertung enthalten, kostenlos, bereits benutzt. 404 bei unbekanntem Code. Throttle 20/min (gemeinsam mit `POST /analyses`). | `VoucherController@show` | `analysisApi.voucher` → [ActivateView.vue](../client/src/views/analyses/ActivateView.vue) (Prüfung beim Tippen/Scannen) |

# Amazing - Zip-Style Memory Maze

Eigenstaendiges Maze-Spiel im Neuroblitz-Farbschema (Mint/Navy), optimiert fuer Desktop und Mobile.
Gameplay: Der Loesungsweg leuchtet 5 Sekunden auf und verschwindet dann. Danach liegt Fog-of-War ueber dem Board, sichtbar bleibt nur eine pulsierende Torch um den Spieler.

## Spielregeln

- Vorschauzeit ist immer fix: `5 Sekunden`
- Nach der Vorschau: Fog-of-War + pulsierende Torch um den Spieler
- Level-Groesse steigt von `5x5` bis `9x9`
- Modi:
  - `Easy`: kuerzere Pflichtpfade, Wandkontakt startet Level neu
  - `Normal`: laengerer Pflichtpfad, Wandkontakt startet Level neu
  - `Hard`: noch laengerer Pflichtpfad, Wandkontakt startet Level neu
- Bei Wandkontakt: Strike-Animation (Flash + Shake), dann Level-Neustart
- Bei Zielerreichung: Nebel verschwindet, ganzes Spielfeld wird wieder sichtbar

## Lokal starten

```bash
python3 -m http.server 8080
```

Dann im Browser: `http://localhost:8080`

## Deploy fuer Squarespace (empfohlen: GitHub Pages oder Firebase)

Hoste die Dateien `index.html`, `styles.css`, `app.js` auf einem statischen Host.

### Option A: GitHub Pages

1. Neues GitHub-Repo anlegen und Dateien pushen.
2. In GitHub: `Settings` -> `Pages`.
3. Source: `Deploy from a branch`, Branch `main`, Folder `/ (root)`.
4. URL: z. B. `https://USERNAME.github.io/REPO/`.

### Option B: Firebase Hosting

Voraussetzung: `npm i -g firebase-tools` und Firebase-Projekt vorhanden.

```bash
firebase login
firebase init hosting
```

Bei `firebase init hosting`:
- Existing project waehlen
- Public directory: `.`
- Single-page app: `No`
- Overwrite `index.html`: `No`

Deploy:

```bash
firebase deploy --only hosting
```

Ergebnis: URL wie `https://PROJECT-ID.web.app`.

### Einbettung in Squarespace

1. Code-Block einfuegen.
2. Spiel per iframe einbetten:

```html
<iframe
  src="https://DEINE-DOMAIN/amazing/"
  width="100%"
  height="760"
  style="border:0;overflow:hidden"
  loading="lazy"
  allowfullscreen
></iframe>
```

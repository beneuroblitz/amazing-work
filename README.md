# Amazing - Zip-Style Memory Maze

Eigenstaendiges Maze-Spiel im Neuroblitz-Farbschema (Mint/Navy), optimiert fuer Desktop und Mobile.
Gameplay: Der Loesungsweg leuchtet 5 Sekunden auf und verschwindet dann. Danach liegt Fog-of-War ueber dem Board, sichtbar bleibt nur eine pulsierende Torch um den Spieler.

## Spielregeln

- Vorschauzeit ist immer fix: `5 Sekunden`
- Spiel startet erst nach Klick auf `Start`
- Profilname kann gespeichert werden
- Highscore wird lokal im Browser gespeichert (`localStorage`)
- Optionales Login (Firebase) fuer Cloud-Leaderboard
- Nach der Vorschau: Fog-of-War + pulsierende Torch um den Spieler
- Im Fog sind die Maze-Waende nicht sichtbar
- Bewegte Route bleibt als Lichtpfad sichtbar
- Der Vorschaupfad baut sich in ca. `1-2s` animiert auf, danach Countdown: `3, 2, 1, GO`
- Modi:
  - `Easy`: Gridbereich `4x4` bis `5x5`
  - `Medium`: Gridbereich `6x6` bis `7x7`
  - `Hard`: Gridbereich `8x8` bis `9x9`
- Freischaltung:
  - `Medium` ab Score `600`
  - `Hard` ab Score `1800`
- Pro Run: `3` Leben (`⚡⚡⚡`)
- Bei Wandkontakt: Strike-Animation (Flash + Shake), 1 Leben weg und weiterspielen an der Fehlerposition
- Beruehrung der Aussenwaende fuehrt nicht zu Strafe
- Beim Level-Clear erscheint ein kurzer Reward-Screen
- Gewinn-Screen zeigt Zeit, Fehler und Punkte
- Beim Level-Clear erscheint zuerst ein Ergebnis-Screen mit optionalem Sign-up (inkl. Google-Login)
- `Game Over` nutzt denselben Ergebnis-Screen mit Gesamtpunktzahl + Button fuer neues Spiel
- Touch-Steuerung: auf dem Canvas sliden/swipen (iOS Safari kompatibel per Pointer-/Touch-Handling)
- Bei Zielerreichung: Nebel verschwindet, ganzes Spielfeld wird wieder sichtbar
- Bei Verbrauch des letzten Blitzes: `Game Over`
- Layout ist fuer Embed ohne Scrollen optimiert (Desktop + Mobile Hoch-/Querformat)

## Lokal starten

```bash
python3 -m http.server 8080
```

Dann im Browser: `http://localhost:8080`

## Firebase Login/Leaderboard aktivieren

In `/Users/ben/Documents/New project/app.js` die Werte in `FIREBASE_CONFIG` eintragen:
- `apiKey`
- `authDomain`
- `projectId`

Dann funktionieren Registrierung/Login/Logout und das Cloud-Leaderboard.

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

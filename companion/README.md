# SplitMeta Companion (Windows)

Background uploader for iRacing. Watches your telemetry folder and sends race results + setup fingerprints to [splitmeta.net](https://www.splitmeta.net) after each session.

## Requirements

- Windows + iRacing
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- SplitMeta account with an **API key** from [Account → Generate API key](https://www.splitmeta.net/account)
- iRacing **telemetry logging enabled** (saves `.ibt` files to `Documents/iRacing/telemetry`)

## Setup (one time)

Sign in at [splitmeta.net/download](https://www.splitmeta.net/download), download the zip, extract it, then:

```powershell
# Or double-click install.bat in the extracted folder
install.bat
```

Paste your `sm_...` API key when prompted (from [Account → Generate API key](https://www.splitmeta.net/account)).

## Run

```powershell
# Or double-click START.bat
START.bat
```

Leave that window open while you race. After each race, when iRacing writes a new `.ibt` file, the companion uploads automatically.

### Test without racing

```powershell
npm run dry-run -- --upload-latest
```

Upload the most recent telemetry file for real:

```powershell
npm run start -- --upload-latest
```

## Run at Windows login (optional)

1. Press `Win+R` → `shell:startup`
2. Create shortcut to:
   ```text
   powershell.exe -WindowStyle Hidden -Command "cd C:\Users\Ayden\Documents\splitmeta\companion; npm start"
   ```

## Config file

Stored at:

```text
%APPDATA%\SplitMeta\config.json
```

## How it works

1. iRacing saves session telemetry as `.ibt` in `Documents/iRacing/telemetry`
2. Companion reads the embedded session YAML (series, track, finish, iRating, setup)
3. POSTs to `https://www.splitmeta.net/api/ingest/session`
4. SplitMeta ranks setups on the meta board

## Troubleshooting

| Issue | Fix |
|---|---|
| 401 Unauthorized | Regenerate API key on `/account`, run `npm run setup` |
| No uploads | Confirm `.ibt` files appear after races; enable telemetry in iRacing |
| Skipped "not a race" | Only race sessions upload (not practice/qualify by default) |
| Wrong series/week | Data comes from iRacing YAML; more uploads improve accuracy |

## Future

- System tray icon + installer (`.exe`)
- Live SDK upload without waiting for `.ibt` file

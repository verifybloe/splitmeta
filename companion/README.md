# SplitMeta Companion (Windows)

Background uploader for iRacing. Watches your telemetry folder and sends race results + setup fingerprints to [splitmeta.net](https://www.splitmeta.net) after each session.

## Setup

1. Sign in at [splitmeta.net/download](https://www.splitmeta.net/download)
2. Click **Download & connect** — your account is linked inside the zip
3. Extract the folder and double-click **install.bat**
4. Confirm your telemetry folder (default: `Documents/iRacing/telemetry`)
5. Before racing, double-click **START.bat** and leave it open

Requires **Node.js 18+** and iRacing **telemetry logging** enabled.

## Reconnect

Download again from the website while signed in, then run **install.bat** in the new folder.

## Config

Stored at:

```text
%APPDATA%\SplitMeta\config.json
```

## Troubleshooting

| Issue | Fix |
|---|---|
| Missing connect.json | Re-download from `/download` while signed in |
| No uploads | Confirm `.ibt` files appear after races; enable telemetry in iRacing |
| Skipped "not a race" | Only race sessions upload (not practice/qualify) |
| Upload failed | Re-download to refresh your account link |

## Developers

From the repo (`companion/`):

```powershell
npm install
npm start
```

Use a `connect.json` from a signed-in download, or copy config to `%APPDATA%\SplitMeta\config.json`.

# SplitMeta Desktop App

Professional Windows app with dashboard, Google sign-in, and automatic race uploads.

## Install (one time)

1. Download from [splitmeta.net/download](https://www.splitmeta.net/download)
2. Extract the zip
3. Double-click **Setup.bat**
4. Wait for the build to finish — **SplitMeta** appears on your Desktop

## Daily use

Open **SplitMeta** from your Desktop shortcut. No console windows, no batch files.

Sign in with Google (same account as splitmeta.net). The app remembers you.

## Requirements

- Windows 10/11 (64-bit)
- Node.js 18+ (for Setup only — [nodejs.org](https://nodejs.org))
- iRacing telemetry logging enabled

## Troubleshooting

| Issue | Fix |
|---|---|
| Setup fails | Run Setup.bat as Administrator; check antivirus |
| App won't open | Run Setup.bat again to rebuild SplitMeta.exe |
| Sign in stuck | Complete Google login in browser, click redirect link |

## Developers

```powershell
cd companion
npm install
npm start          # dev window
npm run build:app  # dist/SplitMeta.exe
```

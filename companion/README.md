# SplitMeta Desktop App

Windows app with dashboard, Google sign-in (same account as splitmeta.net), and automatic race uploads.

## Setup

1. Download from [splitmeta.net/download](https://www.splitmeta.net/download) while signed in on the website
2. Extract the zip and run **install.bat** (installs dependencies + opens the app)
3. Click **Continue with Google** in the app — uses your website account
4. Leave the app running while you race (or use **START.bat** later)

Your sign-in is remembered at `%APPDATA%\SplitMeta\session.json`.

## Dashboard

- Sign in / sign out
- Watcher status (auto-upload after each race)
- Telemetry folder picker
- Recent upload activity
- Open meta board in browser

## Requirements

- Windows 10/11
- Node.js 18+
- iRacing telemetry logging enabled

## Troubleshooting

| Issue | Fix |
|---|---|
| Sign in opens browser but app stays logged out | Click the redirect link on the connect page, or try again |
| Folder not found | Enable telemetry in iRacing or pick the folder in the app |
| Upload failed | Sign out and sign in again from the app |

## Developers

```powershell
cd companion
npm install
npm start
```

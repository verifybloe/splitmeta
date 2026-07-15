# SplitMeta Desktop App

Professional Windows app — one installer, dashboard, Google/email sign-in, auto-upload, auto-update.

## Install

1. Go to [splitmeta.net/download](https://www.splitmeta.net/download)
2. Download **SplitMeta-Setup.exe**
3. Run the installer
4. Open **SplitMeta** from Desktop or Start Menu

## Auto updates

Every launch, the installed app checks GitHub Releases for a newer version, downloads it in the background, then asks you to **Restart & update**.

## Daily use

1. Open SplitMeta
2. Sign in (email/password or Google)
3. Click **Start watching** before you race
4. Leave it open while racing

## Developers

```powershell
cd companion
npm install
npm start           # dev (no auto-update)
npm run build:app   # dist/SplitMeta-Setup.exe
```

# BuffPenguin

A free, self-hosted gym tracking system designed to run at home on a Raspberry Pi. Log your workouts from your phone and see which muscle groups you've trained recently — displayed on a magic mirror in your gym.

## What it does

BuffPenguin is made up of six components:

**1. Muscle Freshness Mirror Module** — A high-contrast MagicMirror² module (white on black) that shows which muscle groups you have trained in your recent sessions, colour-coded by how long ago you last worked them. This runs on a Raspberry Pi connected to a screen mounted behind a one-sided mirror, so the display is visible through the mirror while the screen itself stays hidden.

**2. Weight Mirror Module** — A MagicMirror² module that displays a line chart of your body weight over time (past 90 days by default). Useful for tracking trends at a glance on the mirror display.

**3. Calorie Mirror Module** — A MagicMirror² module that charts your daily calorie intake against estimated TDEE (Total Daily Energy Expenditure) lines for five activity levels. Uses the Harris-Benedict revised equation with your latest body weight, height, age, and sex.

**4. Web App** — A lightweight browser-based interface for logging workouts, tracking body weight and calorie intake, and managing exercises with muscle group mappings. Supports English and German via a language selector. No installation required — open `packages/web/index.html` in any browser, point it at the backend URL, and start logging. Works on desktop and mobile.

**5. Mobile App** — An iOS and Android app where you log your workouts: which exercises you performed, how many sets and reps, and the weight used. The app discovers the backend automatically when your phone is on the same Wi-Fi network as the Pi, and only syncs data locally — no internet connection or cloud account required.

**6. Backend & Database** — A REST API server running on the same Raspberry Pi as the mirror display. It receives workout data from the web and mobile apps, stores it in a local SQLite database, and serves muscle group freshness, body weight history, and calorie data to the mirror modules. Supports i18n — serves translated muscle group and exercise names in English and German.

## Who it's for

Anyone who wants to build this setup at home. The whole system runs locally on a Raspberry Pi — no subscriptions, no cloud services, no account needed. If you have a Pi, a spare monitor, a one-sided mirror sheet, and a phone, you have everything required.

## Components

| Component | Technology | Runs on |
|---|---|---|
| Muscle freshness display | MagicMirror² module (`MMM-BuffPenguin`) | Raspberry Pi or Windows PC |
| Weight chart | MagicMirror² module (`MMM-BuffPenguin-Weight`) | Raspberry Pi or Windows PC |
| Calorie chart | MagicMirror² module (`MMM-BuffPenguin-Calories`) | Raspberry Pi or Windows PC |
| Web app | Plain HTML / CSS / JS (ES modules) | Any browser |
| Mobile app | Flutter (iOS & Android) | Your phone |
| Backend API | Node.js + TypeScript + Fastify | Raspberry Pi or Windows PC |
| Database | SQLite | Raspberry Pi or Windows PC |

---

## Installation

### Prerequisites

**Raspberry Pi**
- Raspberry Pi 4 (2 GB RAM or more recommended)
- Raspberry Pi OS 64-bit (Bookworm / Debian 12)
- Node.js 22 LTS — install via [NodeSource](https://github.com/nodesource/distributions):
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
  ```
  > Node.js 22 is required by MagicMirror² (it uses `node --run` in its install scripts). The backend runs fine on 22 as well.
- Git:
  ```bash
  sudo apt install -y git
  ```
- MagicMirror² — follow the [official installation guide](https://docs.magicmirror.builders/getting-started/installation.html)

> **Windows alternative:** The backend and MagicMirror² module also run on a Windows PC — useful for development or if you want to run the display on a regular Windows machine instead of a Pi. See the Windows-specific notes alongside each step below.

**Development machine (for the mobile app)**
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (3.x or later)
- Android Studio or Xcode depending on your target platform

---

### 1. Clone the repository

```bash
git clone https://github.com/Pommelopium/BuffPenguin.git
cd BuffPenguin
```

---

### 2. Backend

Install dependencies and build:

```bash
npm install
npm run build --workspace=packages/backend
```

> **Windows note:** `better-sqlite3` is a native addon. For most Node.js 20 builds on Windows x64 a pre-built binary is downloaded automatically during `npm install` and no extra tools are needed. If the install fails with a build error, install the Visual C++ build tools once:
> ```powershell
> npm install --global windows-build-tools
> ```
> Or install "Desktop development with C++" from the [Visual Studio installer](https://visualstudio.microsoft.com/downloads/).

Set up the database (run once):

```bash
cd packages/backend
npx drizzle-kit push
npm run db:seed
npm run db:seed-exercises
cd ../..
```

Test that it works:

```bash
npm run dev --workspace=packages/backend
# Open http://localhost:3000/health in a browser — should return {"status":"ok"}
```

**Run as a background service (Raspberry Pi / Linux)** so the backend starts automatically on boot:

```bash
# Replace YOUR_USERNAME with your actual Linux username (e.g. buffpenguin, pi, etc.)
sed "s/YOUR_USERNAME/$(whoami)/g" packages/backend/systemd/buffpenguin.service \
  | sudo tee /etc/systemd/system/buffpenguin.service
sudo systemctl daemon-reload
sudo systemctl enable buffpenguin
sudo systemctl start buffpenguin
```

Check it is running:

```bash
sudo systemctl status buffpenguin
```

> **Windows note:** The systemd service file is Linux-only. On Windows, use [NSSM](https://nssm.cc/) to run the backend as a Windows Service, or add a Task Scheduler entry that runs `node dist/index.js` at login from the `packages/backend` directory. For development, `npm run dev --workspace=packages/backend` is sufficient.

---

### 3. Web App

The web app is three static files — no build step, no Node.js, no framework.

**Quickstart (any OS):**

Open `packages/web/index.html` directly in a browser. On first load it takes you to the Settings screen — enter your backend URL (e.g. `http://localhost:3000` for local dev or `http://raspberrypi.local:3000` for a Pi on the same network) and click **Save**. The URL is stored in `localStorage` so you only need to do this once per browser.

**What you can do:**

- **Workouts tab** — start a new session, log sets (exercise + reps + weight), delete mistakes, end the session with optional notes, and browse session history.
- **Exercises tab** — view all exercises with their primary/secondary muscle group mappings, and add new exercises using the grouped front/back muscle selector.
- **Weight tab** — log body weight entries over time and view your history.
- **Calories tab** — log daily calorie intake entries and track your eating.
- **Settings tab** — update the backend URL and test the connection.
- **Language selector** — switch the entire UI between English and German (EN/DE) using the dropdown in the header.

**Serve it over the network (Pi):**

If you want to access the web app from another device (e.g. your phone's browser), serve the folder with any static file server. With Node.js already installed on the Pi:

```bash
npx serve packages/web -p 3001
# Web app available at http://raspberrypi.local:3001
```

Or add it as a systemd service alongside the backend for automatic startup.

> **Tip:** The muscle overlay SVG builder script is also available if you update the anatomy assets. Run it from the repo root:
> ```powershell
> powershell -ExecutionPolicy Bypass -File packages/mirror-module/scripts/Build-MuscleOverlay.ps1
> ```

---

### 4. Magic Mirror Module

MagicMirror² runs on both Raspberry Pi and Windows — the module code is identical on both.

**Raspberry Pi / Linux** — symlink the module into your MagicMirror² modules folder:

```bash
ln -s ~/BuffPenguin/packages/mirror-module ~/MagicMirror/modules/MMM-BuffPenguin
```

**Windows** — create a directory junction (equivalent of a symlink) in PowerShell:

```powershell
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\MagicMirror\modules\MMM-BuffPenguin" `
  -Target "$env:USERPROFILE\BuffPenguin\packages\mirror-module"
```

> Adjust the paths above to match where you cloned the repo and installed MagicMirror².

Symlink (or junction) the two additional mirror modules the same way:

**Raspberry Pi / Linux:**
```bash
ln -s ~/BuffPenguin/packages/mirror-module-weight ~/MagicMirror/modules/MMM-BuffPenguin-Weight
ln -s ~/BuffPenguin/packages/mirror-module-calories ~/MagicMirror/modules/MMM-BuffPenguin-Calories
```

**Windows:**
```powershell
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\MagicMirror\modules\MMM-BuffPenguin-Weight" `
  -Target "$env:USERPROFILE\BuffPenguin\packages\mirror-module-weight"
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\MagicMirror\modules\MMM-BuffPenguin-Calories" `
  -Target "$env:USERPROFILE\BuffPenguin\packages\mirror-module-calories"
```

Add the modules to your MagicMirror² config file (`config/config.js`):

```js
{
  module: "MMM-BuffPenguin",
  position: "bottom_left",
  config: {
    backendUrl: "http://localhost:3000",
    updateInterval: 60000,   // refresh every 60 seconds
    lookbackDays: 14,        // show training history for the past 14 days
    anatomySex: "male"       // "male" or "female" — selects the anatomy overlay
  }
},
{
  module: "MMM-BuffPenguin-Weight",
  position: "bottom_right",
  config: {
    backendUrl: "http://localhost:3000",
    updateInterval: 3600000, // refresh every hour
    lookbackDays: 90,        // show weight history for the past 90 days
  }
},
{
  module: "MMM-BuffPenguin-Calories",
  position: "bottom_right",
  config: {
    backendUrl: "http://localhost:3000",
    updateInterval: 3600000, // refresh every hour
    lookbackDays: 30,        // show calorie history for the past 30 days
    yearOfBirth: 1990,       // used for BMR calculation
    heightCm: 180,           // used for BMR calculation
    sex: "male",             // "male" or "female" — used for BMR calculation
  }
}
```

Then restart MagicMirror²:

```bash
cd ~/MagicMirror && npm run start
```

> **Windows note:** Mobile auto-discovery uses mDNS (UDP port 5353). Windows Defender Firewall will prompt "Allow access?" the first time the backend runs — click **Allow**. If the prompt doesn't appear and the phone can't find the backend, add a firewall rule manually or use the manual IP entry in the app's Settings screen instead.

> **Note:** The muscle overlay SVG (`packages/mirror-module/assets/muscle-overlay.svg`) currently contains placeholder shapes. For accurate muscle region highlighting, open the file in [Inkscape](https://inkscape.org/) and draw the actual body region outlines over the silhouette. Each path needs `id="[slug]"` and `class="muscle-region"` — the slugs are listed in `CLAUDE.md`.

---

### 5. Mobile App (your phone)

Build from your development machine (not the Pi). Make sure Flutter is installed and a device or emulator is connected.

```bash
cd packages/mobile
flutter pub get
```

**Run directly on a connected device:**

```bash
flutter run
```

**Build a release APK for Android:**

```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

Transfer the APK to your phone and install it. On Android you may need to enable *Install from unknown sources* in your settings.

**First launch:** the app will scan your local network for the backend automatically. If it doesn't find it within a few seconds, tap *Settings* and enter the Pi's IP address manually (e.g. `http://192.168.1.10:3000`). You can find the Pi's IP with:

```bash
hostname -I
```

---

---

## Autostart on Boot (Raspberry Pi)

This section covers running everything automatically when the Pi powers on — no keyboard or monitor needed after initial setup.

### Services overview

| Service | What it runs | Autostart method |
|---|---|---|
| Backend API | `node dist/index.js` | systemd (already set up in step 2) |
| Web app server | `npx serve packages/web -p 3001` | systemd |
| MagicMirror² | `npm run start` | systemd + X11 autostart |

---

### Web app server autostart

Create a systemd service that serves the static web files on port 3001:

```bash
sudo bash -c "cat > /etc/systemd/system/buffpenguin-web.service" << EOF
[Unit]
Description=BuffPenguin Web App
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=/home/$(whoami)/BuffPenguin
ExecStart=/usr/bin/npx serve packages/web -p 3001
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable buffpenguin-web
sudo systemctl start buffpenguin-web
sudo systemctl status buffpenguin-web
```

The web app will then be available at `http://raspberrypi.local:3001` from any device on the same network.

---

### MagicMirror² autostart

MagicMirror² needs a display, so it is started differently from the backend services — it runs inside the Pi's graphical session rather than as a background daemon.

**1. Enable auto-login to the desktop** (if not already set):

```bash
sudo raspi-config
```

Go to **System Options → Boot / Auto Login → Desktop Autologin**. This ensures the graphical session starts on boot without a password prompt.

**2. Create the autostart entry:**

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/magicmirror.desktop << EOF
[Desktop Entry]
Type=Application
Name=MagicMirror
Exec=bash -c "cd ~/MagicMirror && DISPLAY=:0 npm run start"
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
```

MagicMirror² will now launch automatically whenever the desktop session starts.

**3. (Optional) Hide the mouse cursor:**

On a mirror display you don't want a cursor sitting on screen. Install `unclutter`:

```bash
sudo apt install -y unclutter
cat >> ~/.config/autostart/unclutter.desktop << EOF
[Desktop Entry]
Type=Application
Name=Unclutter
Exec=unclutter -idle 0.1 -root
Hidden=false
EOF
```

---

### Verify everything is running

```bash
sudo systemctl status buffpenguin        # backend API
sudo systemctl status buffpenguin-web    # web app server
```

MagicMirror² status can be checked by looking at the display, or by checking its log:

```bash
journalctl -u display-manager -n 30 --no-pager
```

---

### Internationalization (i18n)

BuffPenguin supports **English** and **German**. The language can be switched:

- **Web app** — use the EN/DE dropdown in the header. The choice is saved in `localStorage`.
- **Mirror modules** — each module loads translations from its own `translations/` folder, using the MagicMirror² language setting.
- **Backend** — serves translated muscle group and exercise names via `GET /api/v1/i18n/:locale` (e.g. `/api/v1/i18n/de`).

To add a new language, create a new JSON file in each translation directory (`packages/backend/src/i18n/`, `packages/web/i18n/`, and the `translations/` folders in each mirror module) following the existing `en.json` / `de.json` structure.

---

### Adding custom exercises

The `db:seed-exercises` step above pre-loads ~70 common exercises from the included reference list, covering chest, back, shoulders, quadriceps, hamstrings, biceps, and triceps. The mobile app and web app will show these in their exercise pickers immediately.

**Easiest way — use the web app:**

Open the **Exercises** tab in `packages/web/index.html`, type a name, tick the muscle groups it targets (selecting primary or secondary for each), and click **Save Exercise**.

**Via the API directly:**

```bash
# List available muscle groups to get their IDs
curl http://localhost:3000/api/v1/muscle-groups

# Create a custom exercise (replace muscle group IDs as needed)
curl -X POST http://localhost:3000/api/v1/exercises \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Custom Exercise",
    "muscle_groups": [
      { "id": 2, "role": "primary" },
      { "id": 9, "role": "secondary" }
    ]
  }'
```

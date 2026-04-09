# BuffPenguin

A free, self-hosted gym tracking system for Raspberry Pi. Log workouts, track body weight and calories from your browser, and see your training freshness on a magic mirror display.

## Components

| Component | Technology | Location |
|---|---|---|
| Backend API | Node.js + TypeScript + Fastify + SQLite | `packages/backend` |
| Web App | Plain HTML / CSS / JS (ES modules) | `packages/web` |
| Muscle Freshness Module | MagicMirror² module (`MMM-BuffPenguin`) | `packages/mirror-module` |
| Weight Chart Module | MagicMirror² module (`MMM-BuffPenguin-Weight`) | `packages/mirror-module-weight` |
| Calorie Chart Module | MagicMirror² module (`MMM-BuffPenguin-Calories`) | `packages/mirror-module-calories` |

**Backend** — REST API (port 3000) storing workouts, body weight, and calorie entries in SQLite. Serves muscle group freshness data, i18n translations (English/German), and all CRUD endpoints.

**Web App** — Browser-based UI for logging workouts, managing exercises with muscle group mappings, tracking body weight and calorie intake. Supports EN/DE language switching. No build step — serve the static files or open `index.html` directly.

**Mirror Modules** — Three MagicMirror² modules: a colour-coded muscle freshness overlay, a body weight line chart (90 days), and a calorie intake vs TDEE chart (30 days) with five activity level reference lines.

---

## Prerequisites

- Raspberry Pi 4 (2 GB+ RAM) with Raspberry Pi OS 64-bit
- Node.js 22 LTS:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs git
  ```
- MagicMirror² — [installation guide](https://docs.magicmirror.builders/getting-started/installation.html)

> **Windows:** The backend and MagicMirror² also run on Windows. See Windows-specific notes in each section.

---

## Installation

### 1. Clone and build

```bash
git clone https://github.com/Pommelopium/BuffPenguin.git
cd BuffPenguin
npm install
npm run build --workspace=packages/backend
```

> **Windows:** `better-sqlite3` needs native compilation. Usually a pre-built binary is downloaded automatically. If it fails, install "Desktop development with C++" from the [Visual Studio installer](https://visualstudio.microsoft.com/downloads/).

### 2. Set up the database

```bash
cd packages/backend
npx drizzle-kit push
npm run db:seed
npm run db:seed-exercises
cd ../..
```

To start fresh (deletes all data and re-seeds):

```bash
npm run db:reset --workspace=packages/backend
```

Verify the backend works:

```bash
npm run dev --workspace=packages/backend
# http://localhost:3000/health should return {"status":"ok"}
```

### 3. Web app

Open `packages/web/index.html` in a browser, go to Settings, enter the backend URL (`http://localhost:3000` or `http://raspberrypi.local:3000`), and save.

To serve it over the network:

```bash
npx serve packages/web -p 3001
```

**Tabs:** Workouts (log sets, browse history), Exercises (view/create with muscle group mappings), Weight (log body weight), Calories (log daily intake), Settings (backend URL).

### 4. Mirror modules

Symlink all three modules into your MagicMirror² modules folder:

**Linux:**
```bash
ln -s ~/BuffPenguin/packages/mirror-module ~/MagicMirror/modules/MMM-BuffPenguin
ln -s ~/BuffPenguin/packages/mirror-module-weight ~/MagicMirror/modules/MMM-BuffPenguin-Weight
ln -s ~/BuffPenguin/packages/mirror-module-calories ~/MagicMirror/modules/MMM-BuffPenguin-Calories
```

**Windows (PowerShell):**
```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\MagicMirror\modules\MMM-BuffPenguin" -Target "$env:USERPROFILE\BuffPenguin\packages\mirror-module"
New-Item -ItemType Junction -Path "$env:USERPROFILE\MagicMirror\modules\MMM-BuffPenguin-Weight" -Target "$env:USERPROFILE\BuffPenguin\packages\mirror-module-weight"
New-Item -ItemType Junction -Path "$env:USERPROFILE\MagicMirror\modules\MMM-BuffPenguin-Calories" -Target "$env:USERPROFILE\BuffPenguin\packages\mirror-module-calories"
```

Add to your MagicMirror² `config/config.js`:

```js
{
  module: "MMM-BuffPenguin",
  position: "bottom_left",
  config: {
    backendUrl: "http://localhost:3000",
    updateInterval: 60000,
    lookbackDays: 14,
    anatomySex: "male"       // "male" or "female"
  }
},
{
  module: "MMM-BuffPenguin-Weight",
  position: "bottom_right",
  config: {
    backendUrl: "http://localhost:3000",
    updateInterval: 3600000,
    lookbackDays: 90,
  }
},
{
  module: "MMM-BuffPenguin-Calories",
  position: "bottom_right",
  config: {
    backendUrl: "http://localhost:3000",
    updateInterval: 3600000,
    lookbackDays: 30,
    yearOfBirth: 1990,
    heightCm: 180,
    sex: "male",             // "male" or "female"
  }
}
```

> **Note:** The muscle overlay SVG (`packages/mirror-module/assets/muscle-overlay.svg`) contains placeholder shapes. For accurate highlighting, open it in [Inkscape](https://inkscape.org/) and draw body region outlines. Each path needs `id="[slug]"` and `class="muscle-region"` — slugs are listed in `CLAUDE.md`.

---

## Autostart on Boot (Raspberry Pi)

Three services need to run on boot: the backend API, the web app file server, and MagicMirror².

**1. Enable desktop auto-login** (needed for MagicMirror²):

```bash
sudo raspi-config
# → System Options → Boot / Auto Login → Desktop Autologin
```

**2. Run the setup script** — creates both systemd services and the MagicMirror² desktop autostart entry:

```bash
# Backend API service
sed "s/YOUR_USERNAME/$(whoami)/g" packages/backend/systemd/buffpenguin.service \
  | sudo tee /etc/systemd/system/buffpenguin.service

# Web app file server service
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

# Enable and start both services
sudo systemctl daemon-reload
sudo systemctl enable --now buffpenguin buffpenguin-web

# MagicMirror² desktop autostart
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

# (Optional) Hide mouse cursor on mirror display
sudo apt install -y unclutter
cat > ~/.config/autostart/unclutter.desktop << EOF
[Desktop Entry]
Type=Application
Name=Unclutter
Exec=unclutter -idle 0.1 -root
Hidden=false
EOF
```

**3. Verify:**

```bash
sudo systemctl status buffpenguin        # backend API on :3000
sudo systemctl status buffpenguin-web    # web app on :3001
```

MagicMirror² starts with the desktop session — check the display or `journalctl -u display-manager -n 30`.

> **Windows:** Use [NSSM](https://nssm.cc/) to run the backend and web server as Windows Services, or add Task Scheduler entries. For development, `npm run dev --workspace=packages/backend` is sufficient.

---

## Internationalization

BuffPenguin supports **English** and **German**.

- **Web app** — EN/DE dropdown in the header, saved in `localStorage`.
- **Mirror modules** — use the MagicMirror² language setting, translations in each module's `translations/` folder.
- **Backend** — `GET /api/v1/i18n/:locale` serves translated muscle group and exercise names.

To add a language, create a new JSON file in `packages/backend/src/i18n/`, `packages/web/i18n/`, and each mirror module's `translations/` folder following the `en.json` / `de.json` structure.

---

## Adding Custom Exercises

The seed step pre-loads ~70 common exercises. To add more:

**Web app:** Open the Exercises tab, enter a name, select muscle groups (primary/secondary), and save.

**API:**
```bash
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

Use `GET /api/v1/muscle-groups` to find muscle group IDs.

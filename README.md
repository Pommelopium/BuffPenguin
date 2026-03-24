# BuffPenguin

A free, self-hosted gym tracking system designed to run at home on a Raspberry Pi. Log your workouts from your phone and see which muscle groups you've trained recently — displayed on a magic mirror in your gym.

## What it does

BuffPenguin is made up of three components:

**1. Magic Mirror Display** — A high-contrast view (white on black) that shows which muscle groups you have trained in your recent sessions, colour-coded by how long ago you last worked them. This runs on a Raspberry Pi connected to a screen mounted behind a one-sided mirror, so the display is visible through the mirror while the screen itself stays hidden.

**2. Mobile App** — An iOS and Android app where you log your workouts: which exercises you performed, how many sets and reps, and the weight used. The app discovers the backend automatically when your phone is on the same Wi-Fi network as the Pi, and only syncs data locally — no internet connection or cloud account required.

**3. Backend & Database** — A REST API server running on the same Raspberry Pi as the mirror display. It receives workout data from the mobile app, stores it in a local SQLite database, and serves the muscle group history to the mirror display.

## Who it's for

Anyone who wants to build this setup at home. The whole system runs locally on a Raspberry Pi — no subscriptions, no cloud services, no account needed. If you have a Pi, a spare monitor, a one-sided mirror sheet, and a phone, you have everything required.

## Components

| Component | Technology | Runs on |
|---|---|---|
| Mirror display | MagicMirror² module | Raspberry Pi |
| Mobile app | Flutter (iOS & Android) | Your phone |
| Backend API | Node.js + TypeScript + Fastify | Raspberry Pi |
| Database | SQLite | Raspberry Pi |

---

## Installation

### Prerequisites

**Raspberry Pi**
- Raspberry Pi 4 (2 GB RAM or more recommended)
- Raspberry Pi OS 64-bit (Bookworm / Debian 12)
- Node.js 20 LTS — install via [NodeSource](https://github.com/nodesource/distributions):
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  ```
- Git:
  ```bash
  sudo apt install -y git
  ```
- MagicMirror² — follow the [official installation guide](https://docs.magicmirror.builders/getting-started/installation.html)

**Development machine (for the mobile app)**
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (3.x or later)
- Android Studio or Xcode depending on your target platform

---

### 1. Clone the repository

Run this on the Raspberry Pi:

```bash
git clone https://github.com/Pommelopium/BuffPenguin.git
cd BuffPenguin
```

---

### 2. Backend (Raspberry Pi)

Install dependencies and build:

```bash
npm install
npm run build --workspace=packages/backend
```

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

**Run as a background service** so the backend starts automatically on boot:

```bash
sudo cp packages/backend/systemd/buffpenguin.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable buffpenguin
sudo systemctl start buffpenguin
```

Check it is running:

```bash
sudo systemctl status buffpenguin
```

---

### 3. Magic Mirror Module (Raspberry Pi)

Symlink the module into your MagicMirror² modules folder:

```bash
ln -s ~/BuffPenguin/packages/mirror-module ~/MagicMirror/modules/MMM-BuffPenguin
```

Add the module to your MagicMirror² config file (`~/MagicMirror/config/config.js`):

```js
{
  module: "MMM-BuffPenguin",
  position: "bottom_left",
  config: {
    backendUrl: "http://localhost:3000",
    updateInterval: 60000,   // refresh every 60 seconds
    lookbackDays: 14         // show training history for the past 14 days
  }
}
```

Then restart MagicMirror²:

```bash
cd ~/MagicMirror && npm run start
```

> **Note:** The muscle overlay SVG (`packages/mirror-module/assets/muscle-overlay.svg`) currently contains placeholder shapes. For accurate muscle region highlighting, open the file in [Inkscape](https://inkscape.org/) and draw the actual body region outlines over the silhouette. Each path needs `id="[slug]"` and `class="muscle-region"` — the slugs are listed in `CLAUDE.md`.

---

### 4. Mobile App (your phone)

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

### Adding custom exercises

The `db:seed-exercises` step above pre-loads ~70 common exercises from the included reference list, covering chest, back, shoulders, quadriceps, hamstrings, biceps, and triceps. The mobile app will show these in its exercise picker immediately.

If you want to add extra exercises, use the API:

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

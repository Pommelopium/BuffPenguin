# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BuffPenguin is a self-hosted gym tracking system designed to run on a Raspberry Pi. It consists of three components:

1. **Backend** (`packages/backend`) — Node.js/TypeScript REST API (Fastify + Drizzle ORM + SQLite)
2. **Mirror Module** (`packages/mirror-module`) — MagicMirror² module (`MMM-BuffPenguin`) that shows muscle group training freshness
3. **Mobile App** (`packages/mobile`) — Flutter app (iOS/Android) for logging workouts

The mobile app discovers the backend via mDNS on the local network (`_buffpenguin._tcp`) and only communicates when both devices are on the same network.

## Commands

### Backend

```bash
# Install all workspace dependencies (run from repo root)
npm install

# Development (hot reload)
npm run dev --workspace=packages/backend

# Build TypeScript → dist/
npm run build --workspace=packages/backend

# Apply DB schema (first time or after schema changes)
cd packages/backend && npx drizzle-kit push

# Seed muscle group data
npm run db:seed --workspace=packages/backend

# Generate migration files from schema changes
cd packages/backend && npx drizzle-kit generate
```

### Flutter (Mobile)

```bash
cd packages/mobile

# Get dependencies
flutter pub get

# Run on connected device/emulator
flutter run

# Build release APK
flutter build apk --release

# Build iOS
flutter build ios --release
```

### Mirror Module

No build step — plain JavaScript. Symlink into MagicMirror² modules directory:
```bash
ln -s /path/to/BuffPenguin/packages/mirror-module ~/MagicMirror/modules/MMM-BuffPenguin
```

MagicMirror² `config/config.js` entry:
```js
{ module: "MMM-BuffPenguin", position: "bottom_left", config: { backendUrl: "http://localhost:3000", updateInterval: 60000, lookbackDays: 14 } }
```

## Architecture

### Backend (`packages/backend/src/`)

- `index.ts` — Fastify server bootstrap; registers all route plugins, starts mDNS after listen
- `db/schema.ts` — Drizzle schema (single source of truth for DB types and migrations). Tables: `muscle_groups`, `exercises`, `exercise_muscle_groups`, `workout_sessions`, `workout_sets`
- `db/client.ts` — Singleton `better-sqlite3` + Drizzle connection; reads `DB_PATH` env var
- `db/seed.ts` — Seeds the 50 muscle groups (run once after first `drizzle-kit push`)
- `routes/muscleGroups.ts` — The `/api/v1/muscle-groups/freshness` endpoint is the most critical: it joins sets → exercises → exercise_muscle_groups → muscle_groups and computes a `freshness` bucket (`today`, `recent`, `moderate`, `stale`, `untrained`) for each muscle group
- `mdns.ts` — Advertises `_buffpenguin._tcp.local.` using `@homebridge/ciao` (pure TypeScript, no avahi-daemon needed)

API base path: `/api/v1`. Health check (no prefix): `GET /health`.

### Mirror Module (`packages/mirror-module/`)

Standard MagicMirror² module split:
- `MMM-BuffPenguin.js` — Browser-side: renders DOM, applies CSS freshness classes to SVG `<path>` elements by slug ID
- `node_helper.js` — Server-side: loads SVG from disk, polls backend `/muscle-groups/freshness`, sends data to browser via MM2 socket notifications
- `assets/muscle-overlay.svg` — The SVG with `class="muscle-region"` and `id="[slug]"` on each region. **This file contains placeholder ellipses and must be refined in Inkscape** with accurate anatomical polygon paths

Freshness CSS classes applied to `.muscle-region` paths: `today`, `recent`, `moderate`, `stale`, `untrained`.

### Flutter App (`packages/mobile/lib/`)

- `main.dart` → `app.dart` — Entry point, ProviderScope + MaterialApp.router (GoRouter)
- `services/discovery_service.dart` — mDNS discovery via `multicast_dns` package. Queries `_buffpenguin._tcp`, resolves PTR→SRV→A, verifies `/health`. Falls back to cached URL in SharedPreferences, then manual entry
- `services/api_client.dart` — Dio-based HTTP client; base URL set per discovered server
- `providers/server_provider.dart` — `serverUrlProvider` (StateProvider), `apiClientProvider`, `serverDiscoveryProvider` (FutureProvider)
- Screens: `discovery_screen` (shown until server found) → `home_screen` (start/resume session, history list) → `log_set_screen` (pick exercise, enter reps/weight, log set) → `history_screen` (session detail) → `settings_screen` (manual IP override)

## Pi Deployment

1. Copy `packages/backend/systemd/buffpenguin.service` to `/etc/systemd/system/`
2. `sudo systemctl enable --now buffpenguin`
3. Symlink mirror module into `~/MagicMirror/modules/`
4. Flutter APK is built on a dev machine and sideloaded

## SVG Overlay Note

`packages/mirror-module/assets/muscle-overlay.svg` currently contains **placeholder ellipses** for each muscle group region. For the mirror display to look correct, open this file in Inkscape, draw accurate polygon paths over the silhouette, and ensure each path has `id="[slug]"` and `class="muscle-region"`.

The 50 slugs (25 anterior, 25 posterior):

**Front:** `sternocleidomastoid`, `pectoralis-major-upper`, `pectoralis-major-lower`, `serratus-anterior`, `anterior-deltoid`, `lateral-deltoid`, `biceps-brachii`, `brachialis`, `brachioradialis`, `forearm-flexors`, `rectus-abdominis`, `external-obliques`, `internal-obliques`, `transversus-abdominis`, `iliopsoas`, `tensor-fasciae-latae`, `sartorius`, `rectus-femoris`, `vastus-lateralis`, `vastus-medialis`, `adductor-magnus`, `adductor-longus`, `gracilis`, `tibialis-anterior`, `peroneus-longus`

**Back:** `upper-trapezius`, `middle-trapezius`, `lower-trapezius`, `rhomboids`, `posterior-deltoid`, `infraspinatus`, `teres-minor`, `teres-major`, `subscapularis`, `latissimus-dorsi`, `triceps-long-head`, `triceps-lateral-head`, `forearm-extensors`, `erector-spinae`, `multifidus`, `quadratus-lumborum`, `gluteus-maximus`, `gluteus-medius`, `gluteus-minimus`, `piriformis`, `biceps-femoris`, `semitendinosus`, `semimembranosus`, `gastrocnemius`, `soleus`

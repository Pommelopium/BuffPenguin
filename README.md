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

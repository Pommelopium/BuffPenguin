// index.ts — Server entry point.
// Bootstraps the Fastify HTTP server, registers all route plugins,
// and starts mDNS advertisement so mobile clients can discover this server
// on the local network without manual IP configuration.

import Fastify from "fastify";           // external: Fastify web framework
import cors from "@fastify/cors";        // external: Fastify CORS plugin (allows mobile app cross-origin requests)
import { healthRoutes } from "./routes/health.js";
import { workoutRoutes } from "./routes/workouts.js";
import { exerciseRoutes } from "./routes/exercises.js";
import { muscleGroupRoutes } from "./routes/muscleGroups.js";
import { i18nRoutes } from "./routes/i18n.js";
import { weightRoutes } from "./routes/weight.js";
import { calorieRoutes } from "./routes/calories.js";
import { advertiseMdns } from "./mdns.js";

// Create the Fastify instance with built-in pino logger enabled.
// Logs are written to stdout and picked up by systemd on the Pi.
const app = Fastify({ logger: true });

// Allow any origin — the mobile app and mirror module both call this API
// from different hosts on the local network.
await app.register(cors, { origin: true });

// Health check lives at /health (no prefix) so the mobile app can verify
// the server before committing to a base URL during mDNS discovery.
await app.register(healthRoutes);

// All data routes live under /api/v1 to allow future versioning.
await app.register(workoutRoutes, { prefix: "/api/v1" });
await app.register(exerciseRoutes, { prefix: "/api/v1" });
await app.register(muscleGroupRoutes, { prefix: "/api/v1" });
await app.register(i18nRoutes, { prefix: "/api/v1" });
await app.register(weightRoutes, { prefix: "/api/v1" });
await app.register(calorieRoutes, { prefix: "/api/v1" });

// Read port from environment so the systemd service file can override it
// without changing code. Defaults to 3000.
const port = parseInt(process.env.PORT ?? "3000", 10);

// Bind to 0.0.0.0 so the server is reachable from other devices on the LAN,
// not just from localhost.
await app.listen({ port, host: "0.0.0.0" });
console.log(`BuffPenguin backend listening on port ${port}`);

// Start mDNS advertisement after the server is confirmed listening,
// so the advertised port is guaranteed to be active.
advertiseMdns(port);

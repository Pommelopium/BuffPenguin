import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { workoutRoutes } from "./routes/workouts.js";
import { exerciseRoutes } from "./routes/exercises.js";
import { muscleGroupRoutes } from "./routes/muscleGroups.js";
import { advertiseMdns } from "./mdns.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

await app.register(healthRoutes);
await app.register(workoutRoutes, { prefix: "/api/v1" });
await app.register(exerciseRoutes, { prefix: "/api/v1" });
await app.register(muscleGroupRoutes, { prefix: "/api/v1" });

const port = parseInt(process.env.PORT ?? "3000", 10);

await app.listen({ port, host: "0.0.0.0" });
console.log(`BuffPenguin backend listening on port ${port}`);

advertiseMdns(port);

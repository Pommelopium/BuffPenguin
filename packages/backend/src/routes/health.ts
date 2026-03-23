// health.ts — Health check route.
// Exposes GET /health (no /api/v1 prefix) so the mobile app can verify
// it has found a BuffPenguin server before caching the URL and navigating
// to the home screen. Also used by the mDNS discovery flow to confirm
// that a resolved address is actually serving this API.

import type { FastifyInstance } from "fastify"; // external: Fastify type definitions

export async function healthRoutes(app: FastifyInstance) {
  // Returns a fixed JSON response. The mobile app checks that
  // `status === "ok"` to confirm the server is a BuffPenguin backend.
  app.get("/health", async () => {
    return { status: "ok", version: "1.0.0" };
  });
}

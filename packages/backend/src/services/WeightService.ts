// WeightService.ts — Business logic for body weight tracking.

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "../db/schema.js";
import { bodyWeight } from "../db/schema.js";
import { eq, desc, gte, lte, and } from "drizzle-orm";

export class WeightService {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  create(weightKg: number, notes?: string, recordedAt?: number) {
    const ts = recordedAt ?? Math.floor(Date.now() / 1000);
    return this.db
      .insert(bodyWeight)
      .values({ weightKg, recordedAt: ts, notes: notes ?? null })
      .returning()
      .get();
  }

  getAll(from?: number, to?: number) {
    const conditions = [];
    if (from) conditions.push(gte(bodyWeight.recordedAt, from));
    if (to) conditions.push(lte(bodyWeight.recordedAt, to));

    const query = this.db
      .select()
      .from(bodyWeight)
      .orderBy(desc(bodyWeight.recordedAt));

    if (conditions.length > 0) {
      return query.where(and(...conditions)).all();
    }
    return query.all();
  }

  getLatest() {
    return this.db
      .select()
      .from(bodyWeight)
      .orderBy(desc(bodyWeight.recordedAt))
      .limit(1)
      .get() ?? null;
  }

  update(id: number, weightKg: number, notes?: string) {
    return this.db
      .update(bodyWeight)
      .set({ weightKg, notes: notes ?? null })
      .where(eq(bodyWeight.id, id))
      .returning()
      .get() ?? null;
  }

  delete(id: number) {
    const result = this.db
      .delete(bodyWeight)
      .where(eq(bodyWeight.id, id))
      .returning()
      .get();
    return result ?? null;
  }
}

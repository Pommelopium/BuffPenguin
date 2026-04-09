// CalorieService.ts — Business logic for calorie tracking.

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "../db/schema.js";
import { calorieEntries } from "../db/schema.js";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";

export class CalorieService {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  create(calories: number, date: string, notes?: string) {
    const now = Math.floor(Date.now() / 1000);
    return this.db
      .insert(calorieEntries)
      .values({ calories, date, notes: notes ?? null, recordedAt: now })
      .returning()
      .get();
  }

  getRange(from?: string, to?: string) {
    const conditions = [];
    if (from) conditions.push(gte(calorieEntries.date, from));
    if (to) conditions.push(lte(calorieEntries.date, to));

    const query = this.db
      .select()
      .from(calorieEntries)
      .orderBy(desc(calorieEntries.date), desc(calorieEntries.recordedAt));

    if (conditions.length > 0) {
      return query.where(and(...conditions)).all();
    }
    return query.all();
  }

  getDailySums(from?: string, to?: string) {
    const conditions = [];
    if (from) conditions.push(gte(calorieEntries.date, from));
    if (to) conditions.push(lte(calorieEntries.date, to));

    const query = this.db
      .select({
        date: calorieEntries.date,
        totalCalories: sql<number>`sum(${calorieEntries.calories})`.as("total_calories"),
      })
      .from(calorieEntries)
      .groupBy(calorieEntries.date)
      .orderBy(calorieEntries.date);

    if (conditions.length > 0) {
      return query.where(and(...conditions)).all();
    }
    return query.all();
  }

  update(id: number, calories: number, notes?: string) {
    return this.db
      .update(calorieEntries)
      .set({ calories, notes: notes ?? null })
      .where(eq(calorieEntries.id, id))
      .returning()
      .get() ?? null;
  }

  delete(id: number) {
    const result = this.db
      .delete(calorieEntries)
      .where(eq(calorieEntries.id, id))
      .returning()
      .get();
    return result ?? null;
  }
}

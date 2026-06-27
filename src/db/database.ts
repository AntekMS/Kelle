import * as SQLite from 'expo-sqlite';
import type { Dish, Ingredient } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('kuechen_coach.db');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = getDb();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS dishes (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS cooked_history (
      dish_id TEXT NOT NULL,
      cooked_at TEXT NOT NULL
    );
  `);
}

export async function seedDishes(dishes: Dish[]): Promise<void> {
  const database = getDb();
  await database.withTransactionAsync(async () => {
    for (const dish of dishes) {
      await database.runAsync(
        'INSERT OR REPLACE INTO dishes (id, data, updated_at) VALUES (?, ?, ?)',
        dish.id,
        JSON.stringify(dish),
        new Date().toISOString()
      );
    }
  });
}

export async function seedIngredients(ingredients: Ingredient[]): Promise<void> {
  const database = getDb();
  await database.withTransactionAsync(async () => {
    for (const ingredient of ingredients) {
      await database.runAsync(
        'INSERT OR REPLACE INTO ingredients (id, data, updated_at) VALUES (?, ?, ?)',
        ingredient.id,
        JSON.stringify(ingredient),
        new Date().toISOString()
      );
    }
  });
}

export async function getAllDishes(): Promise<Dish[]> {
  const database = getDb();
  const rows = await database.getAllAsync<{ data: string }>('SELECT data FROM dishes');
  return rows.map((row) => JSON.parse(row.data) as Dish);
}

export async function getAllIngredients(): Promise<Ingredient[]> {
  const database = getDb();
  const rows = await database.getAllAsync<{ data: string }>('SELECT data FROM ingredients');
  return rows.map((row) => JSON.parse(row.data) as Ingredient);
}

export async function getDishById(id: string): Promise<Dish | null> {
  const database = getDb();
  const row = await database.getFirstAsync<{ data: string }>(
    'SELECT data FROM dishes WHERE id = ?',
    id
  );
  return row ? (JSON.parse(row.data) as Dish) : null;
}

export async function markDishCooked(dishId: string): Promise<void> {
  const database = getDb();
  await database.runAsync(
    'INSERT INTO cooked_history (dish_id, cooked_at) VALUES (?, ?)',
    dishId,
    new Date().toISOString()
  );
}

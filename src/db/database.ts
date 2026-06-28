import * as SQLite from 'expo-sqlite';
import type { Dish, Ingredient, ShoppingItem, ShoppingList } from '../types';

const SCHEMA_VERSION = 2;
const ACTIVE_LIST_ID = 'active';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('kuechen_coach.db');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = getDb();

  // Base tables that never change
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
    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM _meta WHERE key = 'schema_version'"
  );
  const current = row ? parseInt(row.value, 10) : 0;

  if (current < SCHEMA_VERSION) {
    await runMigrations(database, current);
  }
}

async function runMigrations(
  database: SQLite.SQLiteDatabase,
  fromVersion: number
): Promise<void> {
  if (fromVersion < 2) {
    // Drop old single-dish shopping tables, build multi-dish schema
    await database.execAsync(`
      DROP TABLE IF EXISTS shopping_items;
      DROP TABLE IF EXISTS shopping_lists;
    `);
    await database.execAsync(`
      CREATE TABLE shopping_lists (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );
      CREATE TABLE shopping_list_dishes (
        list_id TEXT NOT NULL,
        dish_id TEXT NOT NULL,
        dish_name TEXT NOT NULL,
        PRIMARY KEY (list_id, dish_id)
      );
      CREATE TABLE shopping_source_items (
        list_id TEXT NOT NULL,
        dish_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        amount_base REAL NOT NULL,
        PRIMARY KEY (list_id, dish_id, ingredient_id)
      );
      CREATE TABLE shopping_items (
        id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        ingredient_name TEXT NOT NULL,
        amount_base REAL NOT NULL,
        base_unit TEXT NOT NULL,
        aisle_category TEXT NOT NULL,
        is_pantry_staple INTEGER NOT NULL DEFAULT 0,
        is_checked INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  await database.runAsync(
    "INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)",
    String(SCHEMA_VERSION)
  );
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

// ─── Shopping list helpers ───────────────────────────────────────────────────

export function normalizeToBase(amount: number, unit: string, ing: Ingredient): number {
  if (unit === ing.base_unit) return amount;
  const factor = ing.unit_conversions[unit];
  return factor != null ? amount * factor : amount;
}

// Only for use in tests — resets the SQLite singleton so mocks work per-test
export function _resetDbForTests(): void {
  db = null;
}

async function recalculateItems(
  database: SQLite.SQLiteDatabase,
  listId: string,
  ingredientMap: Map<string, Ingredient>
): Promise<void> {
  // Preserve checked state before recomputing
  const checkedRows = await database.getAllAsync<{ ingredient_id: string }>(
    'SELECT ingredient_id FROM shopping_items WHERE list_id = ? AND is_checked = 1',
    listId
  );
  const checked = new Set(checkedRows.map((r) => r.ingredient_id));

  const agg = await database.getAllAsync<{ ingredient_id: string; total_base: number }>(
    'SELECT ingredient_id, SUM(amount_base) as total_base FROM shopping_source_items WHERE list_id = ? GROUP BY ingredient_id',
    listId
  );

  await database.runAsync('DELETE FROM shopping_items WHERE list_id = ?', listId);

  for (const { ingredient_id, total_base } of agg) {
    const ing = ingredientMap.get(ingredient_id);
    if (!ing) continue;
    await database.runAsync(
      `INSERT INTO shopping_items
        (id, list_id, ingredient_id, ingredient_name, amount_base, base_unit, aisle_category, is_pantry_staple, is_checked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `${listId}:${ingredient_id}`,
      listId,
      ingredient_id,
      ing.name,
      total_base,
      ing.base_unit,
      ing.aisle_category,
      ing.is_pantry_staple ? 1 : 0,
      checked.has(ingredient_id) ? 1 : 0
    );
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getOrCreateActiveList(): Promise<string> {
  const database = getDb();
  const row = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM shopping_lists WHERE id = ?',
    ACTIVE_LIST_ID
  );
  if (!row) {
    await database.runAsync(
      'INSERT INTO shopping_lists (id, created_at) VALUES (?, ?)',
      ACTIVE_LIST_ID,
      new Date().toISOString()
    );
  }
  return ACTIVE_LIST_ID;
}

export async function getActiveDishIds(): Promise<string[]> {
  const database = getDb();
  const rows = await database.getAllAsync<{ dish_id: string }>(
    'SELECT dish_id FROM shopping_list_dishes WHERE list_id = ?',
    ACTIVE_LIST_ID
  );
  return rows.map((r) => r.dish_id);
}

export async function addDishToList(
  dish: Dish,
  ingredientMap: Map<string, Ingredient>
): Promise<void> {
  const database = getDb();
  await getOrCreateActiveList();

  await database.runAsync(
    'INSERT OR REPLACE INTO shopping_list_dishes (list_id, dish_id, dish_name) VALUES (?, ?, ?)',
    ACTIVE_LIST_ID,
    dish.id,
    dish.name
  );

  // Upsert source items for this dish
  for (const di of dish.ingredients) {
    const ing = ingredientMap.get(di.ingredient_id);
    if (!ing) continue;
    const base = normalizeToBase(di.amount, di.unit, ing);
    await database.runAsync(
      'INSERT OR REPLACE INTO shopping_source_items (list_id, dish_id, ingredient_id, amount_base) VALUES (?, ?, ?, ?)',
      ACTIVE_LIST_ID,
      dish.id,
      di.ingredient_id,
      base
    );
  }

  await recalculateItems(database, ACTIVE_LIST_ID, ingredientMap);
}

export async function removeDishFromList(
  dishId: string,
  ingredientMap: Map<string, Ingredient>
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    'DELETE FROM shopping_source_items WHERE list_id = ? AND dish_id = ?',
    ACTIVE_LIST_ID,
    dishId
  );
  await database.runAsync(
    'DELETE FROM shopping_list_dishes WHERE list_id = ? AND dish_id = ?',
    ACTIVE_LIST_ID,
    dishId
  );
  await recalculateItems(database, ACTIVE_LIST_ID, ingredientMap);
}

export async function getActiveShoppingList(): Promise<ShoppingList | null> {
  const database = getDb();
  const listRow = await database.getFirstAsync<{ id: string; created_at: string }>(
    'SELECT id, created_at FROM shopping_lists WHERE id = ?',
    ACTIVE_LIST_ID
  );
  if (!listRow) return null;

  const dishRows = await database.getAllAsync<{ dish_id: string; dish_name: string }>(
    'SELECT dish_id, dish_name FROM shopping_list_dishes WHERE list_id = ?',
    ACTIVE_LIST_ID
  );
  if (dishRows.length === 0) return null;

  const itemRows = await database.getAllAsync<{
    id: string; list_id: string; ingredient_id: string; ingredient_name: string;
    amount_base: number; base_unit: string; aisle_category: string;
    is_pantry_staple: number; is_checked: number;
  }>(
    'SELECT id, list_id, ingredient_id, ingredient_name, amount_base, base_unit, aisle_category, is_pantry_staple, is_checked FROM shopping_items WHERE list_id = ?',
    ACTIVE_LIST_ID
  );

  return {
    id: listRow.id,
    created_at: listRow.created_at,
    dishes: dishRows,
    items: itemRows.map((row): ShoppingItem => ({
      id: row.id,
      list_id: row.list_id,
      ingredient_id: row.ingredient_id,
      ingredient_name: row.ingredient_name,
      amount_base: row.amount_base,
      base_unit: row.base_unit as 'g' | 'ml',
      aisle_category: row.aisle_category,
      is_pantry_staple: row.is_pantry_staple === 1,
      is_checked: row.is_checked === 1,
    })),
  };
}

export async function toggleShoppingItem(itemId: string): Promise<void> {
  const database = getDb();
  await database.runAsync(
    'UPDATE shopping_items SET is_checked = CASE WHEN is_checked = 1 THEN 0 ELSE 1 END WHERE id = ?',
    itemId
  );
}

export async function clearActiveShoppingList(): Promise<void> {
  const database = getDb();
  await database.runAsync('DELETE FROM shopping_list_dishes WHERE list_id = ?', ACTIVE_LIST_ID);
  await database.runAsync('DELETE FROM shopping_source_items WHERE list_id = ?', ACTIVE_LIST_ID);
  await database.runAsync('DELETE FROM shopping_items WHERE list_id = ?', ACTIVE_LIST_ID);
}

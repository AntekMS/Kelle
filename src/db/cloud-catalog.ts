import { supabase } from '../lib/supabase';
import type { Dish, Ingredient } from '../types';

export async function fetchDishesFromCloud(): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('data');

  if (error) throw new Error(`Supabase dishes: ${error.message}`);
  return (data ?? []).map((row: { data: Dish }) => row.data);
}

export async function fetchIngredientsFromCloud(): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('data');

  if (error) throw new Error(`Supabase ingredients: ${error.message}`);
  return (data ?? []).map((row: { data: Ingredient }) => row.data);
}

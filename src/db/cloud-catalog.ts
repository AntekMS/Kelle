import { supabase } from '../lib/supabase';
import type { Dish, Ingredient } from '../types';

export async function fetchDishesFromCloud(): Promise<Dish[]> {
  if (!supabase) throw new Error('Supabase nicht konfiguriert');
  const { data, error } = await supabase
    .from('dishes')
    .select('data');

  if (error) throw new Error(`Supabase dishes: ${error.message}`);
  return (data ?? []).map((row: { data: Dish }) => row.data);
}

export async function fetchIngredientsFromCloud(): Promise<Ingredient[]> {
  if (!supabase) throw new Error('Supabase nicht konfiguriert');
  const { data, error } = await supabase
    .from('ingredients')
    .select('data');

  if (error) throw new Error(`Supabase ingredients: ${error.message}`);
  return (data ?? []).map((row: { data: Ingredient }) => row.data);
}

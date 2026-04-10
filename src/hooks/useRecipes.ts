import { useState, useCallback } from 'react';
import { Recipe } from '../models/types';
import * as DB from '../services/database';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const all = await DB.getAllRecipes();
      setRecipes(all);
    } finally {
      setLoading(false);
    }
  }, []);

  const addRecipe = useCallback(async (recipe: Recipe) => {
    await DB.saveRecipe(recipe);
    setRecipes((prev) => [recipe, ...prev]);
  }, []);

  const updateRecipe = useCallback(async (recipe: Recipe) => {
    await DB.saveRecipe(recipe);
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? recipe : r)));
  }, []);

  const removeRecipe = useCallback(async (id: string) => {
    await DB.deleteRecipe(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { recipes, loading, loadRecipes, addRecipe, updateRecipe, removeRecipe };
}

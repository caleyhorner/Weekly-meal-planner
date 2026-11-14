import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import { RecipeView } from "./recipe-view";

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  return (
    <RecipeView
      recipe={{
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        tags: recipe.tags,
        notes: recipe.notes,
        steps: recipe.steps,
        sourceType: recipe.sourceType,
        sourceLabel: recipe.sourceLabel,
        sourceUrl: recipe.sourceUrl,
        heroImage: recipe.heroImageUrl,
        lastCooked: recipe.lastCooked,
        ingredients: recipe.ingredients.map((i) => ({
          id: i.id,
          group: i.groupLabel,
          item: i.item,
          raw: i.rawText,
          amount: i.amount,
          unit: i.unit,
          prep: i.prepNote,
        })),
        sources: recipe.sources.map((s) => s.url),
      }}
    />
  );
}

import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import { RecipeForm } from "@/components/recipe-form";
import type { Category } from "@/lib/recipe-model";

export default async function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  return (
    <RecipeForm
      recipeId={recipe.id}
      initial={{
        title: recipe.title,
        kind: recipe.kind,
        description: recipe.description,
        servings: recipe.servings,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        tags: recipe.tags,
        notes: recipe.notes,
        steps: recipe.steps,
        ingredients: recipe.ingredients.map((i) => ({
          group: i.groupLabel,
          raw: i.rawText,
          item: i.item,
          amount: i.amount,
          unit: i.unit,
          prep: i.prepNote,
          category: i.category as Category,
        })),
        sourceType: recipe.sourceType,
        sourceLabel: recipe.sourceLabel,
        sourceUrl: recipe.sourceUrl,
        sourceImages: recipe.sources.map((s) => s.url),
        heroImage: recipe.heroImageUrl,
      }}
    />
  );
}

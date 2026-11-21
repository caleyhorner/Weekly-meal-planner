import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import { RecipeView } from "./recipe-view";

export default async function RecipePage({ params, searchParams }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const serves = Number((await searchParams).serves);
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  return (
    <RecipeView
      initialServings={Number.isFinite(serves) && serves > 0 && serves <= 60 ? serves : undefined}
      recipe={{
        id: recipe.id,
        title: recipe.title,
        needsReview: recipe.needsReview,
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

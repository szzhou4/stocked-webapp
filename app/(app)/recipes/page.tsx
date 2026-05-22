import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, ExternalLink, BookOpen, Utensils, CheckCircle2, AlertCircle } from "lucide-react";
import type { Recipe, RecipeIngredient } from "@/lib/types";

type PantryStub = { name: string; quantity: number };

function getMissingCount(ingredients: RecipeIngredient[], pantry: PantryStub[]): number {
  return ingredients.filter((ing) => {
    const ingLower = ing.name.toLowerCase();
    const match = pantry.find(
      (p) => p.name.toLowerCase().includes(ingLower) || ingLower.includes(p.name.toLowerCase())
    );
    return !match || match.quantity <= 0;
  }).length;
}

export default async function RecipesPage() {
  const supabase = await createClient();
  const [{ data: recipesData }, { data: pantryData }] = await Promise.all([
    supabase.from("recipes").select("*, recipe_ingredients(*)").order("created_at", { ascending: false }),
    supabase.from("pantry_items").select("name, quantity, min_quantity, unit"),
  ]);

  const recipes = (recipesData || []) as (Recipe & { recipe_ingredients: RecipeIngredient[] })[];
  const pantry: PantryStub[] = pantryData || [];
  const hasPantry = pantry.length > 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Recipes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} saved
          </p>
        </div>
        <Link
          href="/recipes/new"
          className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-base font-semibold text-gray-900">No recipes yet</p>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Paste a recipe link, photo, or text to get started.
          </p>
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add your first recipe
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => {
            const missingCount = hasPantry ? getMissingCount(recipe.recipe_ingredients, pantry) : null;
            const ready = missingCount === 0;
            return (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="group flex items-center gap-3.5 bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                  <Utensils className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900 truncate">{recipe.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{recipe.servings} servings</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasPantry && missingCount !== null && (
                    ready
                      ? <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={11} /> Ready
                        </span>
                      : <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertCircle size={11} /> {missingCount} missing
                        </span>
                  )}
                  {recipe.source_url && <ExternalLink size={14} className="text-gray-300" />}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

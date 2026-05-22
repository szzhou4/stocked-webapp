import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import type { Recipe } from "@/lib/types";
import LogoutButton from "@/components/logout-button";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  const recipes: Recipe[] = data || [];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Recipes</h1>
        <div className="flex items-center gap-2">
          <LogoutButton />
          <Link
            href="/recipes/new"
            className="flex items-center gap-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Plus size={16} />
            Add
          </Link>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No recipes yet</p>
          <p className="text-sm mt-1">Add your first recipe to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="block bg-white rounded-xl border p-4 hover:border-green-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">{recipe.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{recipe.servings} servings</p>
                  {recipe.notes && <p className="text-sm text-gray-400 mt-1 truncate">{recipe.notes}</p>}
                </div>
                {recipe.source_url && (
                  <ExternalLink size={14} className="text-gray-300 shrink-0 mt-1" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

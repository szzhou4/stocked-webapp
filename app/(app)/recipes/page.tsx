"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, ExternalLink, BookOpen, Utensils, CheckCircle2, AlertCircle, Search, X } from "lucide-react";
import type { Recipe, RecipeIngredient, PantryItem } from "@/lib/types";

type RecipeWithIngredients = Recipe & { recipe_ingredients: RecipeIngredient[] };
type PantryStub = Pick<PantryItem, "name" | "quantity">;

function getMissingCount(ingredients: RecipeIngredient[], pantry: PantryStub[]): number {
  return ingredients.filter((ing) => {
    const ingLower = ing.name.toLowerCase();
    const match = pantry.find(
      (p) => p.name.toLowerCase().includes(ingLower) || ingLower.includes(p.name.toLowerCase())
    );
    return !match || match.quantity <= 0;
  }).length;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [pantry, setPantry] = useState<PantryStub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/recipes").then((r) => r.json()),
      fetch("/api/pantry").then((r) => r.json()),
    ]).then(([recipesData, pantryData]) => {
      setRecipes(recipesData.recipes || []);
      setPantry(pantryData.items || []);
      setLoading(false);
    });
  }, []);

  const hasPantry = pantry.length > 0;

  // Filter by search, then sort: ready first, then ascending missing count, then alphabetical
  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? recipes.filter((r) => r.name.toLowerCase().includes(q))
      : recipes;

    return [...filtered].sort((a, b) => {
      const aM = hasPantry ? getMissingCount(a.recipe_ingredients, pantry) : null;
      const bM = hasPantry ? getMissingCount(b.recipe_ingredients, pantry) : null;
      if (aM === null || bM === null) return a.name.localeCompare(b.name);
      if (aM !== bM) return aM - bM; // ready (0) first
      return a.name.localeCompare(b.name);
    });
  }, [recipes, pantry, search, hasPantry]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
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

      {/* Search bar */}
      {recipes.length > 0 && (
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes…"
            className="w-full pl-9 pr-9 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      )}

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
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium">No recipes match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((recipe) => {
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

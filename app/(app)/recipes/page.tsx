"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, ExternalLink, BookOpen, Utensils, CheckCircle2, AlertCircle, Search, X } from "lucide-react";
import type { Recipe, RecipeIngredient, PantryItem } from "@/lib/types";
import { isSkippedIngredient } from "@/lib/utils";
import { DEFAULT_SETTINGS } from "@/lib/settings";

type RecipeWithIngredients = Recipe & { recipe_ingredients: RecipeIngredient[] };
type PantryStub = Pick<PantryItem, "name" | "quantity">;

function getMissingCount(ingredients: RecipeIngredient[], pantry: PantryStub[], skipList: string[]): number {
  return ingredients.filter((ing) => {
    if (isSkippedIngredient(ing.name, skipList)) return false;
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
  const [skipList, setSkipList] = useState<string[]>(DEFAULT_SETTINGS.skipIngredients);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/recipes").then((r) => r.json()),
      fetch("/api/pantry").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([recipesData, pantryData, settingsData]) => {
      setRecipes(recipesData.recipes || []);
      setPantry(pantryData.items || []);
      if (settingsData.settings?.skipIngredients) setSkipList(settingsData.settings.skipIngredients);
      if (settingsData.settings?.recipeTags?.length) setAvailableTags(settingsData.settings.recipeTags);
      setLoading(false);
    });
  }, []);

  const hasPantry = pantry.length > 0;

  // Tags that appear on at least one saved recipe (for the filter chips row)
  const usedTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach((r) => (r.tags ?? []).forEach((t) => tagSet.add(t)));
    // Preserve the settings order so the row is stable
    return availableTags.filter((t) => tagSet.has(t));
  }, [recipes, availableTags]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = recipes.filter((r) => {
      const matchesSearch = !q
        || r.name.toLowerCase().includes(q)
        || (r.tags ?? []).some((t) => t.toLowerCase().includes(q));
      const matchesTag = !activeTag || (r.tags ?? []).includes(activeTag);
      return matchesSearch && matchesTag;
    });

    return [...filtered].sort((a, b) => {
      const aM = hasPantry ? getMissingCount(a.recipe_ingredients, pantry, skipList) : null;
      const bM = hasPantry ? getMissingCount(b.recipe_ingredients, pantry, skipList) : null;
      if (aM === null || bM === null) return a.name.localeCompare(b.name);
      if (aM !== bM) return aM - bM;
      return a.name.localeCompare(b.name);
    });
  }, [recipes, pantry, search, activeTag, hasPantry, skipList]);

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
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes or tags…"
            className="w-full pl-9 pr-9 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Tag filter chips — only shown when at least one recipe has tags */}
      {usedTags.length > 0 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5 -mx-4 px-4">
          {usedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                activeTag === tag
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              }`}
            >
              {tag}
            </button>
          ))}
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
          <p className="font-medium">
            {activeTag
              ? `No recipes tagged "${activeTag}"${search ? ` matching "${search}"` : ""}`
              : `No recipes match "${search}"`}
          </p>
          {(activeTag || search) && (
            <button
              onClick={() => { setSearch(""); setActiveTag(null); }}
              className="mt-2 text-sm text-indigo-500 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((recipe) => {
            const missingCount = hasPantry ? getMissingCount(recipe.recipe_ingredients, pantry, skipList) : null;
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
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500">{recipe.servings} servings</span>
                    {(recipe.tags ?? []).slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
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

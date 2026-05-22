"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, ChefHat, ExternalLink, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { Recipe, RecipeIngredient, PantryItem } from "@/lib/types";
import { formatQuantity } from "@/lib/utils";

function computeMissing(ingredients: RecipeIngredient[], pantry: PantryItem[]): RecipeIngredient[] {
  return ingredients.filter((ing) => {
    const ingLower = ing.name.toLowerCase();
    const match = pantry.find(
      (p) => p.name.toLowerCase().includes(ingLower) || ingLower.includes(p.name.toLowerCase())
    );
    return !match || match.quantity <= 0;
  });
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<(Recipe & { recipe_ingredients: RecipeIngredient[] }) | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToList, setAddingToList] = useState(false);
  const [cookingServings, setCookingServings] = useState<number | null>(null);
  const [cooking, setCooking] = useState(false);
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setRecipe(d.recipe);
        setPantry(d.pantryItems || []);
        setCookingServings(d.recipe?.servings);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function doAddToShoppingList() {
    setShowConfirm(false);
    setAddingToList(true);
    setMessage("");
    const res = await fetch(`/api/recipes/${id}/shopping`, { method: "POST" });
    const data = await res.json();
    setMessage(data.message || `Added ${data.added} item${data.added !== 1 ? "s" : ""} to shopping list`);
    setAddingToList(false);
  }

  function handleAddToShoppingList() {
    setShowConfirm(true);
  }

  async function handleCook() {
    if (!cookingServings) return;
    setCooking(true);
    setMessage("");
    const res = await fetch(`/api/recipes/${id}/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servings_made: cookingServings }),
    });
    const data = await res.json();
    setMessage(`Cooked! Pantry updated.${data.low_items_count > 0 ? ` ${data.low_items_count} item(s) added to shopping list.` : ""}`);
    setCooking(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this recipe?")) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    router.push("/recipes");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-gray-400" />
    </div>
  );

  if (!recipe) return (
    <div className="max-w-lg mx-auto px-4 py-6 text-center text-gray-400">
      Recipe not found.
    </div>
  );

  const sorted = [...recipe.recipe_ingredients].sort((a, b) => a.sort_order - b.sort_order);
  const missing = computeMissing(sorted, pantry);
  const allReady = missing.length === 0;
  const missingSet = new Set(missing.map((m) => m.id));

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/recipes" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold flex-1 truncate">{recipe.name}</h1>
        <button onClick={handleDelete} className="text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
        <span>{recipe.servings} servings</span>
        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-indigo-600 hover:underline">
            <ExternalLink size={12} /> Source
          </a>
        )}
      </div>

      {/* Readiness banner */}
      {pantry.length > 0 && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium ${
          allReady
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-amber-50 border border-amber-200 text-amber-700"
        }`}>
          {allReady
            ? <><CheckCircle2 size={16} /> Ready to cook — all ingredients in pantry</>
            : <><AlertCircle size={16} /> Missing {missing.length} ingredient{missing.length !== 1 ? "s" : ""}</>
          }
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={handleAddToShoppingList}
          disabled={addingToList}
          className="w-full flex items-center justify-center gap-2 border-2 border-indigo-500 text-indigo-700 rounded-xl py-3 font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors"
        >
          {addingToList ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
          {allReady ? "Add to shopping list" : `Add ${missing.length} missing ingredient${missing.length !== 1 ? "s" : ""} to list`}
        </button>

        <div className="flex gap-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-gray-600 whitespace-nowrap">Servings made:</span>
            <input
              type="number"
              value={cookingServings ?? ""}
              min={0.5}
              step={0.5}
              onChange={(e) => setCookingServings(Number(e.target.value))}
              className="w-16 border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleCook}
            disabled={cooking || !cookingServings}
            className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {cooking ? <Loader2 size={16} className="animate-spin" /> : <ChefHat size={16} />}
            Cooked!
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-sm text-indigo-700 mb-4">
          {message}
        </div>
      )}

      {/* Ingredients */}
      <h2 className="font-semibold mb-3 text-gray-700">Ingredients</h2>
      <div className="space-y-2">
        {sorted.map((ing) => {
          const isMissing = missingSet.has(ing.id);
          return (
            <div key={ing.id} className={`flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 ${isMissing && pantry.length > 0 ? "border-amber-200" : ""}`}>
              <div className="flex-1">
                <span className="text-sm font-medium">{ing.name}</span>
                {ing.notes && <span className="text-xs text-gray-400 ml-1">({ing.notes})</span>}
              </div>
              <span className="text-sm text-gray-500">
                {formatQuantity(ing.quantity, ing.unit)}
              </span>
              {pantry.length > 0 && (
                isMissing
                  ? <AlertCircle size={14} className="text-amber-400 shrink-0" />
                  : <CheckCircle2 size={14} className="text-green-400 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm add to shopping list modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Add to shopping list?</h3>
              <p className="text-gray-500 text-sm mt-1">
                {allReady
                  ? "All ingredients are already in your pantry. Add them to your shopping list anyway?"
                  : `This will add ${missing.length} missing ingredient${missing.length !== 1 ? "s" : ""} to your shopping list.`
                }
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doAddToShoppingList}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Add to list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

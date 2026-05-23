"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShoppingCart, ChefHat, ExternalLink, Trash2, Loader2,
  CheckCircle2, AlertCircle, Pencil, Plus, X, Check,
} from "lucide-react";
import type { Recipe, RecipeIngredient, PantryItem } from "@/lib/types";
import { UNITS } from "@/lib/types";
import { formatQuantity } from "@/lib/utils";

type EditableIngredient = {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  notes: string;
};

function computeMissing(ingredients: RecipeIngredient[], pantry: PantryItem[]): RecipeIngredient[] {
  return ingredients.filter((ing) => {
    const ingLower = ing.name.toLowerCase();
    const match = pantry.find(
      (p) => p.name.toLowerCase().includes(ingLower) || ingLower.includes(p.name.toLowerCase())
    );
    return !match || match.quantity <= 0;
  });
}

function UnitSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={UNITS.includes(value as typeof UNITS[number]) ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-24 text-xs border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    >
      <option value="">unit</option>
      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      {value && !UNITS.includes(value as typeof UNITS[number]) && (
        <option value={value}>{value}</option>
      )}
    </select>
  );
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

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editServings, setEditServings] = useState(4);
  const [editIngredients, setEditIngredients] = useState<EditableIngredient[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/recipes/${id}`);
    const d = await res.json();
    setRecipe(d.recipe);
    setPantry(d.pantryItems || []);
    setCookingServings(d.recipe?.servings);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, [id]);

  function enterEditMode() {
    if (!recipe) return;
    setEditName(recipe.name);
    setEditServings(recipe.servings);
    const sorted = [...recipe.recipe_ingredients].sort((a, b) => a.sort_order - b.sort_order);
    setEditIngredients(sorted.map((ing) => ({
      id: ing.id,
      name: ing.name,
      quantity: ing.quantity?.toString() ?? "",
      unit: ing.unit ?? "",
      notes: ing.notes ?? "",
    })));
    setEditMode(true);
  }

  function updateEditIngredient(i: number, field: keyof EditableIngredient, value: string) {
    setEditIngredients((prev) => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  }

  function addBlankIngredient() {
    setEditIngredients((prev) => [...prev, { name: "", quantity: "", unit: "", notes: "" }]);
  }

  function removeEditIngredient(i: number) {
    setEditIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        servings: editServings,
        ingredients: editIngredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            quantity: parseFloat(i.quantity) || null,
            unit: i.unit || null,
            notes: i.notes || null,
          })),
      }),
    });
    const d = await res.json();
    setRecipe(d.recipe);
    setCookingServings(d.recipe?.servings);
    setEditMode(false);
    setSaving(false);
  }

  async function doAddToShoppingList() {
    setShowConfirm(false);
    setAddingToList(true);
    setMessage("");
    const res = await fetch(`/api/recipes/${id}/shopping`, { method: "POST" });
    const data = await res.json();
    setMessage(data.message || `Added ${data.added} item${data.added !== 1 ? "s" : ""} to shopping list`);
    setAddingToList(false);
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
    <div className="max-w-lg mx-auto px-4 py-6 text-center text-gray-400">Recipe not found.</div>
  );

  const sorted = [...recipe.recipe_ingredients].sort((a, b) => a.sort_order - b.sort_order);
  const missing = computeMissing(sorted, pantry);
  const allReady = missing.length === 0;
  const missingSet = new Set(missing.map((m) => m.id));

  // ── EDIT MODE ───────────────────────────────────────────────────
  if (editMode) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold flex-1">Edit Recipe</h1>
          <button
            onClick={handleSaveEdit}
            disabled={saving || !editName.trim()}
            className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Recipe name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Servings</label>
            <input
              type="number"
              min={1}
              value={editServings}
              onChange={(e) => setEditServings(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <h2 className="text-sm font-semibold text-gray-700 mb-2">Ingredients</h2>
        <div className="space-y-2 mb-3">
          {editIngredients.map((ing, i) => (
            <div key={i} className="bg-white border rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <input
                    value={ing.name}
                    onChange={(e) => updateEditIngredient(i, "name", e.target.value)}
                    placeholder="Ingredient name"
                    className="w-full text-sm font-medium border-b border-transparent hover:border-gray-200 focus:border-indigo-400 focus:outline-none pb-0.5 mb-2"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={ing.quantity}
                      onChange={(e) => updateEditIngredient(i, "quantity", e.target.value)}
                      placeholder="qty"
                      className="w-16 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <UnitSelect value={ing.unit} onChange={(v) => updateEditIngredient(i, "unit", v)} />
                    <input
                      value={ing.notes}
                      onChange={(e) => updateEditIngredient(i, "notes", e.target.value)}
                      placeholder="notes (e.g. chopped)"
                      className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <button onClick={() => removeEditIngredient(i)} className="text-gray-300 hover:text-red-400 transition-colors mt-0.5">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addBlankIngredient}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-indigo-300 text-indigo-500 rounded-lg py-2 text-sm hover:bg-indigo-50 transition-colors"
        >
          <Plus size={14} /> Add ingredient
        </button>
      </div>
    );
  }

  // ── VIEW MODE ───────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/recipes" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold flex-1 truncate">{recipe.name}</h1>
        <button onClick={enterEditMode} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
          <Pencil size={16} />
        </button>
        <button onClick={handleDelete} className="text-gray-300 hover:text-red-400 transition-colors p-1">
          <Trash2 size={16} />
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
          onClick={() => setShowConfirm(true)}
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
              <span className="text-sm text-gray-500">{formatQuantity(ing.quantity, ing.unit)}</span>
              {pantry.length > 0 && (
                isMissing
                  ? <AlertCircle size={14} className="text-amber-400 shrink-0" />
                  : <CheckCircle2 size={14} className="text-green-400 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm modal */}
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
              <button onClick={() => setShowConfirm(false)} className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={doAddToShoppingList} className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700 transition-colors">
                Add to list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

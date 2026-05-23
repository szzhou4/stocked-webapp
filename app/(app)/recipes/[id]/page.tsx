"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShoppingCart, ChefHat, ExternalLink, Trash2, Loader2,
  CheckCircle2, AlertCircle, Pencil, Plus, X, Check, Tag,
  FileText, ImageIcon, History, ChevronDown, ChevronUp, Archive, ArchiveRestore,
} from "lucide-react";
import type { Recipe, RecipeIngredient, PantryItem, RecipeUse } from "@/lib/types";
import { UnitSelect } from "@/components/UnitSelect";
import { formatQuantity, isSkippedIngredient } from "@/lib/utils";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings";
import { RECIPE_ICONS, getRecipeIcon } from "@/lib/recipeIcons";
import { convertUnit } from "@/lib/units";

type EditableIngredient = {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  notes: string;
};

function computeMissing(
  ingredients: RecipeIngredient[],
  pantry: PantryItem[],
  skipList: string[],
  scale = 1,
): RecipeIngredient[] {
  return ingredients.filter((ing) => {
    if (isSkippedIngredient(ing.name, skipList)) return false;
    const ingLower = ing.name.toLowerCase();
    const match = pantry.find(
      (p) => p.name.toLowerCase().includes(ingLower) || ingLower.includes(p.name.toLowerCase())
    );
    if (!match || match.quantity <= 0) return true; // not in pantry at all

    // If recipe has a quantity, check whether pantry holds enough for the scaled serving
    if (ing.quantity != null && ing.quantity > 0) {
      const needed = ing.quantity * scale;
      const ingUnit = (ing.unit ?? "").toLowerCase().trim();
      const pantryUnit = (match.unit ?? "").toLowerCase().trim();

      if (ingUnit === pantryUnit) {
        // Same unit — direct comparison
        if (match.quantity < needed) return true;
      } else if (ingUnit && pantryUnit) {
        // Different units — try conversion
        const neededConverted = convertUnit(needed, ingUnit, pantryUnit);
        if (neededConverted !== null && match.quantity < neededConverted) return true;
      } else if (!ingUnit && !pantryUnit) {
        // Both unitless (count) — direct comparison
        if (match.quantity < needed) return true;
      }
      // Mixed unit presence → existence check only (can't compare)
    }

    return false;
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<(Recipe & { recipe_ingredients: RecipeIngredient[] }) | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [cookHistory, setCookHistory] = useState<RecipeUse[]>([]);
  const [skipList, setSkipList] = useState<string[]>(DEFAULT_SETTINGS.skipIngredients);
  const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_SETTINGS.recipeTags);
  const [loading, setLoading] = useState(true);
  const [addingToList, setAddingToList] = useState(false);
  const [viewServings, setViewServings] = useState<number>(4);
  const [cookingServings, setCookingServings] = useState<number | null>(null);
  const [cooking, setCooking] = useState(false);
  const [cookNotes, setCookNotes] = useState("");
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editServings, setEditServings] = useState(4);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editIcon, setEditIcon] = useState<string>("utensils");
  const [editIngredients, setEditIngredients] = useState<EditableIngredient[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [recipeRes, settingsRes] = await Promise.all([
      fetch(`/api/recipes/${id}`),
      fetch("/api/settings"),
    ]);
    const d = await recipeRes.json();
    const s = await settingsRes.json();
    setRecipe(d.recipe);
    setPantry(d.pantryItems || []);
    setCookHistory(d.cookHistory || []);
    setViewServings(d.recipe?.servings ?? 4);
    setCookingServings(d.recipe?.servings);
    if (s.settings?.skipIngredients) setSkipList(s.settings.skipIngredients);
    if (s.settings?.recipeTags?.length) setAvailableTags(s.settings.recipeTags);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, [id]);

  function enterEditMode() {
    if (!recipe) return;
    setEditName(recipe.name);
    setEditServings(recipe.servings);
    setEditTags(recipe.tags ?? []);
    setEditIcon(recipe.icon ?? "utensils");
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
        tags: editTags,
        icon: editIcon,
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
    setViewServings(d.recipe?.servings ?? 4);
    setCookingServings(d.recipe?.servings);
    setEditMode(false);
    setSaving(false);
  }

  async function doAddToShoppingList(force = false) {
    setShowConfirm(false);
    setAddingToList(true);
    setMessage("");
    const res = await fetch(`/api/recipes/${id}/shopping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
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
      body: JSON.stringify({ servings_made: cookingServings, notes: cookNotes || null }),
    });
    const data = await res.json();
    const parts: string[] = [];
    if (data.depleted_count > 0) parts.push(`${data.depleted_count} pantry item${data.depleted_count !== 1 ? "s" : ""} updated`);
    if (data.low_items?.length > 0) parts.push(`⚠️ Running low: ${data.low_items.join(", ")} — add to your shopping list from the Pantry tab`);
    if (data.no_unit_count > 0) parts.push(`⚠️ Set a unit in Pantry for: ${data.no_unit_names.join(", ")} (needed to track usage)`);
    if (data.skipped_count > 0) parts.push(`Skipped (unit type mismatch): ${data.skipped_names.join(", ")}`);
    setMessage(`Cooked! ${parts.length ? parts.join(" · ") : "No pantry items matched."}`);
    setCookNotes("");
    await load();
    setCooking(false);
  }

  async function handleToggleArchive() {
    if (!recipe) return;
    const newArchived = !recipe.archived;
    await fetch(`/api/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: newArchived }),
    });
    if (newArchived) {
      router.push("/recipes");
    } else {
      setRecipe((r) => r ? { ...r, archived: false } : r);
    }
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
  const scale = recipe.servings > 0 ? viewServings / recipe.servings : 1;
  const missing = computeMissing(sorted, pantry, skipList, scale);
  const allReady = missing.length === 0;
  const missingSet = new Set(missing.map((m) => m.id));
  const iconDef = getRecipeIcon(recipe.icon);
  const { Icon: RecipeIcon } = iconDef;

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

        <div className="grid grid-cols-2 gap-3 mb-4">
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

        {/* Tags in edit mode */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-2 flex items-center gap-1"><Tag size={12} /> Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setEditTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  editTags.includes(tag)
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {tag}
              </button>
            ))}
            {/* Orphaned tags — on this recipe but removed from settings */}
            {editTags.filter((t) => !availableTags.includes(t)).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setEditTags((prev) => prev.filter((t) => t !== tag))}
                title="No longer in your tag settings — click to remove"
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors bg-gray-100 text-gray-400 border-gray-300 hover:bg-red-50 hover:text-red-500 hover:border-red-300"
              >
                {tag} <X size={10} />
              </button>
            ))}
          </div>
        </div>

        {/* Icon picker in edit mode */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-2">Recipe icon</label>
          <div className="flex gap-2 flex-wrap">
            {RECIPE_ICONS.map(({ id, label, Icon, color, bg }) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => setEditIcon(id)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${
                  editIcon === id
                    ? `${bg} border-indigo-400`
                    : "bg-gray-50 border-transparent hover:border-gray-200"
                }`}
              >
                <Icon size={16} className={editIcon === id ? color : "text-gray-300"} />
              </button>
            ))}
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
                  <div className="flex gap-2 mb-1.5">
                    <input
                      type="number"
                      value={ing.quantity}
                      onChange={(e) => updateEditIngredient(i, "quantity", e.target.value)}
                      placeholder="qty"
                      className="w-16 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <UnitSelect value={ing.unit} onChange={(v) => updateEditIngredient(i, "unit", v)} size="xs" className="w-24" />
                    <input
                      value={ing.notes}
                      onChange={(e) => updateEditIngredient(i, "notes", e.target.value)}
                      placeholder="notes, e.g. chopped · 1 can"
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
        <div className={`w-9 h-9 ${iconDef.bg} rounded-lg flex items-center justify-center shrink-0`}>
          <RecipeIcon size={18} className={iconDef.color} />
        </div>
        <h1 className="text-xl font-bold flex-1 truncate">{recipe.name}</h1>
        <button onClick={enterEditMode} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
          <Pencil size={16} />
        </button>
        <button
          onClick={handleToggleArchive}
          title={recipe.archived ? "Restore recipe" : "Archive recipe"}
          className={`transition-colors p-1 ${recipe.archived ? "text-amber-500 hover:text-amber-700" : "text-gray-300 hover:text-amber-500"}`}
        >
          {recipe.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
        </button>
        <button onClick={handleDelete} className="text-gray-300 hover:text-red-400 transition-colors p-1">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Meta row: servings stepper + source links */}
      <div className="flex items-center gap-3 text-sm text-gray-500 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { const v = Math.max(1, viewServings - 1); setViewServings(v); setCookingServings(v); }}
            className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors leading-none select-none"
          >−</button>
          <span className={`text-sm font-semibold tabular-nums w-5 text-center ${viewServings !== recipe.servings ? "text-indigo-600" : ""}`}>
            {viewServings}
          </span>
          <button
            onClick={() => { const v = viewServings + 1; setViewServings(v); setCookingServings(v); }}
            className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors leading-none select-none"
          >+</button>
          <span className="text-sm text-gray-500">servings</span>
          {viewServings !== recipe.servings && (
            <button
              onClick={() => { setViewServings(recipe.servings); setCookingServings(recipe.servings); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-0.5"
              title="Reset to original"
            >reset</button>
          )}
        </div>
        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-indigo-600 hover:underline">
            <ExternalLink size={12} /> Source
          </a>
        )}
        {recipe.source_type === "text" && recipe.source_content && (
          <button
            onClick={() => setShowSource((v) => !v)}
            className="flex items-center gap-1 text-indigo-600 hover:underline"
          >
            <FileText size={12} /> {showSource ? "Hide source" : "View source text"}
          </button>
        )}
        {recipe.source_type === "image" && recipe.source_content && (
          <button
            onClick={() => setShowSource((v) => !v)}
            className="flex items-center gap-1 text-indigo-600 hover:underline"
          >
            <ImageIcon size={12} /> {showSource ? "Hide photo" : "View source photo"}
          </button>
        )}
      </div>

      {/* Source content (expandable) */}
      {showSource && recipe.source_content && (
        <div className="mb-4 bg-gray-50 border rounded-xl overflow-hidden">
          {recipe.source_type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.source_content} alt="Source photo" className="w-full max-h-72 object-contain" />
          ) : (
            <pre className="p-4 text-xs text-gray-600 whitespace-pre-wrap max-h-60 overflow-y-auto font-sans">
              {recipe.source_content}
            </pre>
          )}
        </div>
      )}

      {/* Tags */}
      {(recipe.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {recipe.tags.map((tag) => (
            <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Archived banner */}
      {recipe.archived && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4 text-xs text-amber-700">
          <Archive size={13} className="shrink-0" />
          <span className="flex-1">This recipe is archived and hidden from your main list.</span>
          <button onClick={handleToggleArchive} className="font-semibold hover:text-amber-900 shrink-0 transition-colors">
            Restore
          </button>
        </div>
      )}

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

        <div className="bg-white border rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
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
          <textarea
            value={cookNotes}
            onChange={(e) => setCookNotes(e.target.value)}
            placeholder="Add a note about this cook (optional)…"
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-600 placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      {message && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-sm text-indigo-700 mb-4">
          {message}
        </div>
      )}

      {/* Ingredients */}
      <h2 className="font-semibold mb-3 text-gray-700 flex items-baseline gap-2">
        Ingredients
        {scale !== 1 && (
          <span className="text-xs font-normal text-indigo-500">scaled ×{Math.round(scale * 100) / 100}</span>
        )}
      </h2>
      <div className="space-y-2 mb-6">
        {sorted.map((ing) => {
          const isMissing = missingSet.has(ing.id);
          const scaledQty = ing.quantity != null ? Math.round(ing.quantity * scale * 1000) / 1000 : null;
          return (
            <div key={ing.id} className={`flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 ${isMissing && pantry.length > 0 ? "border-amber-200" : ""}`}>
              <div className="flex-1">
                <span className="text-sm font-medium">{ing.name}</span>
                {ing.notes && <span className="text-xs text-gray-400 ml-1.5 italic">{ing.notes}</span>}
              </div>
              <span className="text-sm text-gray-500 shrink-0">{formatQuantity(scaledQty, ing.unit)}</span>
              {pantry.length > 0 && (
                isMissing
                  ? <AlertCircle size={14} className="text-amber-400 shrink-0" />
                  : <CheckCircle2 size={14} className="text-green-400 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Cook history */}
      {cookHistory.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 hover:text-indigo-600 transition-colors"
          >
            <History size={15} />
            Cook history ({cookHistory.length})
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showHistory && (
            <div className="space-y-2">
              {cookHistory.map((use) => (
                <div key={use.id} className="bg-white border rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{formatDate(use.used_at)}</span>
                    <span className="text-xs text-gray-500">{use.servings_made} serving{use.servings_made !== 1 ? "s" : ""}</span>
                  </div>
                  {use.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">{use.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm add to list modal */}
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
              <button onClick={() => doAddToShoppingList(allReady)} className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700 transition-colors">
                Add to list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

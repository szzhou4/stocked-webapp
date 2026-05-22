"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Link2, Camera, Type, Loader2, X } from "lucide-react";
import Link from "next/link";
import type { CategorizedIngredient } from "@/lib/claude/extract";
import { STORE_LABELS } from "@/lib/types";

type Mode = "url" | "image" | "text";

export default function NewRecipePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [servings, setServings] = useState(4);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ingredients, setIngredients] = useState<CategorizedIngredient[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string>("image/jpeg");

  async function handleExtract() {
    setExtracting(true);
    setError("");
    try {
      const body: Record<string, string> = {};
      if (mode === "url") body.url = url;
      else if (mode === "text") body.text = text;
      else if (mode === "image" && imageBase64) {
        body.imageBase64 = imageBase64;
        body.imageMediaType = imageMediaType;
      }

      const res = await fetch("/api/recipes/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setIngredients(data.ingredients);

      // Auto-fill name from URL
      if (mode === "url" && !name) {
        try {
          const u = new URL(url);
          setName(u.hostname.replace("www.", ""));
        } catch {}
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExtracting(false);
    }
  }

  function handleImageFile(file: File) {
    setImageMediaType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  function updateIngredient(i: number, field: keyof CategorizedIngredient, value: string | number) {
    setIngredients((prev) => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!name.trim()) { setError("Recipe name is required"); return; }
    if (!ingredients.length) { setError("Add at least one ingredient"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          source_url: mode === "url" ? url : null,
          servings,
          ingredients,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push(`/recipes/${data.recipe.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/recipes" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Add Recipe</h1>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-4">
        {([["url", Link2, "Paste URL"], ["image", Camera, "Photo"], ["text", Type, "Paste text"]] as const).map(
          ([m, Icon, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                mode === m ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          )
        )}
      </div>

      {/* Input area */}
      {mode === "url" && (
        <input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}
      {mode === "text" && (
        <textarea
          placeholder="Paste recipe text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      )}
      {mode === "image" && (
        <div
          className="border-2 border-dashed rounded-lg p-4 text-center mb-3 cursor-pointer hover:border-indigo-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Recipe" className="max-h-40 mx-auto rounded" />
          ) : (
            <p className="text-gray-400 text-sm">Tap to upload a photo</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
          />
        </div>
      )}

      <button
        onClick={handleExtract}
        disabled={extracting || (mode === "url" && !url) || (mode === "text" && !text) || (mode === "image" && !imageBase64)}
        className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 mb-4 flex items-center justify-center gap-2 transition-colors"
      >
        {extracting ? <><Loader2 size={16} className="animate-spin" /> Extracting ingredients…</> : "Extract ingredients"}
      </button>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {/* Ingredients editor */}
      {ingredients.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Recipe name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My recipe"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Servings</label>
              <input
                type="number"
                value={servings}
                min={1}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Ingredients ({ingredients.length}) — review &amp; edit
            </h2>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="bg-white border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        value={ing.name}
                        onChange={(e) => updateIngredient(i, "name", e.target.value)}
                        className="w-full text-sm font-medium border-b border-transparent hover:border-gray-200 focus:border-indigo-400 focus:outline-none pb-0.5 mb-1"
                      />
                      <div className="flex gap-2">
                        <input
                          value={ing.quantity ?? ""}
                          onChange={(e) => updateIngredient(i, "quantity", parseFloat(e.target.value) || 0)}
                          placeholder="qty"
                          type="number"
                          className="w-16 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <input
                          value={ing.unit ?? ""}
                          onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                          placeholder="unit"
                          className="w-20 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <select
                          value={ing.store}
                          onChange={(e) => updateIngredient(i, "store", e.target.value)}
                          className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        >
                          {Object.entries(STORE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() => removeIngredient(i)}
                      className="text-gray-300 hover:text-red-400 mt-0.5 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white rounded-lg py-3 font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "Save recipe"}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Link2, Camera, Type, Loader2, X, Tag } from "lucide-react";
import Link from "next/link";
import type { CategorizedIngredient } from "@/lib/claude/extract";
import { STORE_LABELS } from "@/lib/types";
import { UnitSelect } from "@/components/UnitSelect";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings";

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

  // Tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_SETTINGS.recipeTags);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d: { settings?: UserSettings }) => {
      if (d.settings?.recipeTags?.length) setAvailableTags(d.settings.recipeTags);
    });
  }, []);

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
    setError("");
    if (file.size > 20 * 1024 * 1024) {
      setError("Image too large (max 20 MB). Please use a smaller photo.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.onload = () => {
      const MAX = 1600;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
      setImageMediaType("image/jpeg");
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      setError("Could not read image. Please try a JPEG or PNG photo.");
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  function updateIngredient(i: number, field: keyof CategorizedIngredient, value: string | number | null) {
    setIngredients((prev) => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave() {
    if (!name.trim()) { setError("Recipe name is required"); return; }
    if (!ingredients.length) { setError("Add at least one ingredient"); return; }
    setSaving(true);
    setError("");
    try {
      // Determine source type and content
      let source_type: string | null = null;
      let source_content: string | null = null;
      if (mode === "url" && url) {
        source_type = "url";
        // source_url already captures the URL; no separate content needed
      } else if (mode === "image" && imagePreview) {
        source_type = "image";
        source_content = imagePreview; // full data URL
      } else if (mode === "text" && text.trim()) {
        source_type = "text";
        source_content = text.trim();
      }

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          source_url: mode === "url" ? url : null,
          source_type,
          source_content,
          tags: selectedTags,
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

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
              <Tag size={14} className="text-gray-400" /> Tags <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
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
                        className="w-full text-sm font-medium border-b border-transparent hover:border-gray-200 focus:border-indigo-400 focus:outline-none pb-0.5 mb-1.5"
                      />
                      <div className="flex gap-2 mb-1.5">
                        <input
                          value={ing.quantity ?? ""}
                          onChange={(e) => updateIngredient(i, "quantity", parseFloat(e.target.value) || 0)}
                          placeholder="qty"
                          type="number"
                          className="w-16 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <UnitSelect
                          value={ing.unit ?? ""}
                          onChange={(v) => updateIngredient(i, "unit", v || null)}
                          size="xs"
                          className="w-24"
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
                      {/* Notes / about */}
                      <input
                        value={ing.notes ?? ""}
                        onChange={(e) => updateIngredient(i, "notes", e.target.value || null)}
                        placeholder="notes, e.g. chopped · 1 can (14 oz)"
                        className="w-full text-xs border rounded px-2 py-1 text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
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

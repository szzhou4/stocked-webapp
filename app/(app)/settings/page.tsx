"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, RotateCcw, Plus, Trash2 } from "lucide-react";
import { STORE_COLORS, DEFAULT_STORE_COLOR } from "@/lib/types";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings";

const DEFAULT_STORE_KEYS = ["costco", "asian", "generic", "other"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setSettings(d.settings); })
      .finally(() => setLoading(false));
  }, []);

  function updateStoreName(key: string, name: string) {
    setSettings((s) => ({ ...s, stores: { ...s.stores, [key]: { ...s.stores[key], name } } }));
  }

  function updateStoreDescription(key: string, description: string) {
    setSettings((s) => ({ ...s, stores: { ...s.stores, [key]: { ...s.stores[key], description } } }));
  }

  function addStore() {
    const name = newStoreName.trim();
    if (!name) return;
    // Generate a key from the name (lowercase, no spaces)
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/__+/g, "_");
    if (settings.stores[key]) return; // already exists
    setSettings((s) => ({
      ...s,
      stores: { ...s.stores, [key]: { name, description: `Items you buy at ${name}` } },
    }));
    setNewStoreName("");
  }

  function removeStore(key: string) {
    if (DEFAULT_STORE_KEYS.includes(key)) return; // can't remove defaults
    setSettings((s) => {
      const { [key]: _, ...rest } = s.stores;
      return { ...s, stores: rest };
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (!confirm("Reset all settings to defaults?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-gray-400" />
    </div>
  );

  const storeKeys = Object.keys(settings.stores);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customize stores and defaults</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Reset to defaults">
            <RotateCcw size={16} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Default store */}
      <div className="bg-white border rounded-xl p-4 mb-5">
        <h2 className="font-semibold text-gray-800 mb-1">Default store</h2>
        <p className="text-xs text-gray-500 mb-3">Used when you manually add an item to the shopping list or pantry.</p>
        <select
          value={settings.defaultStore}
          onChange={(e) => setSettings((s) => ({ ...s, defaultStore: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {storeKeys.map((key) => (
            <option key={key} value={key}>{settings.stores[key].name}</option>
          ))}
        </select>
      </div>

      {/* Store customization */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-semibold text-gray-800">Store categories</h2>
          <p className="text-xs text-gray-500">The description helps Claude sort ingredients automatically.</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {storeKeys.map((key) => {
          const isDefault = DEFAULT_STORE_KEYS.includes(key);
          const color = STORE_COLORS[key] ?? DEFAULT_STORE_COLOR;
          return (
            <div key={key} className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>
                    {settings.stores[key].name}
                  </span>
                  {isDefault && <span className="text-[10px] text-gray-400 uppercase tracking-wide">default</span>}
                </div>
                {!isDefault && (
                  <button onClick={() => removeStore(key)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Display name</label>
                  <input
                    value={settings.stores[key].name}
                    onChange={(e) => updateStoreName(key, e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">
                    AI description <span className="text-gray-400">(what you buy here)</span>
                  </label>
                  <textarea
                    value={settings.stores[key].description}
                    onChange={(e) => updateStoreDescription(key, e.target.value)}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add new store */}
      <div className="bg-white border border-dashed border-indigo-300 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Add a store</p>
        <div className="flex gap-2">
          <input
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStore()}
            placeholder="e.g. Trader Joe's, Whole Foods…"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addStore}
            disabled={!newStoreName.trim()}
            className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-5">Changes to AI descriptions take effect on the next recipe import.</p>
    </div>
  );
}

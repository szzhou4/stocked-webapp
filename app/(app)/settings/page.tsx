"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { STORE_LABELS, type Store } from "@/lib/types";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings";

const STORE_KEYS: Store[] = ["costco", "asian", "generic", "other"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setSettings(d.settings); })
      .finally(() => setLoading(false));
  }, []);

  function updateStoreName(key: Store, name: string) {
    setSettings((s) => ({ ...s, stores: { ...s.stores, [key]: { ...s.stores[key], name } } }));
  }

  function updateStoreDescription(key: Store, description: string) {
    setSettings((s) => ({ ...s, stores: { ...s.stores, [key]: { ...s.stores[key], description } } }));
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

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customize stores and defaults</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Reset to defaults"
          >
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
        <p className="text-xs text-gray-500 mb-3">
          Used when you manually add an item to the shopping list or pantry.
        </p>
        <select
          value={settings.defaultStore}
          onChange={(e) => setSettings((s) => ({ ...s, defaultStore: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STORE_KEYS.map((key) => (
            <option key={key} value={key}>{settings.stores[key].name}</option>
          ))}
        </select>
      </div>

      {/* Store customization */}
      <h2 className="font-semibold text-gray-800 mb-1">Store categories</h2>
      <p className="text-xs text-gray-500 mb-3">
        The description helps Claude automatically sort ingredients into the right store when you import a recipe.
      </p>
      <div className="space-y-3">
        {STORE_KEYS.map((key) => (
          <div key={key} className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${
                key === "costco" ? "bg-blue-500" :
                key === "asian" ? "bg-red-500" :
                key === "generic" ? "bg-green-500" : "bg-gray-400"
              }`} />
              <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                {STORE_LABELS[key]}
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Display name</label>
                <input
                  value={settings.stores[key].name}
                  onChange={(e) => updateStoreName(key, e.target.value)}
                  placeholder="Store name"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">
                  Description <span className="text-gray-400">(used by AI to classify ingredients)</span>
                </label>
                <textarea
                  value={settings.stores[key].description}
                  onChange={(e) => updateStoreDescription(key, e.target.value)}
                  rows={2}
                  placeholder="Describe what you buy at this store..."
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-5">
        Changes take effect on the next recipe import.
      </p>
    </div>
  );
}

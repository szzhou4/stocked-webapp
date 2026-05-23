"use client";

import { useEffect, useState } from "react";
import { Plus, X, AlertTriangle, Minus } from "lucide-react";
import type { PantryItem } from "@/lib/types";
import { STORE_LABELS, CATEGORIES, UNITS, getStoreLabel, getStoreColor } from "@/lib/types";
import { formatQuantity } from "@/lib/utils";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings";

// Fix: always use actual value so custom units (e.g. "teaspoon") display correctly
function UnitSelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const isCustom = value && !UNITS.includes(value as typeof UNITS[number]);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className || ""}`}
    >
      <option value="">— unit —</option>
      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      {isCustom && <option value={value}>{value}</option>}
    </select>
  );
}

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [useModal, setUseModal] = useState<PantryItem | null>(null);
  const [useAmount, setUseAmount] = useState("");
  const [newItem, setNewItem] = useState({
    name: "", quantity: "", unit: "", min_quantity: "", category: "other", store: "generic",
  });

  // Inline edit state (controlled, replaces onBlur approach)
  const [editValues, setEditValues] = useState<Record<string, {
    quantity: string; min_quantity: string; unit: string; category: string; store: string;
  }>>({});

  const userStores = settings.stores;
  const allStores = { ...STORE_LABELS, ...Object.fromEntries(Object.entries(userStores).map(([k, v]) => [k, v.name])) };

  async function load() {
    const [pantryRes, settingsRes] = await Promise.all([
      fetch("/api/pantry"),
      fetch("/api/settings"),
    ]);
    const pantryData = await pantryRes.json();
    const settingsData = await settingsRes.json();
    setItems(pantryData.items || []);
    if (settingsData.settings) setSettings(settingsData.settings);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEditing(item: PantryItem) {
    setEditValues((prev) => ({
      ...prev,
      [item.id]: {
        quantity: item.quantity.toString(),
        min_quantity: item.min_quantity.toString(),
        unit: item.unit || "",
        category: item.category,
        store: item.store,
      },
    }));
    setEditing(item.id);
  }

  async function saveEdit(item: PantryItem) {
    const vals = editValues[item.id];
    if (!vals) return;
    await fetch("/api/pantry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        quantity: parseFloat(vals.quantity) || 0,
        min_quantity: parseFloat(vals.min_quantity) || 0,
        unit: vals.unit || null,
        category: vals.category,
        store: vals.store,
      }),
    });
    setEditing(null);
    await load();
  }

  async function handleAdd() {
    if (!newItem.name.trim()) return;
    await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newItem.name.trim(),
        quantity: parseFloat(newItem.quantity) || 0,
        unit: newItem.unit || null,
        min_quantity: parseFloat(newItem.min_quantity) || 0,
        category: newItem.category,
        store: newItem.store || settings.defaultStore,
      }),
    });
    setNewItem({ name: "", quantity: "", unit: "", min_quantity: "", category: "other", store: settings.defaultStore });
    setAdding(false);
    await load();
  }

  async function handleUse() {
    if (!useModal) return;
    const amount = parseFloat(useAmount);
    if (!amount || amount <= 0) return;
    const newQty = Math.max(0, useModal.quantity - amount);
    await fetch("/api/pantry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: useModal.id, quantity: newQty }),
    });
    setUseModal(null);
    setUseAmount("");
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove from pantry?")) return;
    await fetch("/api/pantry", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PantryItem[]>);

  const lowItems = items.filter((i) => i.quantity <= i.min_quantity && i.min_quantity > 0);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pantry</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} {items.length === 1 ? "item" : "items"} stocked</p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {lowItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Running low</p>
            <p className="text-xs text-amber-600">{lowItems.map((i) => i.name).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <input
            placeholder="Item name"
            value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Have</label>
              <input type="number" placeholder="0" value={newItem.quantity}
                onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Min</label>
              <input type="number" placeholder="0" value={newItem.min_quantity}
                onChange={(e) => setNewItem((p) => ({ ...p, min_quantity: e.target.value }))}
                className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Unit</label>
              <UnitSelect value={newItem.unit} onChange={(v) => setNewItem((p) => ({ ...p, unit: v }))} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={newItem.store} onChange={(e) => setNewItem((p) => ({ ...p, store: e.target.value }))}
              className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {Object.entries(allStores).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={newItem.category} onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
              className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
              Add to pantry
            </button>
            <button onClick={() => setAdding(false)} className="px-3 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">Pantry is empty</p>
          <p className="text-sm mt-1">Items are added automatically when you check off purchases.</p>
        </div>
      )}

      {/* Grouped list */}
      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category} className="mb-5">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">{category}</p>
          <div className="space-y-2">
            {catItems.map((item) => {
              const isLow = item.quantity <= item.min_quantity && item.min_quantity > 0;
              const isEditing = editing === item.id;
              const ev = editValues[item.id];
              return (
                <div key={item.id} className={`bg-white border rounded-xl p-3 ${isLow ? "border-amber-300" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${getStoreColor(item.store)}`}>
                        {getStoreLabel(item.store, userStores)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isLow && <AlertTriangle size={14} className="text-amber-500" />}
                      {!isEditing && (
                        <button
                          onClick={() => setUseModal(item)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50"
                        >
                          <Minus size={12} /> Use
                        </button>
                      )}
                      <button
                        onClick={() => isEditing ? saveEdit(item) : startEditing(item)}
                        className="text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 active:bg-indigo-100"
                      >
                        {isEditing ? "Save" : "Edit"}
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-gray-200 hover:text-red-400 transition-colors p-1">
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {isEditing && ev ? (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Have</label>
                          <input type="number" value={ev.quantity}
                            onChange={(e) => setEditValues((p) => ({ ...p, [item.id]: { ...p[item.id], quantity: e.target.value } }))}
                            className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Min</label>
                          <input type="number" value={ev.min_quantity}
                            onChange={(e) => setEditValues((p) => ({ ...p, [item.id]: { ...p[item.id], min_quantity: e.target.value } }))}
                            className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Unit</label>
                          <UnitSelect value={ev.unit}
                            onChange={(v) => setEditValues((p) => ({ ...p, [item.id]: { ...p[item.id], unit: v } }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Store</label>
                          <select value={ev.store}
                            onChange={(e) => setEditValues((p) => ({ ...p, [item.id]: { ...p[item.id], store: e.target.value } }))}
                            className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                            {Object.entries(allStores).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Category</label>
                          <select value={ev.category}
                            onChange={(e) => setEditValues((p) => ({ ...p, [item.id]: { ...p[item.id], category: e.target.value } }))}
                            className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">Min triggers low-stock alert &amp; auto-adds to shopping list</p>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      {item.min_quantity > 0 ? (
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${isLow ? "bg-amber-400" : "bg-indigo-500"}`}
                            style={{ width: `${Math.min(100, (item.quantity / (item.min_quantity * 2)) * 100)}%` }}
                          />
                        </div>
                      ) : <div className="flex-1" />}
                      <span className="text-xs text-gray-500 shrink-0">
                        {formatQuantity(item.quantity, item.unit)}
                        {item.min_quantity > 0 && <span className="text-gray-300"> / {formatQuantity(item.min_quantity, item.unit)} min</span>}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Use modal */}
      {useModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{useModal.name}</h3>
              <p className="text-gray-500 text-sm">
                Current stock: <strong>{formatQuantity(useModal.quantity, useModal.unit)}</strong>
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Amount used</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={useAmount}
                  onChange={(e) => setUseAmount(e.target.value)}
                  placeholder="0"
                  min={0}
                  step={0.5}
                  autoFocus
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="self-center text-sm text-gray-500">{useModal.unit || "units"}</span>
              </div>
              {useAmount && parseFloat(useAmount) > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Remaining: {formatQuantity(Math.max(0, useModal.quantity - parseFloat(useAmount)), useModal.unit)}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setUseModal(null); setUseAmount(""); }}
                className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleUse}
                disabled={!useAmount || parseFloat(useAmount) <= 0}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                Mark as used
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

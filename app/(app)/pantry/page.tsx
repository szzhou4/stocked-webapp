"use client";

import { useEffect, useState } from "react";
import { Plus, X, AlertTriangle } from "lucide-react";
import type { PantryItem, Store } from "@/lib/types";
import { STORE_LABELS, CATEGORIES } from "@/lib/types";
import { formatQuantity } from "@/lib/utils";

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    name: "", quantity: "", unit: "", min_quantity: "", category: "other", store: "generic" as Store,
  });

  async function load() {
    const res = await fetch("/api/pantry");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newItem.name.trim()) return;
    const res = await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newItem.name.trim(),
        quantity: parseFloat(newItem.quantity) || 0,
        unit: newItem.unit || null,
        min_quantity: parseFloat(newItem.min_quantity) || 0,
        category: newItem.category,
        store: newItem.store,
      }),
    });
    if (res.ok) {
      await load();
      setNewItem({ name: "", quantity: "", unit: "", min_quantity: "", category: "other", store: "generic" });
      setAdding(false);
    }
  }

  async function handleUpdate(id: string, field: string, value: string | number) {
    await fetch("/api/pantry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
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
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} {items.length === 1 ? "item" : "items"} stocked
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Low stock alert */}
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
              <input
                type="number"
                placeholder="0"
                value={newItem.quantity}
                onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Min</label>
              <input
                type="number"
                placeholder="0"
                value={newItem.min_quantity}
                onChange={(e) => setNewItem((p) => ({ ...p, min_quantity: e.target.value }))}
                className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Unit</label>
              <input
                placeholder="lbs"
                value={newItem.unit}
                onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))}
                className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newItem.store}
              onChange={(e) => setNewItem((p) => ({ ...p, store: e.target.value as Store }))}
              className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {Object.entries(STORE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select
              value={newItem.category}
              onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
              className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
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
              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl p-3 ${isLow ? "border-amber-300" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.name}</span>
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle size={14} className="text-amber-500" />}
                      <button
                        onClick={() => setEditing(isEditing ? null : item.id)}
                        className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        {isEditing ? "Done" : "Edit"}
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-2">
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Have</label>
                          <input
                            type="number"
                            defaultValue={item.quantity}
                            onBlur={(e) => handleUpdate(item.id, "quantity", parseFloat(e.target.value))}
                            className="w-20 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Min</label>
                          <input
                            type="number"
                            defaultValue={item.min_quantity}
                            onBlur={(e) => handleUpdate(item.id, "min_quantity", parseFloat(e.target.value))}
                            className="w-20 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 justify-end">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Unit</label>
                          <span className="text-sm text-gray-500 py-1">{item.unit || "—"}</span>
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
                      ) : (
                        <div className="flex-1" />
                      )}
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
    </div>
  );
}

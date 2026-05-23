"use client";

import { useEffect, useState } from "react";
import { Plus, X, AlertTriangle, Minus, ShoppingCart, Check } from "lucide-react";
import type { PantryItem, ShoppingItem } from "@/lib/types";
import { STORE_LABELS, CATEGORIES, UNITS, getStoreLabel, getStoreColor } from "@/lib/types";
import { formatQuantity } from "@/lib/utils";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings";
import { unitsCompatible, convertUnit } from "@/lib/units";

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

async function deleteItem(id: string) {
  await fetch("/api/pantry", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

function namesMatch(a: string, b: string): boolean {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  return al.includes(bl) || bl.includes(al);
}

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  // Use modal state
  const [useModal, setUseModal] = useState<PantryItem | null>(null);
  const [useAmount, setUseAmount] = useState("");
  const [useAddToList, setUseAddToList] = useState(true);
  const [useListQty, setUseListQty] = useState("");
  const [useListUnit, setUseListUnit] = useState("");
  const [useListStore, setUseListStore] = useState("");
  const [useListCategory, setUseListCategory] = useState("");

  // Add-to-list modal state (for low-stock "Add to list" button)
  const [addListModal, setAddListModal] = useState<PantryItem | null>(null);
  const [addListQty, setAddListQty] = useState("");
  const [addListUnit, setAddListUnit] = useState("");
  const [addListStore, setAddListStore] = useState("");
  const [addListCategory, setAddListCategory] = useState("");

  // Tracks item IDs where "Add to list" was just tapped (for brief confirmation)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Default min = 3 so new items get a sensible low-stock threshold
  const [newItem, setNewItem] = useState({
    name: "", quantity: "", unit: "", min_quantity: "3", category: "other", store: "generic",
  });

  const [editValues, setEditValues] = useState<Record<string, {
    quantity: string; min_quantity: string; unit: string; category: string; store: string;
  }>>({});

  const userStores = settings.stores;
  const allStores = { ...STORE_LABELS, ...Object.fromEntries(Object.entries(userStores).map(([k, v]) => [k, v.name])) };

  async function load() {
    const [pantryRes, settingsRes, shoppingRes] = await Promise.all([
      fetch("/api/pantry"),
      fetch("/api/settings"),
      fetch("/api/shopping"),
    ]);
    const pantryData = await pantryRes.json();
    const settingsData = await settingsRes.json();
    const shoppingData = await shoppingRes.json();
    const allItems: PantryItem[] = pantryData.items || [];

    // Auto-clean any zero-quantity items left over from previous sessions
    const zeros = allItems.filter((i) => i.quantity <= 0);
    await Promise.all(zeros.map((i) => deleteItem(i.id)));
    setItems(allItems.filter((i) => i.quantity > 0));

    setShoppingItems(shoppingData.items || []);
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
    const newQty = parseFloat(vals.quantity) || 0;

    if (newQty <= 0) {
      await deleteItem(item.id);
      setEditing(null);
      await load();
      return;
    }

    await fetch("/api/pantry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        quantity: newQty,
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
        min_quantity: parseFloat(newItem.min_quantity) ?? 3,
        category: newItem.category,
        store: newItem.store || settings.defaultStore,
      }),
    });
    setNewItem({ name: "", quantity: "", unit: "", min_quantity: "3", category: "other", store: settings.defaultStore });
    setAdding(false);
    await load();
  }

  function openUseModal(item: PantryItem) {
    setUseModal(item);
    setUseAmount("");
    setUseAddToList(true);
    setUseListQty("");
    setUseListUnit(item.unit || "");
    setUseListStore(item.store);
    setUseListCategory(item.category);
  }

  function closeUseModal() {
    setUseModal(null);
    setUseAmount("");
  }

  /** Add qty to an existing unchecked shopping item (merging units if compatible), or POST a new one. */
  async function addOrMergeShoppingItem(
    name: string,
    qty: number | null,
    unit: string | null,
    store: string,
    category: string,
  ) {
    const existing = shoppingItems.find(
      (s) => !s.checked && !s.saved_for_later && namesMatch(name, s.name)
    );

    if (existing && unitsCompatible(unit, existing.unit)) {
      // Same unit family — merge quantities
      let addQty = qty ?? 0;
      if (qty && unit && existing.unit && unit.toLowerCase() !== existing.unit.toLowerCase()) {
        const converted = convertUnit(qty, unit, existing.unit);
        if (converted !== null) addQty = converted;
      }
      const newQty = existing.quantity !== null
        ? Math.round((existing.quantity + addQty) * 1000) / 1000
        : (addQty || null);
      await fetch("/api/shopping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existing.id, quantity: newQty }),
      });
    } else {
      // No compatible match — add new item
      await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity: qty, unit, store, category }),
      });
    }
  }

  async function handleUse() {
    if (!useModal) return;
    const amount = parseFloat(useAmount);
    if (!amount || amount <= 0) return;
    const newQty = Math.max(0, Math.round((useModal.quantity - amount) * 1000) / 1000);

    if (newQty <= 0) {
      await deleteItem(useModal.id);
      if (useAddToList) {
        await addOrMergeShoppingItem(
          useModal.name,
          parseFloat(useListQty) || null,
          useListUnit || null,
          useListStore,
          useListCategory,
        );
      }
    } else {
      await fetch("/api/pantry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: useModal.id, quantity: newQty }),
      });
    }
    closeUseModal();
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove from pantry?")) return;
    await deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function openAddListModal(item: PantryItem) {
    setAddListModal(item);
    setAddListQty("");
    setAddListUnit(item.unit || "");
    setAddListStore(item.store);
    setAddListCategory(item.category);
  }

  function closeAddListModal() {
    setAddListModal(null);
    setAddListQty("");
  }

  async function confirmAddToList() {
    if (!addListModal) return;
    const qty = parseFloat(addListQty) || null;
    const unit = addListUnit || null;

    await addOrMergeShoppingItem(
      addListModal.name, qty, unit, addListStore, addListCategory
    );

    // Flash "Added!" on the item card
    const itemId = addListModal.id;
    setAddedIds((prev) => new Set([...prev, itemId]));
    setTimeout(() => {
      setAddedIds((prev) => { const n = new Set(prev); n.delete(itemId); return n; });
    }, 2000);

    closeAddListModal();
    await load();
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

      {/* Low-stock summary banner */}
      {lowItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              {lowItems.length} item{lowItems.length !== 1 ? "s" : ""} running low
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lowItems.map((i) => (
              <span key={i.id} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {i.name}
              </span>
            ))}
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
              <label className="text-xs text-gray-500 mb-0.5 block">Min (alert)</label>
              <input type="number" placeholder="3" value={newItem.min_quantity}
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
              const justAdded = addedIds.has(item.id);
              const isOnList = shoppingItems.some(
                (s) => !s.checked && !s.saved_for_later && namesMatch(item.name, s.name)
              );
              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl overflow-hidden ${isLow ? "border-amber-400" : "border-gray-200"}`}
                >
                  {/* Main row */}
                  <div className="flex items-center justify-between px-3 pt-3 pb-2">
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStoreColor(item.store)}`}>
                        {getStoreLabel(item.store, userStores)}
                      </span>
                      {isOnList && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                          <ShoppingCart size={9} /> On list
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isEditing && (
                        <button
                          onClick={() => openUseModal(item)}
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

                  {/* Edit form */}
                  {isEditing && ev ? (
                    <div className="px-3 pb-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Have</label>
                          <input type="number" value={ev.quantity}
                            onChange={(e) => setEditValues((p) => ({ ...p, [item.id]: { ...p[item.id], quantity: e.target.value } }))}
                            className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Min (alert)</label>
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
                      <p className="text-[11px] text-gray-400">Setting quantity to 0 will remove this item from pantry.</p>
                    </div>
                  ) : (
                    <>
                      {/* Quantity row */}
                      <div className="px-3 pb-2">
                        <span className="text-xs text-gray-500">
                          {formatQuantity(item.quantity, item.unit)} on hand
                        </span>
                      </div>

                      {/* Low-stock alert strip */}
                      {isLow && (
                        <div className="bg-amber-50 border-t border-amber-200 px-3 py-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                            <span className="text-sm font-semibold text-amber-800">Running low</span>
                            <span className="text-xs text-amber-600 truncate">
                              · min is {formatQuantity(item.min_quantity, item.unit)}
                            </span>
                          </div>
                          <button
                            onClick={() => openAddListModal(item)}
                            disabled={justAdded}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
                              justAdded
                                ? "bg-green-500 text-white"
                                : "bg-amber-500 hover:bg-amber-600 text-white"
                            }`}
                          >
                            {justAdded
                              ? <><Check size={12} /> Added!</>
                              : <><ShoppingCart size={12} /> Add to list</>
                            }
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Use modal */}
      {useModal && (() => {
        const remaining = parseFloat(useAmount) > 0
          ? Math.max(0, Math.round((useModal.quantity - parseFloat(useAmount)) * 1000) / 1000)
          : null;
        const willEmpty = remaining !== null && remaining <= 0;
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm space-y-4 p-6">
              <div>
                <h3 className="font-semibold text-lg">{useModal.name}</h3>
                <p className="text-gray-500 text-sm">
                  Current stock: <strong>{formatQuantity(useModal.quantity, useModal.unit)}</strong>
                </p>
              </div>

              {/* Amount row */}
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
                {remaining !== null && !willEmpty && (
                  <p className="text-xs text-gray-400 mt-1">
                    Remaining: {formatQuantity(remaining, useModal.unit)}
                  </p>
                )}
              </div>

              {/* Empty-item alert + add-to-list form */}
              {willEmpty && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 overflow-hidden">
                  <div className="flex items-start gap-2 px-3 pt-3 pb-2">
                    <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-semibold text-amber-800">
                      This will remove <span className="italic">{useModal.name}</span> from your pantry.
                    </p>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => setUseAddToList((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 border-t border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-amber-900">Add to shopping list?</span>
                    <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${useAddToList ? "bg-indigo-500" : "bg-gray-300"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${useAddToList ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                  </button>

                  {/* Shopping list detail form */}
                  {useAddToList && (
                    <div className="px-3 pb-3 pt-2 border-t border-amber-200 space-y-2">
                      <div className="flex gap-2">
                        <div className="w-24">
                          <label className="text-[10px] text-amber-700 uppercase tracking-wide mb-0.5 block">Qty</label>
                          <input
                            type="number"
                            value={useListQty}
                            onChange={(e) => setUseListQty(e.target.value)}
                            placeholder="—"
                            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-amber-700 uppercase tracking-wide mb-0.5 block">Unit</label>
                          <UnitSelect
                            value={useListUnit}
                            onChange={setUseListUnit}
                            className="w-full border-amber-200 bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-700 uppercase tracking-wide mb-0.5 block">Store</label>
                        <select
                          value={useListStore}
                          onChange={(e) => setUseListStore(e.target.value)}
                          className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          {Object.entries(allStores).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-700 uppercase tracking-wide mb-0.5 block">Category</label>
                        <select
                          value={useListCategory}
                          onChange={(e) => setUseListCategory(e.target.value)}
                          className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeUseModal}
                  className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUse}
                  disabled={!useAmount || parseFloat(useAmount) <= 0}
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {willEmpty && useAddToList ? "Remove & add to list" : "Mark as used"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add-to-list modal (for low-stock "Add to list" button) */}
      {addListModal && (() => {
        const alreadyOnList = shoppingItems.some(
          (s) => !s.checked && !s.saved_for_later && namesMatch(addListModal.name, s.name)
        );
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm space-y-4 p-6">
              <div>
                <h3 className="font-semibold text-lg">Add to shopping list</h3>
                <p className="text-gray-500 text-sm">
                  {addListModal.name} · {formatQuantity(addListModal.quantity, addListModal.unit)} on hand
                </p>
              </div>

              {/* Qty + Unit */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">How much to buy?</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={addListQty}
                    onChange={(e) => setAddListQty(e.target.value)}
                    placeholder="—"
                    min={0}
                    step={0.5}
                    autoFocus
                    className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <UnitSelect
                    value={addListUnit}
                    onChange={setAddListUnit}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Store */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Store</label>
                <select
                  value={addListStore}
                  onChange={(e) => setAddListStore(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {Object.entries(allStores).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Category</label>
                <select
                  value={addListCategory}
                  onChange={(e) => setAddListCategory(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Already-on-list notice */}
              {alreadyOnList && (
                <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                  Already on your shopping list — quantity will be increased.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeAddListModal}
                  className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddToList}
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  {alreadyOnList ? "Update list" : "Add to list"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

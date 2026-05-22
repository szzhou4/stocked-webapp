"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Check, X, ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import type { ShoppingItem, Store } from "@/lib/types";
import { STORE_LABELS, STORE_COLORS, CATEGORIES } from "@/lib/types";
import { formatQuantity } from "@/lib/utils";
import { cn } from "@/lib/utils";

type GroupedItems = Record<Store, Record<string, ShoppingItem[]>>;

function groupItems(items: ShoppingItem[]): GroupedItems {
  const result = {} as GroupedItems;
  for (const item of items) {
    if (!result[item.store]) result[item.store] = {};
    if (!result[item.store][item.category]) result[item.store][item.category] = [];
    result[item.store][item.category].push(item);
  }
  return result;
}

const STORE_ORDER: Store[] = ["costco", "asian", "generic", "other"];

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedStores, setCollapsedStores] = useState<Set<string>>(new Set());
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [purchaseModal, setPurchaseModal] = useState<ShoppingItem | null>(null);
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", quantity: "", unit: "", store: "generic" as Store, category: "other" });

  async function load() {
    const res = await fetch("/api/shopping");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleStore(store: string) {
    setCollapsedStores((prev) => {
      const next = new Set(prev);
      next.has(store) ? next.delete(store) : next.add(store);
      return next;
    });
  }

  async function handleCheck(item: ShoppingItem) {
    setPurchaseModal(item);
    setPurchaseQty(item.quantity?.toString() || "");
    setPurchaseUnit(item.unit || "");
  }

  async function confirmPurchase() {
    if (!purchaseModal) return;
    setCheckingId(purchaseModal.id);
    await fetch("/api/shopping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: purchaseModal.id,
        checked: true,
        purchased_quantity: parseFloat(purchaseQty) || null,
        purchased_unit: purchaseUnit || null,
      }),
    });
    await load();
    setCheckingId(null);
    setPurchaseModal(null);
  }

  async function handleUncheck(item: ShoppingItem) {
    setCheckingId(item.id);
    await fetch("/api/shopping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, checked: false }),
    });
    await load();
    setCheckingId(null);
  }

  async function handleDelete(id: string) {
    await fetch("/api/shopping", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleAddManual() {
    if (!newItem.name.trim()) return;
    const res = await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newItem,
        quantity: parseFloat(newItem.quantity) || null,
      }),
    });
    if (res.ok) {
      await load();
      setNewItem({ name: "", quantity: "", unit: "", store: "generic", category: "other" });
      setAddingManual(false);
    }
  }

  async function clearChecked() {
    const checked = items.filter((i) => i.checked);
    await Promise.all(checked.map((i) =>
      fetch("/api/shopping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: i.id }),
      })
    ));
    await load();
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const grouped = groupItems(unchecked);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Shopping List</h1>
        <div className="flex items-center gap-2">
          {checked.length > 0 && (
            <button
              onClick={clearChecked}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              Clear {checked.length} done
            </button>
          )}
          <button
            onClick={() => setAddingManual((v) => !v)}
            className="flex items-center gap-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Manual add form */}
      {addingManual && (
        <div className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <input
            placeholder="Item name"
            value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-2">
            <input
              placeholder="Qty"
              type="number"
              value={newItem.quantity}
              onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
              className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <input
              placeholder="Unit"
              value={newItem.unit}
              onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))}
              className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <select
              value={newItem.store}
              onChange={(e) => setNewItem((p) => ({ ...p, store: e.target.value as Store }))}
              className="flex-1 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {Object.entries(STORE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <select
            value={newItem.category}
            onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={handleAddManual} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 transition-colors">
              Add item
            </button>
            <button onClick={() => setAddingManual(false)} className="px-3 py-2 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {unchecked.length === 0 && checked.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Shopping list is empty</p>
          <p className="text-sm mt-1">Add a recipe and tap &ldquo;Add to shopping list&rdquo;.</p>
        </div>
      )}

      {/* Grouped unchecked items */}
      {STORE_ORDER.filter((s) => grouped[s] && Object.keys(grouped[s]).length > 0).map((store) => (
        <div key={store} className="mb-4">
          <button
            onClick={() => toggleStore(store)}
            className="w-full flex items-center justify-between mb-2"
          >
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", STORE_COLORS[store])}>
              {STORE_LABELS[store]}
            </span>
            {collapsedStores.has(store) ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
          </button>

          {!collapsedStores.has(store) && Object.entries(grouped[store]).map(([category, catItems]) => (
            <div key={category} className="mb-3">
              <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-1.5 ml-1">{category}</p>
              <div className="space-y-1.5">
                {catItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5">
                    <button
                      onClick={() => handleCheck(item)}
                      disabled={checkingId === item.id}
                      className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-green-500 transition-colors shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{item.name}</span>
                      {(item.quantity || item.unit) && (
                        <span className="text-xs text-gray-400 ml-1.5">{formatQuantity(item.quantity, item.unit)}</span>
                      )}
                    </div>
                    <button onClick={() => handleDelete(item.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Checked items */}
      {checked.length > 0 && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">Done ({checked.length})</p>
          <div className="space-y-1.5">
            {checked.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 py-2.5 opacity-60">
                <button
                  onClick={() => handleUncheck(item)}
                  className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0"
                >
                  <Check size={12} className="text-white" />
                </button>
                <span className="flex-1 text-sm line-through text-gray-400">{item.name}</span>
                {item.purchased_quantity && (
                  <span className="text-xs text-gray-400">{formatQuantity(item.purchased_quantity, item.purchased_unit)}</span>
                )}
                <button onClick={() => handleDelete(item.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase modal */}
      {purchaseModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{purchaseModal.name}</h3>
              <p className="text-gray-500 text-sm">How much did you buy?</p>
            </div>
            <div className="flex gap-3">
              <input
                type="number"
                value={purchaseQty}
                onChange={(e) => setPurchaseQty(e.target.value)}
                placeholder="Amount"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                value={purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value)}
                placeholder="Unit"
                className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPurchaseModal(null)}
                className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

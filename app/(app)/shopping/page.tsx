"use client";

import { useEffect, useState } from "react";
import { Plus, Check, X, ChevronDown, ChevronUp, ShoppingBag, Pencil, Share2, Bookmark, RotateCcw, Store, LayoutList } from "lucide-react";
import type { ShoppingItem } from "@/lib/types";
import { STORE_LABELS, STORE_COLORS, CATEGORIES, UNITS, getStoreLabel, getStoreColor } from "@/lib/types";
import { formatQuantity } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings";

type GroupedItems = Record<string, Record<string, ShoppingItem[]>>;

function groupItems(items: ShoppingItem[]): GroupedItems {
  const result: GroupedItems = {};
  for (const item of items) {
    if (!result[item.store]) result[item.store] = {};
    if (!result[item.store][item.category]) result[item.store][item.category] = [];
    result[item.store][item.category].push(item);
  }
  return result;
}

// Category → items (sorted within each category by store then name)
type CategoryGrouped = Record<string, ShoppingItem[]>;

function groupByCategory(items: ShoppingItem[]): CategoryGrouped {
  const result: CategoryGrouped = {};
  for (const item of items) {
    if (!result[item.category]) result[item.category] = [];
    result[item.category].push(item);
  }
  // Sort items within each category: by store key, then name
  for (const cat of Object.keys(result)) {
    result[cat].sort((a, b) => a.store.localeCompare(b.store) || a.name.localeCompare(b.name));
  }
  return result;
}

type SortMode = "store" | "category";

function UnitSelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const isCustom = value && !UNITS.includes(value as typeof UNITS[number]);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={cn("border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500", className)}>
      <option value="">— unit —</option>
      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      {isCustom && <option value={value}>{value}</option>}
    </select>
  );
}

function buildExportText(
  items: ShoppingItem[],
  userStores: UserSettings["stores"],
): string {
  const active = items.filter((i) => !i.checked && !i.saved_for_later);
  if (!active.length) return "Shopping list is empty.";

  const grouped: Record<string, ShoppingItem[]> = {};
  for (const item of active) {
    if (!grouped[item.store]) grouped[item.store] = [];
    grouped[item.store].push(item);
  }

  const lines: string[] = ["🛒 Shopping List", ""];
  for (const [store, storeItems] of Object.entries(grouped)) {
    const label = userStores[store]?.name ?? STORE_LABELS[store] ?? store;
    lines.push(`📍 ${label}`);
    for (const item of storeItems) {
      const qty = item.quantity || item.unit ? ` (${formatQuantity(item.quantity, item.unit)})` : "";
      lines.push(`  ☐ ${item.name}${qty}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function ItemRow({
  item, checkingId, onCheck, onSave, onEdit, onDelete, showStoreBadge, userStores,
}: {
  item: ShoppingItem;
  checkingId: string | null;
  onCheck: (item: ShoppingItem) => void;
  onSave: (item: ShoppingItem) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
  showStoreBadge?: boolean;
  userStores?: UserSettings["stores"];
}) {
  return (
    <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2.5">
      <button
        onClick={() => onCheck(item)}
        disabled={checkingId === item.id}
        className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-indigo-500 transition-colors shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{item.name}</span>
        {(item.quantity || item.unit) && (
          <span className="text-xs text-gray-400 ml-1.5">{formatQuantity(item.quantity, item.unit)}</span>
        )}
      </div>
      {showStoreBadge && (
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0", getStoreColor(item.store))}>
          {getStoreLabel(item.store, userStores ?? {})}
        </span>
      )}
      <button onClick={() => onSave(item)} className="text-gray-300 hover:text-amber-500 transition-colors p-1" title="Save for later">
        <Bookmark size={13} />
      </button>
      <button onClick={() => onEdit(item)} className="text-gray-300 hover:text-indigo-500 transition-colors p-1">
        <Pencil size={13} />
      </button>
      <button onClick={() => onDelete(item.id)} className="text-gray-200 hover:text-red-400 transition-colors p-1">
        <X size={14} />
      </button>
    </div>
  );
}

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("store");
  const [collapsedStores, setCollapsedStores] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // Purchase confirmation modal
  const [purchaseModal, setPurchaseModal] = useState<ShoppingItem | null>(null);
  const [purchaseName, setPurchaseName] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState("");

  // Edit modal
  const [editModal, setEditModal] = useState<ShoppingItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editStore, setEditStore] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Re-add to list modal (from Save for Later)
  const [reAddModal, setReAddModal] = useState<ShoppingItem | null>(null);
  const [reAddQty, setReAddQty] = useState("");
  const [reAddUnit, setReAddUnit] = useState("");
  const [reAddStore, setReAddStore] = useState("");
  const [reAddCategory, setReAddCategory] = useState("");

  // Export modal
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);

  // Manual add form
  const [addingManual, setAddingManual] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", quantity: "", unit: "", store: "generic", category: "other" });

  const userStores = settings.stores;
  const allStoreLabels = { ...STORE_LABELS, ...Object.fromEntries(Object.entries(userStores).map(([k, v]) => [k, v.name])) };
  const storeOrder = Object.keys(allStoreLabels);

  async function load() {
    const [shoppingRes, settingsRes] = await Promise.all([
      fetch("/api/shopping"),
      fetch("/api/settings"),
    ]);
    const shoppingData = await shoppingRes.json();
    const settingsData = await settingsRes.json();
    setItems(shoppingData.items || []);
    if (settingsData.settings) setSettings(settingsData.settings);
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

  function toggleCategory(cat: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function openPurchaseModal(item: ShoppingItem) {
    setPurchaseModal(item);
    setPurchaseName(item.name);
    setPurchaseQty(item.quantity?.toString() || "");
    setPurchaseUnit(item.unit || "");
  }

  function openEditModal(item: ShoppingItem) {
    setEditModal(item);
    setEditName(item.name);
    setEditQty(item.quantity?.toString() || "");
    setEditUnit(item.unit || "");
    setEditStore(item.store);
    setEditCategory(item.category);
  }

  function openReAddModal(item: ShoppingItem) {
    setReAddModal(item);
    setReAddQty(item.quantity?.toString() || "");
    setReAddUnit(item.unit || "");
    setReAddStore(item.store);
    setReAddCategory(item.category);
  }

  async function confirmPurchase() {
    if (!purchaseModal) return;
    setCheckingId(purchaseModal.id);
    await fetch("/api/shopping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: purchaseModal.id,
        name: purchaseName !== purchaseModal.name ? purchaseName : undefined,
        checked: true,
        purchased_quantity: parseFloat(purchaseQty) || null,
        purchased_unit: purchaseUnit || null,
      }),
    });
    await load();
    setCheckingId(null);
    setPurchaseModal(null);
  }

  async function confirmEdit() {
    if (!editModal) return;
    await fetch("/api/shopping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editModal.id,
        name: editName,
        quantity: parseFloat(editQty) || null,
        unit: editUnit || null,
        store: editStore,
        category: editCategory,
      }),
    });
    await load();
    setEditModal(null);
  }

  async function saveForLater(item: ShoppingItem) {
    await fetch("/api/shopping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, saved_for_later: true }),
    });
    await load();
  }

  async function confirmReAdd() {
    if (!reAddModal) return;
    await fetch("/api/shopping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: reAddModal.id,
        saved_for_later: false,
        quantity: parseFloat(reAddQty) || null,
        unit: reAddUnit || null,
        store: reAddStore,
        category: reAddCategory,
      }),
    });
    await load();
    setReAddModal(null);
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
      body: JSON.stringify({ ...newItem, quantity: parseFloat(newItem.quantity) || null }),
    });
    if (res.ok) {
      await load();
      setNewItem({ name: "", quantity: "", unit: "", store: settings.defaultStore || "generic", category: "other" });
      setAddingManual(false);
    }
  }

  async function clearChecked() {
    await Promise.all(items.filter((i) => i.checked).map((i) =>
      fetch("/api/shopping", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: i.id }) })
    ));
    await load();
  }

  async function handleCopy() {
    const text = buildExportText(items, userStores);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    const text = buildExportText(items, userStores);
    if (navigator.share) {
      await navigator.share({ title: "Shopping List", text });
    } else {
      await handleCopy();
    }
  }

  const unchecked = items.filter((i) => !i.checked && !i.saved_for_later);
  const checked = items.filter((i) => i.checked);
  const savedForLater = items.filter((i) => i.saved_for_later && !i.checked);
  const grouped = groupItems(unchecked);
  const groupedByCategory = groupByCategory(unchecked);
  const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => a.localeCompare(b));
  const exportText = buildExportText(items, userStores);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Shopping List</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unchecked.length} to buy{checked.length > 0 ? ` · ${checked.length} done` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {checked.length > 0 && (
            <button onClick={clearChecked} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Clear done
            </button>
          )}
          {(unchecked.length > 0 || savedForLater.length > 0) && (
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 border rounded-xl px-3 py-2 hover:border-indigo-300 transition-colors"
            >
              <Share2 size={14} /> Export
            </button>
          )}
          <button
            onClick={() => setAddingManual((v) => !v)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Sort mode toggle */}
      {unchecked.length > 0 && (
        <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setSortMode("store")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              sortMode === "store" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Store size={12} /> By store
          </button>
          <button
            onClick={() => setSortMode("category")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              sortMode === "category" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <LayoutList size={12} /> By category
          </button>
        </div>
      )}

      {/* Manual add form */}
      {addingManual && (
        <div className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <input
            placeholder="Item name" value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <input
              placeholder="Qty" type="number" value={newItem.quantity}
              onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
              className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <UnitSelect value={newItem.unit} onChange={(v) => setNewItem((p) => ({ ...p, unit: v }))} className="flex-1" />
            <select value={newItem.store} onChange={(e) => setNewItem((p) => ({ ...p, store: e.target.value }))}
              className="flex-1 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {Object.entries(allStoreLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <select value={newItem.category} onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={handleAddManual} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
              Add item
            </button>
            <button onClick={() => setAddingManual(false)} className="px-3 py-2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {unchecked.length === 0 && checked.length === 0 && savedForLater.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Shopping list is empty</p>
          <p className="text-sm mt-1">Add a recipe and tap &ldquo;Add to shopping list&rdquo;.</p>
        </div>
      )}

      {/* Grouped by store */}
      {sortMode === "store" && storeOrder.filter((s) => grouped[s] && Object.keys(grouped[s]).length > 0).map((store) => (
        <div key={store} className="mb-4">
          <button onClick={() => toggleStore(store)} className="w-full flex items-center justify-between mb-2">
            <span className={cn("px-2.5 py-1 rounded-full text-sm font-semibold", getStoreColor(store))}>
              {getStoreLabel(store, userStores)}
            </span>
            {collapsedStores.has(store)
              ? <ChevronDown size={16} className="text-gray-400" />
              : <ChevronUp size={16} className="text-gray-400" />
            }
          </button>

          {!collapsedStores.has(store) && Object.entries(grouped[store]).map(([category, catItems]) => (
            <div key={category} className="mb-3">
              <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-1.5 ml-1">{category}</p>
              <div className="space-y-1.5">
                {catItems.map((item) => (
                  <ItemRow key={item.id} item={item} checkingId={checkingId}
                    onCheck={openPurchaseModal} onSave={saveForLater}
                    onEdit={openEditModal} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Grouped by category */}
      {sortMode === "category" && sortedCategories.map((cat) => (
        <div key={cat} className="mb-4">
          <button onClick={() => toggleCategory(cat)} className="w-full flex items-center justify-between mb-2">
            <span className="px-2.5 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 capitalize">
              {cat}
            </span>
            {collapsedCategories.has(cat)
              ? <ChevronDown size={16} className="text-gray-400" />
              : <ChevronUp size={16} className="text-gray-400" />
            }
          </button>

          {!collapsedCategories.has(cat) && (
            <div className="space-y-1.5">
              {groupedByCategory[cat].map((item) => (
                <ItemRow key={item.id} item={item} checkingId={checkingId}
                  onCheck={openPurchaseModal} onSave={saveForLater}
                  onEdit={openEditModal} onDelete={handleDelete}
                  showStoreBadge userStores={userStores} />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Checked items */}
      {checked.length > 0 && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">Done ({checked.length})</p>
          <div className="space-y-1.5">
            {checked.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 py-2.5 opacity-60">
                <button onClick={() => handleUncheck(item)} className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
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

      {/* Save for Later section */}
      {savedForLater.length > 0 && (
        <div className="mt-8 border-t pt-5">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-3">Saved for later ({savedForLater.length})</p>
          <div className="space-y-2">
            {savedForLater.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 py-1.5">
                <div className="min-w-0">
                  <span className="text-sm text-gray-500">{item.name}</span>
                  {(item.quantity || item.unit) && (
                    <span className="text-xs text-gray-400 ml-1.5">{formatQuantity(item.quantity, item.unit)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openReAddModal(item)}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <RotateCcw size={11} /> Re-add to list
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase confirmation modal */}
      {purchaseModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Confirm purchase</h3>
              <p className="text-gray-500 text-sm">Edit name if substituting, then confirm amount.</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Item name</label>
              <input value={purchaseName} onChange={(e) => setPurchaseName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {purchaseName !== purchaseModal.name && (
                <p className="text-xs text-indigo-500 mt-1">Will be saved to pantry as &ldquo;{purchaseName}&rdquo;</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Amount purchased</label>
              <div className="flex gap-3">
                <input type="number" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} placeholder="Qty"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <UnitSelect value={purchaseUnit} onChange={setPurchaseUnit} className="w-28" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPurchaseModal(null)} className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmPurchase} className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit item modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-lg">Edit item</h3>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Qty</label>
                <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Unit</label>
                <UnitSelect value={editUnit} onChange={setEditUnit} className="w-full" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Store</label>
              <select value={editStore} onChange={(e) => setEditStore(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {Object.entries(allStoreLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Category</label>
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditModal(null)} className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmEdit} className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Re-add to list modal */}
      {reAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Re-add to list</h3>
              <p className="text-gray-500 text-sm">{reAddModal.name}</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Qty</label>
                <input type="number" value={reAddQty} onChange={(e) => setReAddQty(e.target.value)} placeholder="—"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Unit</label>
                <UnitSelect value={reAddUnit} onChange={setReAddUnit} className="w-full" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Store</label>
              <select value={reAddStore} onChange={(e) => setReAddStore(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {Object.entries(allStoreLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Category</label>
              <select value={reAddCategory} onChange={(e) => setReAddCategory(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReAddModal(null)} className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmReAdd} className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700">Add to list</button>
            </div>
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Export list</h3>
              <button onClick={() => setShowExport(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <pre className="bg-gray-50 border rounded-xl p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
              {exportText}
            </pre>
            <p className="text-xs text-gray-400">Saved-for-later items are not included.</p>
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {copied ? "Copied!" : "Copy text"}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 size={14} /> Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

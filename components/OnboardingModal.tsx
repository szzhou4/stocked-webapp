"use client";

import { useState } from "react";
import {
  ChefHat, BookOpen, Package, ShoppingCart, Settings,
  Link2, Camera, Type, Tag, CheckCircle2, ArrowRight, X,
} from "lucide-react";

interface Slide {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}

const slides: Slide[] = [
  {
    icon: <ChefHat className="w-10 h-10 text-indigo-600" />,
    title: "Welcome to Stocked 👋",
    body: (
      <div>
        <p className="text-gray-500 text-sm mb-5 leading-relaxed">
          Your kitchen, organized. Import recipes, track your pantry, and build
          smart shopping lists — all in one place.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <BookOpen size={18} className="text-indigo-500" />, label: "Recipes", desc: "Import & search" },
            { icon: <Package size={18} className="text-emerald-500" />, label: "Pantry", desc: "Track what you have" },
            { icon: <ShoppingCart size={18} className="text-amber-500" />, label: "Shopping", desc: "Smart lists" },
            { icon: <Settings size={18} className="text-gray-400" />, label: "Settings", desc: "Customize stores" },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="shrink-0">{icon}</div>
              <div>
                <p className="text-xs font-semibold text-gray-800">{label}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <BookOpen className="w-10 h-10 text-indigo-600" />,
    title: "Import any recipe",
    body: (
      <div className="space-y-4">
        <p className="text-gray-500 text-sm leading-relaxed">
          Add recipes from a URL, a photo, or by pasting text. Claude AI reads
          the ingredients and organizes them by store and category automatically.
        </p>
        <div className="space-y-2">
          {[
            { icon: <Link2 size={14} className="text-indigo-400" />, label: "Paste a URL", desc: "Any recipe website" },
            { icon: <Camera size={14} className="text-indigo-400" />, label: "Take a photo", desc: "Cookbooks, handwritten cards" },
            { icon: <Type size={14} className="text-indigo-400" />, label: "Paste text", desc: "Copy from anywhere" },
            { icon: <Tag size={14} className="text-indigo-400" />, label: "Tags + search", desc: "Find recipes fast by ingredient or tag" },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">{icon}</div>
              <span className="font-medium text-gray-800">{label}</span>
              <span className="text-gray-400 text-xs">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <Package className="w-10 h-10 text-emerald-500" />,
    title: "Track your pantry",
    body: (
      <div className="space-y-3 text-sm text-gray-500 leading-relaxed">
        <p>
          Add items as you stock up and set minimum quantities for low-stock
          alerts. Stocked will remind you when something is running low.
        </p>
        <p>
          When you mark a recipe as cooked, Stocked automatically deducts
          the ingredients you used — keeping your pantry accurate without
          any manual updates.
        </p>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-xs text-emerald-700 font-medium">
          Tip: units matter. Set a unit on each pantry item so Stocked can
          convert recipe quantities correctly (e.g. tbsp vs. cups).
        </div>
      </div>
    ),
  },
  {
    icon: <ShoppingCart className="w-10 h-10 text-amber-500" />,
    title: "Smart shopping lists",
    body: (
      <div className="space-y-3 text-sm text-gray-500 leading-relaxed">
        <p>
          Missing ingredients get added to your shopping list automatically
          when you plan to cook a recipe. You can also add items manually
          any time.
        </p>
        <p>
          Check items off as you shop. When you tap <strong className="text-gray-700">Checkout</strong>,
          everything purchased moves to your pantry — no double-entry needed.
        </p>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs text-amber-700 font-medium">
          Items are grouped by store so you can move through the aisles
          without backtracking.
        </div>
      </div>
    ),
  },
  {
    icon: <CheckCircle2 className="w-10 h-10 text-indigo-600" />,
    title: "You're all set!",
    body: (
      <div className="space-y-3 text-sm text-gray-500 leading-relaxed">
        <p>
          Head to <strong className="text-gray-700">Settings</strong> to customize your store
          categories, recipe tags, and the ingredients Claude should skip when
          importing.
        </p>
        <p>
          Start by importing a recipe — paste a link, snap a photo, or paste
          some text. The AI handles the rest.
        </p>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 text-xs text-indigo-700 font-medium">
          This app is in testing. Please use a unique password you don&apos;t
          use anywhere else.
        </div>
      </div>
    ),
  },
];

interface Props {
  onDismiss: () => void;
}

export default function OnboardingModal({ onDismiss }: Props) {
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;
  const slide = slides[index];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onDismiss} />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Skip button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors z-10"
          aria-label="Skip onboarding"
        >
          <X size={18} />
        </button>

        {/* Indigo top bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((index + 1) / slides.length) * 100}%` }}
          />
        </div>

        <div className="px-6 pt-6 pb-5">
          {/* Icon */}
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            {slide.icon}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-3">{slide.title}</h2>

          {/* Body */}
          <div className="min-h-[160px]">{slide.body}</div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {/* Dots */}
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`rounded-full transition-all ${
                    i === index
                      ? "w-4 h-2 bg-indigo-600"
                      : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  onClick={() => setIndex((i) => i - 1)}
                  className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5"
                >
                  Back
                </button>
              )}
              <button
                onClick={isLast ? onDismiss : () => setIndex((i) => i + 1)}
                className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                {isLast ? "Get started" : "Next"}
                {!isLast && <ArrowRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

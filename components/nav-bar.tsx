"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ShoppingCart, Package, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/recipes", label: "Recipes", Icon: BookOpen },
  { href: "/shopping", label: "Shopping", Icon: ShoppingCart },
  { href: "/pantry", label: "Pantry", Icon: Package },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-2.5"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-full transition-colors",
                  active ? "bg-indigo-50" : ""
                )}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 1.75}
                  className={active ? "text-indigo-600" : "text-gray-400"}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  active ? "text-indigo-600" : "text-gray-400"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

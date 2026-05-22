"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ShoppingCart, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/recipes", label: "Recipes", Icon: BookOpen },
  { href: "/shopping", label: "Shopping", Icon: ShoppingCart },
  { href: "/pantry", label: "Pantry", Icon: Package },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="flex">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                active ? "text-green-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

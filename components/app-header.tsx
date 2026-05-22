import Link from "next/link";
import { ChefHat } from "lucide-react";
import LogoutButton from "@/components/logout-button";

export default function AppHeader() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/recipes" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Stocked</div>
            <div className="text-sm font-semibold text-gray-900">Your Kitchen</div>
          </div>
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}

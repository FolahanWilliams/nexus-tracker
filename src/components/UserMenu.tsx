'use client';

import { User } from "lucide-react";

export default function UserMenu() {
    return (
        <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <User size={20} className="text-white" />
            </div>
            <div className="flex-1 text-left">
                <p className="font-medium text-sm">Guest User</p>
                <p className="text-xs text-white/50">Sign in to save progress</p>
            </div>
        </button>
    );
}

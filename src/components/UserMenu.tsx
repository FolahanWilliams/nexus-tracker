
'use client';

import { signIn, signOut, useSession } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import Image from "next/image";

export default function UserMenu() {
    const { data: session } = useSession();

    if (session?.user) {
        return (
            <div className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden border border-white/10">
                    {session.user.image ? (
                        <Image
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            width={40}
                            height={40}
                            className="object-cover"
                        />
                    ) : (
                        <User size={20} className="text-white" />
                    )}
                </div>
                <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sm truncate">{session.user.name}</p>
                    <p className="text-xs text-white/50 truncate">{session.user.email}</p>
                </div>
                <button
                    onClick={() => signOut()}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-2 text-white/50 hover:text-white transition-opacity bg-black/50 rounded-lg"
                    title="Sign Out"
                >
                    <LogOut size={16} />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn("google")}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition-all shadow-lg shadow-indigo-500/25"
        >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <User size={20} />
            </div>
            <div className="text-left">
                <p className="font-bold text-sm">Sign In</p>
                <p className="text-xs text-white/70">Sync your progress</p>
            </div>
        </button>
    );
}

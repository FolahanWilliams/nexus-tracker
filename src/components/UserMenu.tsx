import { useEffect, useState } from "react";
import { User } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";

export default function UserMenu() {
    const [user, setUser] = useState<SupabaseUser | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async () => {
        if (user) {
            await supabase.auth.signOut();
        } else {
            // For personal use, OAuth is easiest (needs setup in Supabase dashboard)
            await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
        }
    };

    return (
        <button onClick={handleLogin} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                {user?.user_metadata?.avatar_url ? (
                    <Image src={user.user_metadata.avatar_url} alt="Avatar" width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                    <User size={20} className="text-white" />
                )}
            </div>
            <div className="flex-1 text-left">
                <p className="font-medium text-sm">{user ? user.user_metadata?.full_name || user.email : "Guest User"}</p>
                <p className="text-xs text-white/50">{user ? "Sign out" : "Sign in to save progress"}</p>
            </div>
        </button>
    );
}

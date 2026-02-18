"use client";

import { useBrandStore } from "@/store/brand-store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ className }: { className?: string }) {
    const router = useRouter();
    const { reset } = useBrandStore();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        reset(); // Clear store
        router.push("/login"); // Middleware will handle redirect to login
        router.refresh();
    };

    return (
        <Button
            variant="ghost"
            onClick={handleLogout}
            className={`text-red-400 hover:text-red-300 hover:bg-red-950/30 font-bold uppercase tracking-wider ${className}`}
        >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
        </Button>
    );
}

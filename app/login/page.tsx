'use strict';

'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ... existing imports

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'signin' | 'signup'>('signup'); // Default to signup for "new for everyone" feel
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        const supabase = createClient();

        if (mode === 'signup') {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            });

            if (signUpError) {
                setError(signUpError.message);
            } else {
                // If email confirmation is disabled (as requested), this logs them in immediately
                // In some configs, it might require email verification. 
                // We assume user turned off "Confirm Email" in Supabase as instructed.
                alert('Account created! transitioning...');
                router.refresh();
                // The middleware/auth state change will handle the redirect
            }
        } else {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                setError(signInError.message);
            } else {
                router.push('/onboarding'); // Explicitly push to onboarding check
            }
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        });

        if (error) setError(error.message);
        setLoading(false);
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-background-dark px-4 py-4 sm:px-6">
            <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-gray-400 transition-colors hover:text-white">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="hidden text-sm font-bold uppercase tracking-widest sm:inline-block">Back to Home</span>
                </Link>
            </div>

            <div className="w-full max-w-md space-y-6 sm:space-y-8">
                <div className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/tref.png" alt="tref Logo" className="mx-auto h-16 w-16 object-contain mb-6" />
                    <h2 className="text-[clamp(1.8rem,7vw,2.25rem)] font-black uppercase tracking-tighter text-white">
                        {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className="mt-2 text-gray-400">
                        {mode === 'signup' ? 'Enter the factory.' : 'Sign in to generate.'}
                    </p>
                </div>

                <div className="relative overflow-hidden rounded-3xl border-4 border-white/10 bg-[#222f49] p-5 shadow-2xl sm:p-8">
                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>

                    <div className="relative z-10 space-y-6">
                        <Button
                            onClick={handleGoogleLogin}
                            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border-2 border-white/20 bg-white text-base font-bold text-black hover:bg-gray-100 sm:h-14 sm:text-lg"
                            disabled={loading}
                        >
                            {/* Google SVG */}
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            Continue with Google
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#222f49] px-2 text-gray-500 font-bold tracking-widest">Or via Email</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white text-xs font-bold uppercase tracking-widest">Email address</Label>
                                <input id="email" name="email" type="email" tabIndex={1} autoComplete="email" required className="w-full rounded-xl border-4 border-transparent bg-black/30 px-4 py-3 text-white placeholder-gray-500 shadow-inner transition-all focus:border-primary focus:bg-black/50 focus:outline-none" placeholder="you@example.com" disabled={loading} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white text-xs font-bold uppercase tracking-widest">Password</Label>
                                <input id="password" name="password" type="password" tabIndex={2} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required className="w-full rounded-xl border-4 border-transparent bg-black/30 px-4 py-3 text-white placeholder-gray-500 shadow-inner transition-all focus:border-primary focus:bg-black/50 focus:outline-none" placeholder="••••••••" disabled={loading} />
                            </div>

                            {error && (
                                <div className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="h-12 w-full rounded-xl bg-primary font-bold text-white shadow-neo-primary hover:bg-primary/90"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'signup' ? "Create Account" : "Sign In")}
                            </Button>
                        </form>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(mode === 'signup' ? 'signin' : 'signup');
                                    setError(null);
                                }}
                                className="text-sm text-gray-400 hover:text-white underline decoration-dashed underline-offset-4"
                            >
                                {mode === 'signup' ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Pen, Download, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/auth/LogoutButton";

export default function Dashboard() {
    const { profile } = useBrandStore();
    const colors = profile.colors || { primaryText: "#1e293b", background: "#3b82f6" };

    return (
        <div className="min-h-screen bg-background-dark px-4 py-5 text-white font-display sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <header className="flex flex-col items-start justify-between gap-4 border-b-2 border-white/10 pb-6 md:flex-row md:items-center md:gap-6 md:pb-8">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link href="/">
                            <Button variant="outline" className="rounded-full h-12 w-12 p-0 border-2 border-white/20 hover:bg-white/10 hover:text-white hover:border-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <div className="inline-flex items-center px-3 py-1 rounded-full border border-pop-green/30 bg-pop-green/10 text-pop-green text-xs font-bold uppercase tracking-widest mb-1">
                                <span className="w-2 h-2 rounded-full bg-pop-green animate-pulse mr-2"></span>
                                Live Dashboard
                            </div>
                            <h1 className="text-[clamp(2rem,8vw,2.25rem)] font-black uppercase tracking-tighter">The Factory</h1>
                        </div>
                    </div>
                    <LogoutButton />
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Col: Brand Profile (The Lever) */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="relative overflow-hidden rounded-3xl border-4 border-white/10 bg-[#222f49] p-5 shadow-2xl sm:p-8">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "16px 16px" }}></div>

                            <div className="relative z-10 text-center">
                                <div className="mx-auto w-24 h-24 rounded-full border-4 border-white bg-white/5 flex items-center justify-center mb-6 shadow-neo">
                                    {profile.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={profile.logo_url} alt="Logo" className="w-16 h-16 object-contain" />
                                    ) : (
                                        <span className="text-3xl font-black text-white/20">?</span>
                                    )}
                                </div>
                                <h2 className="text-2xl font-black text-white mb-1">{profile.business_name || "Your Brand"}</h2>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{profile.tagline || "No Tagline"}</p>

                                {/* Color Palette Mini */}
                                <div className="flex justify-center gap-2 mt-6">
                                    <div className="w-8 h-8 rounded-full border-2 border-white/20" style={{ backgroundColor: colors.primaryText }} title="Text Color"></div>
                                    <div className="w-8 h-8 rounded-full border-2 border-white/20" style={{ backgroundColor: colors.background }} title="Background"></div>
                                </div>
                            </div>
                        </div>

                        {/* Control Panel / Lever */}
                        <div className="relative rounded-3xl border-4 border-black bg-pop-yellow p-5 text-black shadow-neo-dark sm:p-6">
                            <h3 className="font-black uppercase text-xl mb-4">Control Deck</h3>
                            <button className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl bg-black py-3 font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-gray-800 sm:py-4">
                                <RotateCw className="w-5 h-5" />
                                Regenerate All
                            </button>
                        </div>
                    </div>

                    {/* Right Col: Asset Grid */}
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Generic Asset Card 1 */}
                            <div className="group relative flex min-h-80 flex-col rounded-3xl border-4 border-white bg-white p-5 shadow-neo-primary transition-transform duration-300 hover:-translate-y-2 sm:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-black text-white px-3 py-1 rounded text-xs font-bold uppercase">Business Card</div>
                                    <MoreHorizontal className="text-black cursor-pointer" />
                                </div>
                                <div className="flex-1 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 overflow-hidden relative group-hover:border-primary transition-colors">
                                    {/* Mock Content */}
                                    <div className="bg-white/90 backdrop-blur p-6 rounded-lg shadow-lg text-center relative z-10 w-4/5">
                                        <div className="w-8 h-8 rounded-full mx-auto mb-3" style={{ backgroundColor: colors.background }}></div>
                                        <p className="font-black text-black text-xl uppercase leading-none mb-1">{profile.business_name || "BRAND"}</p>
                                        <p className="text-xs text-gray-500 font-bold tracking-widest">EST. 2024</p>
                                    </div>
                                    {/* Accent Blob */}
                                    <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-20" style={{ backgroundColor: colors.background }}></div>
                                </div>
                                <div className="flex gap-2">
                                    <Button className="flex-1 bg-primary text-white font-bold rounded-lg hover:bg-blue-700">Download PNG</Button>
                                    <Button variant="ghost" className="aspect-square bg-gray-100 rounded-lg text-black hover:bg-gray-200 p-0">
                                        <Pen className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Generic Asset Card 2 */}
                            <div className="group relative flex min-h-80 flex-col rounded-3xl border-4 border-black bg-pop-pink p-5 shadow-neo-dark transition-transform duration-300 hover:-translate-y-2 sm:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-white text-black px-3 py-1 rounded text-xs font-bold uppercase">Instagram Post</div>
                                    <MoreHorizontal className="text-black cursor-pointer" />
                                </div>
                                <div className="flex-1 bg-black rounded-xl border-2 border-black flex items-center justify-center mb-4 overflow-hidden relative">
                                    <h3
                                        className="relative z-10 font-black text-white text-4xl text-center px-4 leading-none uppercase italic"
                                        style={{ textShadow: `2px 2px 0px ${colors.background}` }}
                                    >
                                        We Are<br />Live.
                                    </h3>
                                </div>
                                <div className="flex gap-2">
                                    <Button className="flex-1 bg-black text-white font-bold rounded-lg hover:bg-gray-800">Download PNG</Button>
                                    <Button variant="ghost" className="aspect-square bg-white/20 rounded-lg text-black hover:bg-white/40 p-0">
                                        <Pen className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

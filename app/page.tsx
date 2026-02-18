import { Wand2, Rocket, RotateCw, MoreHorizontal, Pen, Download, LogIn, UserPlus, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let brand = null;
  if (user) {
    const { data } = await supabase
      .from('brands')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    brand = data;
  }

  const destination = brand ? "/dashboard" : "/onboarding";
  const buttonText = brand ? "Dashboard" : "Finish Setup";

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark text-white font-display overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b-2 border-white/10 bg-background-dark/80 px-4 py-3 backdrop-blur-md sm:px-6 md:px-12 lg:px-20">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tref.jpg" alt="tref Logo" className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
          {/* <h2 className="text-2xl font-black tracking-tighter text-white">tref</h2> */}
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a className="text-sm font-bold hover:text-primary transition-colors" href="#">Features</a>
          <a className="text-sm font-bold hover:text-primary transition-colors" href="#">Pricing</a>
          <a className="text-sm font-bold hover:text-primary transition-colors" href="#">Showcase</a>
        </nav>
        {user ? (
          <Link href={destination} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-black shadow-neo-primary transition-transform active:translate-y-1 active:shadow-none hover:bg-gray-100 sm:px-6 sm:text-sm">
            <LayoutDashboard className="w-4 h-4" />
            {buttonText}
          </Link>
        ) : (
          <Link href="/login" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-black shadow-neo-primary transition-transform active:translate-y-1 active:shadow-none hover:bg-gray-100 sm:px-6 sm:text-sm">
            <LogIn className="w-4 h-4" />
            Log In
          </Link>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pt-10 pb-16 sm:px-6 md:px-12 md:pt-20 lg:px-20 lg:pb-32">
          {/* Background decorative blobs */}
          <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-primary/20 blur-[100px]"></div>
          <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-pop-pink/10 blur-[100px]"></div>

          <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="flex flex-col gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <span className="flex size-2 rounded-full bg-pop-green animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-pop-green">V 2.0 Now Live</span>
              </div>
              <h1 className="text-[clamp(2.35rem,12vw,6rem)] font-black leading-[0.9] tracking-tighter text-white">
                BUILD YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-pop-teal to-primary bg-[200%_auto] animate-[gradient_3s_linear_infinite]">BRAND.</span><br />
                GENERATE <span className="text-stroke text-transparent">EVERYTHING.</span>
              </h1>
              <p className="max-w-xl text-[clamp(1rem,3.5vw,1.25rem)] font-medium leading-relaxed text-gray-400">
                The funnest way to make boring business assets. Stop wasting hours in design tools. Let the penguin do the heavy lifting.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:gap-4 sm:pt-4">
                {user ? (
                  <>
                    <Link href="/dashboard" className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-full bg-primary px-8 text-base font-black tracking-wide text-white shadow-neo transition-all active:translate-y-0 active:shadow-none sm:h-16 sm:w-auto sm:min-w-[200px] sm:text-lg sm:hover:-translate-y-1">
                      <span className="relative z-10 flex items-center gap-2">
                        Start Generating
                        <Rocket className="w-5 h-5 transition-transform group-hover:rotate-12" />
                      </span>
                    </Link>
                    <button className="flex h-14 w-full items-center justify-center rounded-full border-2 border-white/20 bg-transparent px-8 text-base font-bold text-white transition-colors hover:border-white hover:bg-white/5 sm:h-16 sm:w-auto sm:text-lg">
                      See Examples
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-full bg-primary px-8 text-base font-black tracking-wide text-white shadow-neo transition-all active:translate-y-0 active:shadow-none sm:h-16 sm:w-auto sm:min-w-[200px] sm:text-lg sm:hover:-translate-y-1">
                      <span className="relative z-10 flex items-center gap-2">
                        Sign Up
                        <UserPlus className="w-5 h-5" />
                      </span>
                    </Link>
                    <Link href="/login" className="flex h-14 w-full items-center justify-center rounded-full border-2 border-white/20 bg-transparent px-8 text-base font-bold text-white transition-colors hover:border-white hover:bg-white/5 hover:text-primary sm:h-16 sm:w-auto sm:min-w-[160px] sm:text-lg">
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Hero Image / Mascot Area */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative aspect-square w-full max-w-[500px]">
                {/* Abstract playful shapes behind */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/20 animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-8 rounded-full border-2 border-primary/30"></div>
                {/* Mascot Image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="BrandKit Mascot"
                    className="z-10 h-auto w-[85%] object-contain drop-shadow-[0_20px_50px_rgba(13,89,242,0.3)] hover:scale-105 transition-transform duration-500"
                    src="/brandkit.png"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Asset Factory Section */}
        <section className="py-24 px-6 relative overflow-hidden bg-background-dark">
          {/* Decorative Background */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            {/* Note: Using simple SVGs or text for background shapes as replacing symbols */}
            <div className="absolute top-20 left-10 text-9xl rotate-12 font-black">★</div>
            <div className="absolute bottom-40 right-20 text-9xl -rotate-12 font-black">⬟</div>
          </div>

          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-center mb-16 relative z-10">
              <span className="bg-pop-yellow text-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 border-2 border-black shadow-neo-dark">The Factory</span>
              <h2 className="text-[clamp(2rem,8vw,3.75rem)] font-black text-center text-white mb-6">
                PULL THE <span className="text-pop-pink">LEVER</span>.<br />GET THE GOODS.
              </h2>

              {/* The Lever UI */}
              <div className="relative mt-8 h-20 w-full max-w-64 bg-[#222f49] rounded-full border-4 border-white/10 p-2 flex items-center shadow-inner sm:h-24">
                <div className="absolute left-2 top-2 bottom-2 w-1/2 bg-primary rounded-full shadow-[0_0_15px_rgba(13,89,242,0.5)] flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-all group">
                  <RotateCw className="text-white w-8 h-8 group-hover:rotate-180 transition-transform duration-500" />
                </div>
                <div className="w-full flex justify-between px-8 text-xs font-bold text-white/30 uppercase tracking-widest pointer-events-none select-none">
                  <span>Input</span>
                  <span>Output</span>
                </div>
              </div>
            </div>

            {/* Scattered Asset Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
              {/* Asset Card 1 */}
              <div className="group relative bg-white rounded-xl p-6 min-h-[300px] flex flex-col rotate-2 hover:rotate-0 hover:z-20 transition-all duration-300 border-2 border-white shadow-neo-primary hover:shadow-[8px_8px_0px_0px_#0d59f2]">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-black text-white px-3 py-1 rounded text-xs font-bold uppercase">Business Card</div>
                  <MoreHorizontal className="text-black" />
                </div>
                <div className="flex-1 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 overflow-hidden relative">
                  <div className="bg-white/90 backdrop-blur p-4 rounded shadow-lg text-center relative z-10">
                    <p className="font-black text-black text-lg">JANE DOE</p>
                    <p className="text-xs text-gray-500">CEO & FOUNDER</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-primary text-white font-bold py-2 rounded hover:bg-blue-700 transition-colors">Download</button>
                  <button className="aspect-square bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 text-black">
                    <Pen className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Asset Card 2 */}
              <div className="group relative bg-pop-green rounded-xl p-6 min-h-[300px] flex flex-col -rotate-1 hover:rotate-0 hover:z-20 transition-all duration-300 border-2 border-black shadow-neo-dark hover:shadow-[8px_8px_0px_0px_black]">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-black text-white px-3 py-1 rounded text-xs font-bold uppercase">Social Story</div>
                  <MoreHorizontal className="text-black" />
                </div>
                <div className="flex-1 bg-black rounded-lg border-2 border-black flex items-center justify-center mb-4 overflow-hidden relative">
                  <h3 className="relative z-10 font-black text-white text-3xl text-center px-4 leading-none uppercase italic">New<br />Drop<br />Alert</h3>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors">Download</button>
                  <button className="aspect-square bg-white/50 rounded flex items-center justify-center hover:bg-white/80 text-black">
                    <Pen className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Asset Card 3 */}
              <div className="group relative bg-pop-pink rounded-xl p-6 min-h-[300px] flex flex-col rotate-3 hover:rotate-0 hover:z-20 transition-all duration-300 border-2 border-white shadow-neo hover:shadow-[8px_8px_0px_0px_white]">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white text-black px-3 py-1 rounded text-xs font-bold uppercase">Invoice</div>
                  <MoreHorizontal className="text-black" />
                </div>
                <div className="flex-1 bg-white rounded-lg border-2 border-black p-4 mb-4 flex flex-col gap-2 relative overflow-hidden">
                  <div className="flex justify-between items-end border-b-2 border-black pb-2">
                    <div className="text-2xl font-black text-black">INV-001</div>
                    <div className="text-xs font-bold text-black">$4,500.00</div>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="h-2 w-full bg-gray-200 rounded"></div>
                    <div className="h-2 w-2/3 bg-gray-200 rounded"></div>
                  </div>
                  <div className="mt-auto self-end">
                    <div className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase">Paid</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors">Download</button>
                  <button className="aspect-square bg-white/50 rounded flex items-center justify-center hover:bg-white/80 text-black">
                    <Pen className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center">
              <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-white bg-transparent px-6 py-3 text-base font-bold text-white transition-all hover:bg-white hover:text-black hover:scale-105 sm:w-auto sm:px-8 sm:py-4 sm:text-lg">
                Generate More Assets
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-background-dark px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tref.jpg" alt="tref Logo" className="w-8 h-8 object-contain" />
            {/* <span className="text-xl font-bold text-white">tref</span> */}
          </div>
          <div className="flex gap-8 text-sm font-medium text-gray-400">
            <a className="hover:text-primary transition-colors" href="#">Privacy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms</a>
            <a className="hover:text-primary transition-colors" href="#">Twitter</a>
          </div>
          <div className="text-sm text-gray-600">
            © 2024 tref Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

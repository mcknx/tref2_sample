"use client";

import { Suspense } from "react";
import SvgTestPlayground from "@/components/business-card/SvgTestPlayground";

export default function SvgTestPage() {
    return (
        <Suspense
            fallback={
                <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400">
                    Loading SVG Test Playground…
                </div>
            }
        >
            <SvgTestPlayground />
        </Suspense>
    );
}

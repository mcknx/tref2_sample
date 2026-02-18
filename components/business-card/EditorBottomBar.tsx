"use client";

import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, MousePointer2, Hand } from "lucide-react";

interface EditorBottomBarProps {
    currentSide: "front" | "back";
    onSideChange: (side: "front" | "back") => void;
    onZoom: (zoom: number) => void;
    zoomLevel: number;
    activeTool: "select" | "hand";
    onToolChange: (tool: "select" | "hand") => void;
}

export default function EditorBottomBar({ currentSide, onSideChange, onZoom, zoomLevel, activeTool, onToolChange }: EditorBottomBarProps) {
    return (
        <div className="flex w-[min(94vw,40rem)] flex-wrap items-center justify-center gap-2 rounded-2xl border border-gray-200/60 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md sm:w-auto sm:rounded-full sm:gap-4 sm:px-4 sm:py-1.5">
            {/* Side Switcher */}
            <div className="flex w-full rounded-full bg-gray-100 p-0.5 sm:w-auto">
                <button
                    onClick={() => onSideChange("front")}
                    className={`min-h-11 flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap sm:min-h-0 sm:flex-none sm:px-4 ${currentSide === "front"
                        ? "bg-white text-black shadow-sm"
                        : "text-gray-500 hover:text-black"
                        }`}
                >
                    Front Side
                </button>
                <button
                    onClick={() => onSideChange("back")}
                    className={`min-h-11 flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap sm:min-h-0 sm:flex-none sm:px-4 ${currentSide === "back"
                        ? "bg-white text-black shadow-sm"
                        : "text-gray-500 hover:text-black"
                        }`}
                >
                    Add Reverse Side
                </button>
            </div>

            <div className="hidden h-6 w-px bg-gray-200 sm:block" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 text-gray-600">
                <button onClick={() => onZoom(Math.max(0.25, zoomLevel - 0.1))} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                    <ZoomOut size={14} />
                </button>
                <span className="text-xs font-mono w-10 text-center font-medium">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => onZoom(Math.min(3, zoomLevel + 0.1))} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                    <ZoomIn size={14} />
                </button>
            </div>
        </div>
    );
}

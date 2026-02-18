"use client";

import { useState, useEffect } from "react";
import * as fabric from "fabric";
import { Bold, Italic, Type, Image as ImageIcon, PaintBucket } from "lucide-react";
import { Label } from "@/components/ui/label"; // Assuming this exists from previous steps

interface EditorToolbarProps {
    canvas: any | null; // fabric.Canvas
}

export default function EditorToolbar({ canvas }: EditorToolbarProps) {
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [textProps, setTextProps] = useState({
        fill: "#000000",
        fontFamily: "Inter",
        fontSize: 20,
        fontWeight: "normal",
        fontStyle: "normal"
    });
    const [bgColor, setBgColor] = useState("#ffffff");

    // 1. Listen to selection events
    useEffect(() => {
        if (!canvas) return;

        const updateSelection = () => {
            const activeObj = canvas.getActiveObject();
            if (!activeObj) {
                setSelectedType(null);
                // Get canvas BG
                // In Fabric v6, backgroundColor might be a complex object or string
                const bg = canvas.backgroundColor;
                setBgColor(typeof bg === 'string' ? bg : "#ffffff");
                return;
            }

            setSelectedType(activeObj.type);

            if (activeObj.type === "text" || activeObj.type === "i-text" || activeObj.type === "textbox") {
                setTextProps({
                    fill: activeObj.fill as string,
                    fontFamily: activeObj.fontFamily || "Inter",
                    fontSize: activeObj.fontSize || 20,
                    fontWeight: activeObj.fontWeight || "normal",
                    fontStyle: activeObj.fontStyle || "normal"
                });
            }
        };

        canvas.on("selection:created", updateSelection);
        canvas.on("selection:updated", updateSelection);
        canvas.on("selection:cleared", updateSelection);
        // Also listen to history/modified if we want deep sync, but for toolbar -> canvas sync this is fine.

        return () => {
            canvas.off("selection:created", updateSelection);
            canvas.off("selection:updated", updateSelection);
            canvas.off("selection:cleared", updateSelection);
        };
    }, [canvas]);

    // 2. Handlers
    const updateActiveObject = (prop: string, value: any) => {
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;

        activeObj.set(prop, value);
        canvas.requestRenderAll();

        // Update local state
        setTextProps(prev => ({ ...prev, [prop]: value }));
    };

    const updateCanvasBg = (color: string) => {
        if (!canvas) return;
        canvas.backgroundColor = color;
        canvas.requestRenderAll();
        setBgColor(color);
    };

    if (!canvas) return <div className="p-4 bg-gray-200 text-gray-500 rounded-lg">Loading Editor...</div>;

    return (
        <div className="flex flex-col gap-4 p-4 bg-[#1a2438] text-white rounded-xl border-2 border-white/10 shadow-xl w-full shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Editor Controls</h3>

            {/* NO SELECTION / CANVAS BG */}
            {!selectedType && (
                <div className="space-y-2">
                    <Label className="text-xs">Card Background</Label>
                    <div className="flex items-center gap-2">
                        <PaintBucket className="w-4 h-4 text-primary" />
                        <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => updateCanvasBg(e.target.value)}
                            className="w-full h-8 cursor-pointer rounded bg-transparent"
                        />
                    </div>
                </div>
            )}

            {/* TEXT CONTROLS */}
            {(selectedType === "text" || selectedType === "i-text" || selectedType === "textbox") && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                    {/* Font Family */}
                    <div className="space-y-1">
                        <Label className="text-xs">Font Family</Label>
                        <select
                            className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-sm"
                            value={textProps.fontFamily}
                            onChange={(e) => updateActiveObject("fontFamily", e.target.value)}
                        >
                            <option value="Inter">Inter</option>
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                        </select>
                    </div>

                    {/* Color */}
                    <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <input
                            type="color"
                            value={textProps.fill as string}
                            onChange={(e) => updateActiveObject("fill", e.target.value)}
                            className="w-full h-8 cursor-pointer rounded bg-transparent"
                        />
                    </div>

                    {/* Styles */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => updateActiveObject("fontWeight", textProps.fontWeight === "bold" ? "normal" : "bold")}
                            className={`p-2 rounded border border-white/10 ${textProps.fontWeight === "bold" ? "bg-primary text-black" : "hover:bg-white/10"}`}
                        >
                            <Bold className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => updateActiveObject("fontStyle", textProps.fontStyle === "italic" ? "normal" : "italic")}
                            className={`p-2 rounded border border-white/10 ${textProps.fontStyle === "italic" ? "bg-primary text-black" : "hover:bg-white/10"}`}
                        >
                            <Italic className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* IMAGE CONTROLS (Placeholder) */}
            {selectedType === "image" && (
                <div className="p-4 border border-dashed border-gray-600 rounded text-center text-sm text-gray-400">
                    <ImageIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    Image customization coming soon.
                </div>
            )}

            <div className="pt-4 border-t border-white/10 text-xs text-gray-500 text-center">
                {selectedType ? `Editing: ${selectedType}` : "Select an element to edit"}
            </div>
        </div>
    );
}

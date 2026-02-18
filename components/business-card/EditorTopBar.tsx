"use client";

import { useEffect, useState } from "react";
import {
    Undo2,
    Redo2,
    Trash2,
    Layers,
    Copy,
    Download,
    Save,
    RotateCcw,
    ArrowLeft,
    Printer,
    FlipHorizontal,
    Paintbrush,
    CheckCircle2,
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

type CanvasObjectLike = {
    type?: string;
    fill?: unknown;
    stroke?: unknown;
    flipX?: boolean;
    left?: number;
    top?: number;
    set: (key: string | Record<string, unknown>, value?: unknown) => void;
    clone?: () => Promise<unknown>;
    bringForward?: () => void;
    sendBackwards?: () => void;
    bringToFront?: () => void;
    sendToBack?: () => void;
    setCoords?: () => void;
    forEachObject?: (callback: (obj: unknown) => void) => void;
};

interface EditorTopBarProps {
    canvas: {
        getActiveObject: () => CanvasObjectLike | null;
        getActiveObjects: () => CanvasObjectLike[];
        remove: (...objects: unknown[]) => void;
        discardActiveObject: () => void;
        requestRenderAll: () => void;
        on: (event: string, callback: () => void) => void;
        off: (event: string, callback: () => void) => void;
        setActiveObject: (obj: unknown) => void;
        add: (obj: unknown) => void;
        clear: () => void;
        toDataURL: (options: { format: 'png'; quality: number; multiplier: number }) => string;
    } | null;
    onSave?: () => void | Promise<void>;
    onReset?: () => void;
    isSaving?: boolean;
    saveMessage?: string;
    showFinalize?: boolean;
    onFinalize?: () => void | Promise<void>;
    isFinalizing?: boolean;
    finalizeMessage?: string;
    isFinalized?: boolean;
    onDownload?: (format?: 'png' | 'svg') => void;
    onPrint?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
}

export default function EditorTopBar({ canvas, onSave, onReset, isSaving = false, saveMessage = "", showFinalize = false, onFinalize, isFinalizing = false, finalizeMessage = "", isFinalized = false, onDownload, onPrint, onUndo, onRedo, canUndo = false, canRedo = false }: EditorTopBarProps) {
    const router = useRouter();
    const [hasSelection, setHasSelection] = useState(false);
    const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
    const [fillColor, setFillColor] = useState<string | null>(null);
    const { profile } = useBrandStore();

    const QUICK_COLORS = [
        '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
        '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
    ];

    useEffect(() => {
        if (!canvas) return;

        const updateSelection = () => {
            const activeObj = canvas.getActiveObject();
            setHasSelection(!!activeObj);
            if (activeObj) {
                // Extract fill color from the selected object
                const fill = activeObj.fill;
                if (typeof fill === 'string') {
                    setFillColor(fill);
                } else if (fill && typeof fill === 'object') {
                    // Gradient - show the first color stop
                    const gradient = fill as { colorStops?: Array<{ color?: string }> };
                    setFillColor(gradient.colorStops?.[0]?.color || null);
                } else {
                    setFillColor(null);
                }
            } else {
                setFillColor(null);
            }
        };

        canvas.on("selection:created", updateSelection);
        canvas.on("selection:updated", updateSelection);
        canvas.on("selection:cleared", updateSelection);

        return () => {
            canvas.off("selection:created", updateSelection);
            canvas.off("selection:updated", updateSelection);
            canvas.off("selection:cleared", updateSelection);
        };
    }, [canvas]);

    const handleDelete = () => {
        if (!canvas) return;
        const activeObj = canvas.getActiveObjects();
        if (activeObj.length) {
            canvas.remove(...activeObj);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        }
    };

    const handleDuplicate = async () => {
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (!activeObj?.clone) return;

        activeObj.clone().then((cloned) => {
            const clonedObj = cloned as {
                type?: string;
                left?: number;
                top?: number;
                set: (props: Record<string, unknown>) => void;
                setCoords?: () => void;
                forEachObject?: (callback: (obj: unknown) => void) => void;
            } & Record<string, unknown>;

            canvas.discardActiveObject();
            clonedObj.set({
                left: (clonedObj.left ?? 0) + 10,
                top: (clonedObj.top ?? 0) + 10,
                evented: true,
            });
            if (clonedObj.type === 'activeSelection' && clonedObj.forEachObject) {
                (clonedObj as Record<string, unknown>).canvas = canvas;
                clonedObj.forEachObject((obj) => {
                    canvas.add(obj);
                });
                clonedObj.setCoords?.();
            } else {
                canvas.add(clonedObj);
            }
            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
        });
    };

    const handleLayer = (action: "up" | "down" | "top" | "bottom") => {
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;

        switch (action) {
            case "up": activeObj.bringForward?.(); break;
            case "down": activeObj.sendBackwards?.(); break;
            case "top": activeObj.bringToFront?.(); break;
            case "bottom": activeObj.sendToBack?.(); break;
        }
        canvas.requestRenderAll();
        setIsLayerMenuOpen(false);
    };

    const handleFlip = () => {
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;
        activeObj.set("flipX", !activeObj.flipX);
        canvas.requestRenderAll();
    };

    const handleFillColorChange = (color: string) => {
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;
        activeObj.set('fill', color);
        canvas.requestRenderAll();
        setFillColor(color);
    };

    // Show fill color for any selected object that has a fill
    const showFillPicker = hasSelection && fillColor !== null;

    const handleReset = () => {
        if (onReset) {
            if (confirm("Reset to the original AI-generated layout? Your current edits will be lost.")) {
                onReset();
            }
        } else if (canvas) {
            if (confirm("Are you sure you want to reset the canvas? All changes will be lost.")) {
                canvas.clear();
                canvas.requestRenderAll();
            }
        }
    };

    const handleUndo = () => onUndo?.();
    const handleRedo = () => onRedo?.();

    const handlePrint = () => {
        if (onPrint) {
            onPrint();
            return;
        }
        if (!canvas) return;
        const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`<img src="${dataURL}" onload="window.print();" style="max-width:100%;" />`);
        }
    };

    return (
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#1e293b] px-2 py-2 text-white sm:px-3">
            {/* Left: Back + General Actions */}
            <div className="flex w-full items-center gap-1.5 overflow-x-auto md:w-auto md:overflow-visible">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="gap-1 px-2 text-gray-400 hover:text-white"
                >
                    <ArrowLeft size={16} />
                    <span className="hidden text-xs sm:inline">Back</span>
                </Button>

                <Separator orientation="vertical" className="h-5 bg-white/10 mx-1" />

                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset} title="Reset">
                    <RotateCcw size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={!canUndo} title="Undo (⌘Z)">
                    <Undo2 size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRedo} disabled={!canRedo} title="Redo (⌘⇧Z)">
                    <Redo2 size={16} />
                </Button>

                <Separator orientation="vertical" className="h-5 bg-white/10 mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDelete}
                    disabled={!hasSelection}
                    title="Delete"
                >
                    <Trash2 size={16} />
                </Button>
            </div>

            {/* Center: Selection-dependent controls */}
            {hasSelection && (
                <div className="order-3 flex w-full items-center gap-3 overflow-x-auto md:order-0 md:w-auto md:overflow-visible">

                    {/* Layer */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
                            className="flex gap-1.5 h-8 text-xs"
                        >
                            <Layers size={14} />
                            Layer
                        </Button>
                        {isLayerMenuOpen && (
                            <div className="absolute top-full left-0 mt-1 bg-[#020617] border border-white/10 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 w-28">
                                <Button variant="ghost" size="sm" className="text-xs h-7 justify-start" onClick={() => handleLayer("top")}>To Front</Button>
                                <Button variant="ghost" size="sm" className="text-xs h-7 justify-start" onClick={() => handleLayer("up")}>Forward</Button>
                                <Button variant="ghost" size="sm" className="text-xs h-7 justify-start" onClick={() => handleLayer("down")}>Backward</Button>
                                <Button variant="ghost" size="sm" className="text-xs h-7 justify-start" onClick={() => handleLayer("bottom")}>To Back</Button>
                            </div>
                        )}
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFlip} title="Flip">
                        <FlipHorizontal size={14} />
                    </Button>

                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDuplicate} title="Duplicate">
                        <Copy size={14} />
                    </Button>

                    {/* Fill Color Picker */}
                    {showFillPicker && (
                        <>
                            <Separator orientation="vertical" className="h-5 bg-white/10" />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex items-center gap-1.5 h-8 text-xs px-2"
                                        title="Fill Color"
                                    >
                                        <div
                                            className="w-4 h-4 rounded border border-white/30"
                                            style={{ backgroundColor: fillColor || 'transparent' }}
                                        />
                                        <Paintbrush size={14} />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-64 bg-[#1e293b] border-white/10 p-3"
                                    sideOffset={8}
                                >
                                    <div className="space-y-3">
                                        <p className="text-xs font-medium text-white">Fill Color</p>

                                        {/* Current color + custom picker */}
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-8 h-8 rounded-lg border border-white/20 cursor-pointer"
                                                style={{ backgroundColor: fillColor || 'transparent' }}
                                                onClick={() => document.getElementById('shape-fill-picker')?.click()}
                                            />
                                            <input
                                                id="shape-fill-picker"
                                                type="color"
                                                value={fillColor || '#000000'}
                                                onChange={(e) => handleFillColorChange(e.target.value)}
                                                className="invisible w-0 h-0 absolute"
                                            />
                                            <span className="text-xs text-gray-400 font-mono">{fillColor}</span>
                                        </div>

                                        {/* Quick Colors */}
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Quick Colors</p>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {QUICK_COLORS.map((color) => (
                                                    <button
                                                        key={color}
                                                        onClick={() => handleFillColorChange(color)}
                                                        className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                                                            fillColor === color ? 'border-cyan-400 ring-1 ring-cyan-400/30' : 'border-white/10'
                                                        }`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Brand Colors */}
                                        {profile?.colors && (
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Brand Colors</p>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {[
                                                        profile.colors.primaryText,
                                                        profile.colors.background,
                                                    ].filter(Boolean).map((color) => (
                                                        <button
                                                            key={color}
                                                            onClick={() => handleFillColorChange(color!)}
                                                            className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                                                                fillColor === color ? 'border-cyan-400 ring-1 ring-cyan-400/30' : 'border-white/10'
                                                            }`}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Transparent option */}
                                        <button
                                            onClick={() => handleFillColorChange('transparent')}
                                            className="w-full text-xs text-gray-400 hover:text-white py-1.5 rounded-md hover:bg-white/5 transition-colors"
                                        >
                                            Set Transparent
                                        </button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </>
                    )}
                </div>
            )}

            {/* Right: Save / Download / Print */}
            <div className="flex w-full items-center gap-2 overflow-x-auto md:w-auto md:overflow-visible">
                {onSave && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving}
                        className="h-9 bg-transparent text-xs text-white border-white/20 hover:bg-white/10"
                    >
                        <Save size={14} className="mr-1.5" />
                        <span className="hidden sm:inline">
                            {isSaving ? "Saving..." : (saveMessage || "Save Progress")}
                        </span>
                        <span className="sm:hidden">{isSaving ? "Saving" : "Save"}</span>
                    </Button>
                )}

                {showFinalize && (
                    <Button
                        size="sm"
                        onClick={onFinalize}
                        disabled={isFinalized || isFinalizing}
                        className="h-9 bg-green-600 text-xs text-white hover:bg-green-700 disabled:bg-green-600/70"
                    >
                        <CheckCircle2 size={14} className="mr-1.5" />
                        <span className="hidden sm:inline">
                            {isFinalizing ? "Finalizing..." : (isFinalized ? "Finalized" : (finalizeMessage || "Finalize"))}
                        </span>
                        <span className="sm:hidden">{isFinalized ? "Done" : "Finalize"}</span>
                    </Button>
                )}

                <Button
                    size="sm"
                    onClick={onDownload ? () => onDownload('png') : undefined}
                    className="h-9 bg-cyan-600 text-xs text-white hover:bg-cyan-700"
                >
                    <Download size={14} className="mr-1.5" />
                    PNG
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onDownload ? () => onDownload('svg') : undefined}
                    className="h-9 bg-transparent text-xs text-white border-white/20 hover:bg-white/10"
                >
                    <Download size={14} className="mr-1.5" />
                    SVG
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="h-9 bg-transparent text-xs text-white border-white/20 hover:bg-white/10"
                >
                    <Printer size={14} className="mr-1.5" />
                    Print
                </Button>
            </div>
        </div>
    );
}

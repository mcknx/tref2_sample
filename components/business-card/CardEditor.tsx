"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { useBrandStore } from "@/store/brand-store";
import { initCenteringGuidelines } from "@/utils/fabricGuidelines";
import { CARD_CANVAS_HEIGHT, CARD_CANVAS_WIDTH, renderCardSource } from "@/utils/cardCanvasRenderer";

// Fabric.js types are sometimes tricky in Next.js SSR, so we use "any" liberally for the canvas instance 
// or ensure it initializes only on client.
// In v6, the standard import is often enough.

interface CardEditorProps {
    initialData?: any; // Fabric JSON
    readOnly?: boolean;
    onSave?: (json: any) => void;
    onCanvasReady?: (canvas: any) => void;
    activeTool?: "select" | "hand";
    zoomLevel?: number;
}

export default function CardEditor({ initialData, readOnly = false, onSave, onCanvasReady, activeTool = "select", zoomLevel = 1 }: CardEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<any>(null); // fabric.Canvas
    const [scale, setScale] = useState(1);

    // 1. Initialize Canvas
    useEffect(() => {
        if (!canvasRef.current) return;

        // Dispose old canvas if strict mode double-invokes
        if (fabricCanvas) {
            fabricCanvas.dispose();
        }

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: CARD_CANVAS_WIDTH,
            height: CARD_CANVAS_HEIGHT,
            backgroundColor: "#ffffff",
            selection: !readOnly,
            renderOnAddRemove: true,
        });

        // Selection styling - cyan highlights
        canvas.selectionColor = "rgba(6, 182, 212, 0.1)";
        canvas.selectionBorderColor = "#06b6d4";
        canvas.selectionLineWidth = 1;

        // Default object controls styling
        fabric.FabricObject.prototype.set({
            transparentCorners: false,
            cornerColor: "#06b6d4",
            cornerStrokeColor: "#06b6d4",
            cornerSize: 8,
            cornerStyle: "circle",
            borderColor: "#06b6d4",
            borderScaleFactor: 1.5,
            padding: 4,
        } as any);

        setFabricCanvas(canvas);
        if (onCanvasReady) onCanvasReady(canvas);

        if (!readOnly) {
            initCenteringGuidelines(canvas);
        }

        return () => {
            canvas.dispose();
        }
    }, [canvasRef]);

    // 2. Load Data (SVG Mode or JSON Mode)
    useEffect(() => {
        if (!fabricCanvas || !initialData) return;
        const { profile } = useBrandStore.getState(); // Access store imperatively if not passed props, or use hook above

        const loadData = async () => {
            try {
                await renderCardSource({
                    canvas: fabricCanvas,
                    source: initialData,
                    profile,
                    readOnly,
                });
            } catch (err) {
                console.error("Error loading Canvas Data:", err);
            }
        };

        loadData();
    }, [fabricCanvas, initialData, readOnly]);

    // 4. Handle Active Tool (Selection vs Hand) & Panning
    useEffect(() => {
        if (!fabricCanvas) return;

        fabricCanvas.isDrawingMode = false;

        if (activeTool === "hand") {
            fabricCanvas.selection = false;
            fabricCanvas.defaultCursor = "grab";
            fabricCanvas.hoverCursor = "grab";
            fabricCanvas.forEachObject((obj: any) => {
                obj.evented = false; // Disable object interaction
                obj.selectable = false;
            });
        } else {
            fabricCanvas.selection = true;
            fabricCanvas.defaultCursor = "default";
            fabricCanvas.hoverCursor = "move";
            fabricCanvas.forEachObject((obj: any) => {
                // Preserve locked state for bg-covered template shapes
                if (obj.__bgLocked) return;
                // Restore bg image as draggable (no resize controls)
                if (obj.__isBgImage) {
                    obj.evented = true;
                    obj.selectable = true;
                    obj.hasControls = false;
                    return;
                }
                obj.evented = true;
                obj.selectable = true;
            });
        }

        fabricCanvas.requestRenderAll();

        // Panning Logic
        let isDragging = false;
        let lastPosX = 0;
        let lastPosY = 0;

        const onMouseDown = (opt: any) => {
            if (activeTool === "hand") {
                const evt = opt.e;
                isDragging = true;
                fabricCanvas.defaultCursor = "grabbing";
                // fabricCanvas.setCursor("grabbing"); // Force cursor update might be needed
                lastPosX = evt.clientX;
                lastPosY = evt.clientY;
            }
        };

        const onMouseMove = (opt: any) => {
            if (isDragging && activeTool === "hand") {
                const evt = opt.e;
                const vpt = fabricCanvas.viewportTransform;
                vpt[4] += evt.clientX - lastPosX;
                vpt[5] += evt.clientY - lastPosY;
                fabricCanvas.requestRenderAll();
                lastPosX = evt.clientX;
                lastPosY = evt.clientY;
            }
        };

        const onMouseUp = () => {
            if (activeTool === "hand") {
                isDragging = false;
                fabricCanvas.defaultCursor = "grab";
                fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform); // Updates coords
            }
        };

        const onMouseWheel = (opt: any) => {
            // Optional: Allow wheel zooming or panning?
            // For now, let's just stick to panning. 
            // If we want wheel to pan:
            // const evt = opt.e;
            // const vpt = fabricCanvas.viewportTransform;
            // vpt[4] -= evt.deltaX;
            // vpt[5] -= evt.deltaY;
            // fabricCanvas.requestRenderAll();
        };

        fabricCanvas.on("mouse:down", onMouseDown);
        fabricCanvas.on("mouse:move", onMouseMove);
        fabricCanvas.on("mouse:up", onMouseUp);
        // fabricCanvas.on("mouse:wheel", onMouseWheel);

        return () => {
            fabricCanvas.off("mouse:down", onMouseDown);
            fabricCanvas.off("mouse:move", onMouseMove);
            fabricCanvas.off("mouse:up", onMouseUp);
        };
    }, [fabricCanvas, activeTool]);

    // 3. Responsive Scaling
    useEffect(() => {
        let animationFrameId: number;

        const handleResize = () => {
            if (!containerRef.current) return;

            // Cancel any pending frame
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                if (!containerRef.current) return;

                const containerW = containerRef.current.clientWidth;
                const containerH = containerRef.current.clientHeight;

                // Card dimensions
                const cardW = CARD_CANVAS_WIDTH;
                const cardH = CARD_CANVAS_HEIGHT;
                const padding = 40; // 20px on each side

                // Calculate scale to "contain" the card within the container
                const scaleX = (containerW - padding) / cardW;
                const scaleY = (containerH - padding) / cardH;

                // Fit scale
                const fitScale = Math.min(scaleX, scaleY, 1);

                // Apply manual zoom level to the fit scale
                const newScale = fitScale * zoomLevel;

                setScale(prev => {
                    if (Math.abs(prev - newScale) < 0.005) return prev;
                    return newScale;
                });
            });
        };

        const resizeObserver = new ResizeObserver(handleResize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener("resize", handleResize);
        handleResize(); // Initial check

        return () => {
            window.removeEventListener("resize", handleResize);
            if (containerRef.current) resizeObserver.unobserve(containerRef.current);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [zoomLevel]);

    // 4. Expose save

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-gray-100 overflow-hidden relative">
            <div
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                    width: CARD_CANVAS_WIDTH,
                    height: CARD_CANVAS_HEIGHT,
                    boxShadow: "0 20px 50px rgba(0,0,0,0.1)",
                    flexShrink: 0 // Prevent flex shrinking
                }}
            >
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}

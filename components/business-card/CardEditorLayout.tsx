"use client";

import { useState, useEffect, useRef } from "react";
import CardEditor from "@/components/business-card/CardEditor";
import EditorSidebar from "@/components/business-card/EditorSidebar";
import EditorTopBar from "@/components/business-card/EditorTopBar";
import EditorBottomBar from "@/components/business-card/EditorBottomBar";
import { useEditorStore } from "@/store/editor-store";
import { useCanvasHistory } from "../../hooks/useCanvasHistory";

interface CardEditorLayoutProps {
    initialTemplate?: any;
    onSave?: (canvas: any) => void | Promise<void>;
    onReset?: () => void;
    showSidebar?: boolean;
    hideTemplateSuggestions?: boolean;
    showFinalize?: boolean;
    isFinalized?: boolean;
    onFinalize?: () => void | Promise<void>;
    className?: string;
}

export default function CardEditorLayout({ initialTemplate, onSave, onReset, showSidebar = true, hideTemplateSuggestions = false, showFinalize = false, isFinalized = false, onFinalize, className }: CardEditorLayoutProps) {
    const [activeTemplate, setActiveTemplate] = useState<any>(initialTemplate);
    const [canvasInstance, setCanvasInstance] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [finalizeMessage, setFinalizeMessage] = useState("");
    const saveMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const finalizeMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { currentSide, setCurrentSide, zoomLevel, setZoomLevel, activeTool, setActiveTool } = useEditorStore();
    const { undo, redo, canUndo, canRedo, saveInitialState } = useCanvasHistory(canvasInstance);

    useEffect(() => {
        setActiveTemplate(initialTemplate);
    }, [initialTemplate]);

    // Save initial snapshot once canvas is loaded with template
    const initialSaveScheduled = useRef(false);
    useEffect(() => {
        if (!canvasInstance) return;
        // Wait a tick for SVG hydration to finish, then snapshot
        initialSaveScheduled.current = false;
        const timer = setTimeout(() => {
            if (!initialSaveScheduled.current) {
                initialSaveScheduled.current = true;
                saveInitialState();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [canvasInstance, activeTemplate, saveInitialState]);

    const handleSelectTemplate = (tplJson: any) => {
        setActiveTemplate(tplJson);
    };

    useEffect(() => {
        return () => {
            if (saveMessageTimer.current) clearTimeout(saveMessageTimer.current);
            if (finalizeMessageTimer.current) clearTimeout(finalizeMessageTimer.current);
        };
    }, []);

    const handleSaveClick = async () => {
        if (!onSave) return;
        if (!canvasInstance) {
            setSaveMessage("Canvas not ready");
            return;
        }

        try {
            setIsSaving(true);
            setSaveMessage("");
            await onSave(canvasInstance);
            setSaveMessage("Saved");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Save failed";
            setSaveMessage(message);
        } finally {
            setIsSaving(false);
            if (saveMessageTimer.current) clearTimeout(saveMessageTimer.current);
            saveMessageTimer.current = setTimeout(() => {
                setSaveMessage("");
            }, 2200);
        }
    };

    const handleFinalizeClick = async () => {
        if (!onFinalize || isFinalized) return;

        try {
            setIsFinalizing(true);
            setFinalizeMessage("");
            await onFinalize();
            setFinalizeMessage("Finalized");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Finalize failed";
            setFinalizeMessage(message);
        } finally {
            setIsFinalizing(false);
            if (finalizeMessageTimer.current) clearTimeout(finalizeMessageTimer.current);
            finalizeMessageTimer.current = setTimeout(() => {
                setFinalizeMessage("");
            }, 2400);
        }
    };

    const handleDownload = async (format: 'png' | 'svg' = 'png') => {
        if (!canvasInstance) return;
        try {
            if (format === 'svg') {
                const svgData = canvasInstance.toSVG();
                const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = 'business-card.svg';
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                const dataURL = canvasInstance.toDataURL({
                    format: 'png',
                    quality: 1,
                    multiplier: 2
                });
                const link = document.createElement('a');
                link.download = 'business-card.png';
                link.href = dataURL;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    const handlePrint = () => {
        if (!canvasInstance) return;
        const dataURL = canvasInstance.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`
                <html>
                    <head><title>Print Business Card</title></head>
                    <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                        <img src="${dataURL}" onload="window.print();" style="max-width:100%;max-height:100vh;" />
                    </body>
                </html>
            `);
        }
    };

    return (
        <div className={`flex h-dvh w-full flex-col overflow-hidden bg-[#e5e7eb] ${showSidebar ? "lg:flex-row" : ""} ${className || ""}`}>
            {/* Left Sidebar */}
            {showSidebar && (
                <div className="z-20 h-[42dvh] shrink-0 border-b border-white/10 bg-[#020617] shadow-xl lg:h-full lg:border-r lg:border-b-0">
                    <EditorSidebar
                        activeTemplate={activeTemplate}
                        onSelectTemplate={handleSelectTemplate}
                        canvas={canvasInstance}
                        hideTemplateSuggestions={hideTemplateSuggestions}
                    />
                </div>
            )}

            {/* Main Content Area */}
            <div className="relative flex min-h-0 grow flex-col">
                {/* Top Bar */}
                <div className="z-20 shrink-0">
                    <EditorTopBar
                        canvas={canvasInstance}
                        onDownload={(format) => handleDownload(format)}
                        onSave={onSave ? handleSaveClick : undefined}
                        onReset={onReset}
                        isSaving={isSaving}
                        saveMessage={saveMessage}
                        showFinalize={showFinalize}
                        onFinalize={handleFinalizeClick}
                        isFinalizing={isFinalizing}
                        finalizeMessage={finalizeMessage}
                        isFinalized={isFinalized}
                        onPrint={handlePrint}
                        onUndo={undo}
                        onRedo={redo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                    />
                </div>

                {/* Canvas Area */}
                <div className="relative flex min-h-0 grow items-center justify-center overflow-hidden bg-[#f1f5f9] p-2 sm:p-3">
                    <div className="relative w-full max-w-full shadow-2xl">
                        <CardEditor
                            initialData={
                                typeof activeTemplate === 'string'
                                    ? activeTemplate
                                    : (activeTemplate && typeof activeTemplate === 'object'
                                        ? (activeTemplate[currentSide as keyof typeof activeTemplate] || activeTemplate.front)
                                        : activeTemplate)
                            }
                            onCanvasReady={(c) => setCanvasInstance(c)}
                            activeTool={activeTool}
                            zoomLevel={zoomLevel}
                        />
                    </div>

                    {/* Bottom Bar (Floating) */}
                    <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 sm:bottom-4">
                        <EditorBottomBar
                            currentSide={currentSide}
                            onSideChange={setCurrentSide}
                            zoomLevel={zoomLevel}
                            onZoom={(z) => {
                                setZoomLevel(z);
                                if (canvasInstance) canvasInstance.setZoom(z);
                            }}
                            activeTool={activeTool}
                            onToolChange={setActiveTool}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

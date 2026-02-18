"use client";

import { useEffect, useState, useCallback } from "react";
import {
    LayoutTemplate,
    Type,
    Palette,
    Image as ImageIcon,
    Shapes,
    Pentagon,
    QrCode,
    Share2,
} from "lucide-react";
import { useEditorStore, EditorTab } from "@/store/editor-store";
import { Slider } from "@/components/ui/slider";
import { TemplatesPanel } from "./panels";
import { TextPanel } from "./panels";
import { BackgroundPanel } from "./panels";
import { LogoPanel } from "./panels";
import { ShapesPanel } from "./panels";
import { IconsPanel } from "./panels";
import { SocialPanel } from "./panels";
import { QRCodePanel } from "./panels";

interface EditorSidebarProps {
    activeTemplate: any;
    onSelectTemplate: (template: any) => void;
    canvas: any;
    hideTemplateSuggestions?: boolean;
}

const TABS: { id: EditorTab; icon: typeof LayoutTemplate; label: string }[] = [
    { id: "templates", icon: LayoutTemplate, label: "Templates" },
    { id: "text", icon: Type, label: "Text" },
    { id: "background", icon: Palette, label: "Background" },
    { id: "logo", icon: ImageIcon, label: "Logo" },
    { id: "shapes", icon: Pentagon, label: "Shapes" },
    { id: "icons", icon: Shapes, label: "Icons" },
    { id: "social", icon: Share2, label: "Social" },
    { id: "qrcode", icon: QrCode, label: "QR Code" },
];

export default function EditorSidebar({
    activeTemplate,
    onSelectTemplate,
    canvas,
    hideTemplateSuggestions = false,
}: EditorSidebarProps) {
    const { activeTab, setActiveTab, setSelectedElement } = useEditorStore();
    const [hasSelection, setHasSelection] = useState(false);
    const [opacity, setOpacity] = useState(1);

    const handleOpacityChange = useCallback((val: number[]) => {
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            activeObj.set("opacity", val[0]);
            canvas.requestRenderAll();
            setOpacity(val[0]);
        }
    }, [canvas]);

    useEffect(() => {
        if (!canvas) return;

        const syncSelection = () => {
            const activeObj = canvas.getActiveObject();
            if (!activeObj) {
                setSelectedElement(null, null);
                setHasSelection(false);
                return;
            }

            setHasSelection(true);
            setOpacity(activeObj.opacity || 1);

            const type = activeObj.type;
            const isText = type === "text" || type === "i-text" || type === "textbox";
            const id = activeObj.__editorId || `text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            if (!activeObj.__editorId) activeObj.__editorId = id;

            setSelectedElement(id, type || null);
            if (isText) {
                setActiveTab("text");
            }
        };

        canvas.on("selection:created", syncSelection);
        canvas.on("selection:updated", syncSelection);
        canvas.on("selection:cleared", syncSelection);
        canvas.on("object:modified", syncSelection);

        return () => {
            canvas.off("selection:created", syncSelection);
            canvas.off("selection:updated", syncSelection);
            canvas.off("selection:cleared", syncSelection);
            canvas.off("object:modified", syncSelection);
        };
    }, [canvas, setActiveTab, setSelectedElement]);

    useEffect(() => {
        if (!hideTemplateSuggestions) return;
        if (activeTab === "templates") {
            setActiveTab("text");
        }
    }, [hideTemplateSuggestions, activeTab, setActiveTab]);

    const visibleTabs = hideTemplateSuggestions
        ? TABS.filter((tab) => tab.id !== "templates")
        : TABS;

    const renderPanelContent = () => {
        switch (activeTab) {
            case "templates":
                return hideTemplateSuggestions
                    ? <TextPanel canvas={canvas} />
                    : <TemplatesPanel activeTemplate={activeTemplate} onSelectTemplate={onSelectTemplate} />;
            case "text":
                return <TextPanel canvas={canvas} />;
            case "background":
                return <BackgroundPanel canvas={canvas} />;
            case "logo":
                return <LogoPanel canvas={canvas} />;
            case "shapes":
                return <ShapesPanel canvas={canvas} />;
            case "icons":
                return <IconsPanel canvas={canvas} />;
            case "social":
                return <SocialPanel canvas={canvas} />;
            case "qrcode":
                return <QRCodePanel canvas={canvas} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-full w-full flex-col bg-[#0f172a] md:flex-row md:border-r md:border-white/10">
            {/* Icon Strip */}
            <div className="sticky top-0 z-10 flex w-full flex-row items-center gap-0.5 overflow-x-auto overflow-y-hidden bg-[#020617] px-2 py-2 text-gray-400 md:w-18 md:flex-col md:px-0 md:py-3 md:overflow-y-auto">
                {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex min-h-11 min-w-18 flex-col items-center justify-center gap-1 rounded-md px-1 py-2.5 transition-colors hover:text-white md:w-full md:min-w-0 md:rounded-none ${isActive ? "bg-white/5 text-white" : ""}`}
                        >
                            {isActive && <div className="absolute left-0 top-0 h-0.5 w-full rounded-b bg-cyan-500 md:top-0 md:bottom-0 md:h-auto md:w-0.5 md:rounded-r" />}
                            <Icon size={20} />
                            <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content Drawer */}
            <div className="relative flex min-h-0 w-full flex-1 flex-col bg-[#1e293b] md:w-80 md:flex-none">
                {renderPanelContent()}

                {/* Floating Opacity Control */}
                {hasSelection && (
                    <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0f172a]/95 backdrop-blur-sm px-4 py-2.5">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Opacity</span>
                            <Slider
                                value={[opacity]}
                                max={1}
                                min={0}
                                step={0.01}
                                onValueChange={handleOpacityChange}
                                className="flex-1 cursor-pointer"
                            />
                            <span className="text-[10px] text-gray-400 font-mono w-8 text-right">{Math.round(opacity * 100)}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

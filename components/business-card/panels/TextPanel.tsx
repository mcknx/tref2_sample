"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Type,
  Plus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Eye,
  EyeOff,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useEditorStore, TextElement } from "@/store/editor-store";
import { useBrandStore } from "@/store/brand-store";
import { cn } from "@/lib/utils";
import * as fabric from "fabric";

const FONT_OPTIONS = [
  "Inter",
  "Baloo 2",
  "Arial",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Palatino",
  "Garamond",
  "Comic Sans MS",
];

const QUICK_ADD_FIELDS = [
  { label: "Full Name", text: "Your Name", fontSize: 32, fontWeight: "bold" },
  { label: "Job Title", text: "CEO & Founder", fontSize: 18, fontWeight: "600" },
  { label: "Email", text: "name@company.com", fontSize: 14, fontWeight: "normal" },
  { label: "Phone", text: "(99) 9999-9999-999", fontSize: 14, fontWeight: "normal" },
  { label: "Address", text: "Address Line 1", fontSize: 14, fontWeight: "normal" },
  { label: "Website", text: "www.company.com", fontSize: 14, fontWeight: "normal" },
  { label: "Slogan", text: "Your tagline here", fontSize: 12, fontWeight: "normal" },
];

interface TextPanelProps {
  canvas: any;
}

export default function TextPanel({ canvas }: TextPanelProps) {
  const {
    textElements,
    setTextElements,
    updateTextElement,
    removeTextElement,
    selectedElementId,
    selectedElementType,
    setSelectedElement,
  } = useEditorStore();
  const { profile } = useBrandStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const createCurvePath = useCallback((text: string, fontSize: number) => {
    const estimatedWidth = Math.max((text.length + 2) * fontSize * 0.6, 140);
    const curveHeight = Math.max(fontSize * 2.4, 42);
    return new fabric.Path(`M 0 ${curveHeight} Q ${estimatedWidth / 2} 0 ${estimatedWidth} ${curveHeight}`, {
      visible: false,
      selectable: false,
      evented: false,
    });
  }, []);

  const refreshCurvedTextPath = useCallback((obj: any) => {
    if (!obj || !obj.__isCurvedText) return;
    const nextPath = createCurvePath(obj.text || "Text", Number(obj.fontSize) || 16);
    obj.set({
      path: nextPath,
      pathSide: "left",
      pathAlign: "center",
      textAlign: "center",
    } as any);
  }, [createCurvePath]);

  // Sync text elements from canvas
  const syncFromCanvas = useCallback(() => {
    if (!canvas) return;
    const texts: TextElement[] = [];
    canvas.forEachObject((obj: any) => {
      if (obj.type === "text" || obj.type === "i-text" || obj.type === "textbox") {
        const id = obj.__editorId || `text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        if (!obj.__editorId) obj.__editorId = id;
        const shadow = obj.shadow as any;
        texts.push({
          id,
          fabricId: id,
          label: obj.text?.substring(0, 20) || "Text",
          text: obj.text || "",
          fontFamily: obj.fontFamily || "Inter",
          fontSize: obj.fontSize || 14,
          fill: typeof obj.fill === "string" ? obj.fill : "#000000",
          fontWeight: obj.fontWeight || "normal",
          fontStyle: obj.fontStyle || "normal",
          underline: !!obj.underline,
          linethrough: !!obj.linethrough,
          charSpacing: Number(obj.charSpacing) || 0,
          curved: !!obj.__isCurvedText,
          outline: !!(obj.stroke && obj.strokeWidth > 0),
          outlineColor: typeof obj.stroke === "string" ? obj.stroke : "#000000",
          outlineWidth: Number(obj.strokeWidth) || 0,
          shadow: !!obj.shadow,
          shadowColor: shadow?.color || "#00000066",
          shadowBlur: Number(shadow?.blur) || 6,
          visible: obj.visible !== false,
          textAlign: obj.textAlign || "left",
        });
      }
    });
    setTextElements(texts);
  }, [canvas, setTextElements]);

  useEffect(() => {
    if (!selectedElementId) return;
    const isTextType = selectedElementType === "text" || selectedElementType === "i-text" || selectedElementType === "textbox";
    if (!isTextType) return;
    setExpandedId(selectedElementId);
  }, [selectedElementId, selectedElementType]);

  useEffect(() => {
    if (!canvas) return;
    // Initial sync
    const timer = setTimeout(syncFromCanvas, 500);

    const onChange = () => syncFromCanvas();
    canvas.on("object:added", onChange);
    canvas.on("object:removed", onChange);
    canvas.on("object:modified", onChange);

    return () => {
      clearTimeout(timer);
      canvas.off("object:added", onChange);
      canvas.off("object:removed", onChange);
      canvas.off("object:modified", onChange);
    };
  }, [canvas, syncFromCanvas]);

  const findFabricObject = (editorId: string) => {
    if (!canvas) return null;
    return canvas.getObjects().find((obj: any) => obj.__editorId === editorId);
  };

  const handleAddText = (preset: typeof QUICK_ADD_FIELDS[0]) => {
    if (!canvas) return;
    const id = `text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const text = new fabric.IText(preset.text, {
      left: 200 + Math.random() * 100,
      top: 150 + Math.random() * 100,
      fontSize: preset.fontSize,
      fontFamily: "Inter",
      fill: "#000000",
      fontWeight: preset.fontWeight,
    } as any);
    (text as any).__editorId = id;
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
  };

  const handleAddCustomText = () => {
    handleAddText({ label: "Custom", text: "New Text", fontSize: 16, fontWeight: "normal" });
  };

  const handleUpdateProperty = (elementId: string, prop: string, value: any) => {
    const obj = findFabricObject(elementId);
    if (!obj) return;

    obj.set(prop as any, value);
    if (["text", "fontSize", "fontFamily", "fontWeight", "fontStyle", "charSpacing"].includes(prop)) {
      refreshCurvedTextPath(obj);
    }

    canvas.requestRenderAll();
    updateTextElement(elementId, { [prop]: value } as any);
  };

  const handleToggleVisibility = (elementId: string, visible: boolean) => {
    const obj = findFabricObject(elementId);
    if (!obj) return;
    obj.set("visible", visible);
    canvas.requestRenderAll();
    updateTextElement(elementId, { visible });
  };

  const handleDeleteText = (elementId: string) => {
    const obj = findFabricObject(elementId);
    if (!obj) return;

    canvas.remove(obj);
    canvas.requestRenderAll();
    removeTextElement(elementId);
    setSelectedElement(null, null);
  };

  const handleToggleOutline = (element: TextElement) => {
    const obj = findFabricObject(element.id);
    if (!obj) return;

    const enabled = !element.outline;
    const nextColor = element.outlineColor || "#000000";
    const nextWidth = element.outlineWidth > 0 ? element.outlineWidth : 1;

    obj.set({
      stroke: enabled ? nextColor : undefined,
      strokeWidth: enabled ? nextWidth : 0,
      strokeUniform: true,
    } as any);

    canvas.requestRenderAll();
    updateTextElement(element.id, {
      outline: enabled,
      outlineColor: nextColor,
      outlineWidth: enabled ? nextWidth : 0,
    });
  };

  const handleUpdateOutline = (element: TextElement, color: string, width: number) => {
    const obj = findFabricObject(element.id);
    if (!obj) return;

    obj.set({
      stroke: color,
      strokeWidth: width,
      strokeUniform: true,
    } as any);

    canvas.requestRenderAll();
    updateTextElement(element.id, {
      outline: width > 0,
      outlineColor: color,
      outlineWidth: width,
    });
  };

  const handleToggleShadow = (element: TextElement) => {
    const obj = findFabricObject(element.id);
    if (!obj) return;

    const enabled = !element.shadow;
    const shadowColor = element.shadowColor || "#00000066";
    const shadowBlur = element.shadowBlur > 0 ? element.shadowBlur : 6;

    obj.set(
      "shadow",
      enabled
        ? {
            color: shadowColor,
            blur: shadowBlur,
            offsetX: 2,
            offsetY: 2,
          }
        : undefined
    );

    canvas.requestRenderAll();
    updateTextElement(element.id, {
      shadow: enabled,
      shadowColor,
      shadowBlur,
    });
  };

  const handleUpdateShadow = (element: TextElement, color: string, blur: number) => {
    const obj = findFabricObject(element.id);
    if (!obj) return;

    obj.set("shadow", {
      color,
      blur,
      offsetX: 2,
      offsetY: 2,
    });

    canvas.requestRenderAll();
    updateTextElement(element.id, {
      shadow: true,
      shadowColor: color,
      shadowBlur: blur,
    });
  };

  const handleToggleCurvedText = (element: TextElement) => {
    const obj = findFabricObject(element.id);
    if (!obj) return;

    const enabled = !element.curved;
    if (enabled) {
      const path = createCurvePath(obj.text || "Text", Number(obj.fontSize) || 16);
      obj.set({
        path,
        pathSide: "left",
        pathAlign: "center",
        textAlign: "center",
      } as any);
      obj.__isCurvedText = true;
    } else {
      obj.set({ path: undefined } as any);
      obj.__isCurvedText = false;
    }

    canvas.requestRenderAll();
    updateTextElement(element.id, { curved: enabled });
  };

  const handleSelectOnCanvas = (elementId: string) => {
    const obj = findFabricObject(elementId);
    if (!obj) return;
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    setSelectedElement(elementId, obj.type || "textbox");
    setExpandedId(elementId);
  };

  const brandColors = [
    profile?.colors?.primaryText || "#000000",
    profile?.colors?.background || "#3b82f6",
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">Edit Text</h3>
          <button
            onClick={handleAddCustomText}
            className="flex items-center gap-1 text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} />
            Add Text
          </button>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="px-4 pb-3 shrink-0">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Quick Add</p>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_ADD_FIELDS.map((field) => (
            <button
              key={field.label}
              onClick={() => handleAddText(field)}
              className="text-xs text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1.5 text-left transition-colors"
            >
              {field.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text Elements List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
          Text Elements ({textElements.length})
        </p>
        <div className="space-y-1.5">
          {textElements.map((el) => {
            const isExpanded = expandedId === el.id;
            return (
              <div
                key={el.id}
                className={cn(
                  "rounded-lg border transition-all",
                  isExpanded ? "border-cyan-500/50 bg-white/5" : "border-white/10 bg-white/2 hover:bg-white/5"
                )}
              >
                {/* Collapsed row */}
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : el.id);
                    handleSelectOnCanvas(el.id);
                  }}
                >
                  <Type size={14} className="text-gray-500 shrink-0" />
                  <span className="text-xs text-white truncate flex-1">{el.text || el.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleVisibility(el.id, !el.visible); }}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    {el.visible ? <Eye size={12} className="text-gray-400" /> : <EyeOff size={12} className="text-gray-600" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteText(el.id); }}
                    className="p-1 hover:bg-red-500/20 rounded"
                  >
                    <Trash2 size={12} className="text-gray-400 hover:text-red-400" />
                  </button>
                  {isExpanded ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
                </div>

                {/* Expanded controls */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
                    {/* Text input */}
                    <textarea
                      value={el.text}
                      onChange={(e) => {
                        handleUpdateProperty(el.id, "text", e.target.value);
                        updateTextElement(el.id, { text: e.target.value });
                      }}
                      rows={2}
                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white resize-none"
                    />

                    {/* Font Family */}
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">Font</label>
                      <select
                        value={el.fontFamily}
                        onChange={(e) => handleUpdateProperty(el.id, "fontFamily", e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    {/* Font Size */}
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">Size</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateProperty(el.id, "fontSize", Math.max(8, el.fontSize - 1))}
                          className="w-7 h-7 flex items-center justify-center bg-white/5 border border-white/10 rounded text-white text-sm hover:bg-white/10"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={el.fontSize}
                          onChange={(e) => handleUpdateProperty(el.id, "fontSize", Math.max(8, parseInt(e.target.value) || 14))}
                          className="w-14 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white text-center"
                        />
                        <button
                          onClick={() => handleUpdateProperty(el.id, "fontSize", Math.min(200, el.fontSize + 1))}
                          className="w-7 h-7 flex items-center justify-center bg-white/5 border border-white/10 rounded text-white text-sm hover:bg-white/10"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={el.fill}
                          onChange={(e) => handleUpdateProperty(el.id, "fill", e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                        />
                        {brandColors.map((c) => (
                          <button
                            key={c}
                            onClick={() => handleUpdateProperty(el.id, "fill", c)}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all",
                              el.fill === c ? "border-cyan-400 scale-110" : "border-white/20"
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Bold + Alignment */}
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleUpdateProperty(el.id, "fontWeight", el.fontWeight === "bold" ? "normal" : "bold")}
                        className={cn(
                          "p-1.5 rounded border transition-all",
                          el.fontWeight === "bold" ? "bg-cyan-500 border-cyan-500 text-white" : "border-white/10 text-gray-400 hover:bg-white/10"
                        )}
                        title="Bold"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        onClick={() => handleUpdateProperty(el.id, "fontStyle", el.fontStyle === "italic" ? "normal" : "italic")}
                        className={cn(
                          "p-1.5 rounded border transition-all",
                          el.fontStyle === "italic" ? "bg-cyan-500 border-cyan-500 text-white" : "border-white/10 text-gray-400 hover:bg-white/10"
                        )}
                        title="Italic"
                      >
                        <Italic size={14} />
                      </button>
                      <button
                        onClick={() => handleUpdateProperty(el.id, "underline", !el.underline)}
                        className={cn(
                          "p-1.5 rounded border transition-all",
                          el.underline ? "bg-cyan-500 border-cyan-500 text-white" : "border-white/10 text-gray-400 hover:bg-white/10"
                        )}
                        title="Underline"
                      >
                        <Underline size={14} />
                      </button>
                      <button
                        onClick={() => handleUpdateProperty(el.id, "linethrough", !el.linethrough)}
                        className={cn(
                          "p-1.5 rounded border transition-all",
                          el.linethrough ? "bg-cyan-500 border-cyan-500 text-white" : "border-white/10 text-gray-400 hover:bg-white/10"
                        )}
                        title="Strikethrough"
                      >
                        <Strikethrough size={14} />
                      </button>
                      <div className="w-px bg-white/10" />
                      <button
                        onClick={() => handleUpdateProperty(el.id, "textAlign", "left")}
                        className={cn("p-1.5 rounded border transition-all", el.textAlign === "left" ? "bg-cyan-500 border-cyan-500 text-white" : "border-white/10 text-gray-400 hover:bg-white/10")}
                        title="Align left"
                      >
                        <AlignLeft size={14} />
                      </button>
                      <button
                        onClick={() => handleUpdateProperty(el.id, "textAlign", "center")}
                        className={cn("p-1.5 rounded border transition-all", el.textAlign === "center" ? "bg-cyan-500 border-cyan-500 text-white" : "border-white/10 text-gray-400 hover:bg-white/10")}
                        title="Align center"
                      >
                        <AlignCenter size={14} />
                      </button>
                      <button
                        onClick={() => handleUpdateProperty(el.id, "textAlign", "right")}
                        className={cn("p-1.5 rounded border transition-all", el.textAlign === "right" ? "bg-cyan-500 border-cyan-500 text-white" : "border-white/10 text-gray-400 hover:bg-white/10")}
                        title="Align right"
                      >
                        <AlignRight size={14} />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">Spacing</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={-100}
                          max={500}
                          value={el.charSpacing}
                          onChange={(e) => handleUpdateProperty(el.id, "charSpacing", Number(e.target.value))}
                          className="flex-1"
                        />
                        <input
                          type="number"
                          value={el.charSpacing}
                          min={-100}
                          max={500}
                          onChange={(e) => handleUpdateProperty(el.id, "charSpacing", Number(e.target.value) || 0)}
                          className="w-16 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white text-center"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleToggleCurvedText(el)}
                        className={cn(
                          "w-full text-left px-2.5 py-2 rounded border text-xs transition-colors",
                          el.curved ? "bg-cyan-500/20 border-cyan-500 text-white" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                        )}
                      >
                        Curved text
                      </button>

                      <button
                        onClick={() => handleToggleOutline(el)}
                        className={cn(
                          "w-full text-left px-2.5 py-2 rounded border text-xs transition-colors",
                          el.outline ? "bg-cyan-500/20 border-cyan-500 text-white" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                        )}
                      >
                        Outline
                      </button>
                      {el.outline && (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={el.outlineColor}
                            onChange={(e) => handleUpdateOutline(el, e.target.value, Math.max(1, el.outlineWidth || 1))}
                            className="w-8 h-8 rounded bg-transparent border-0"
                          />
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={Math.max(1, el.outlineWidth || 1)}
                            onChange={(e) => handleUpdateOutline(el, el.outlineColor || "#000000", Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-xs text-gray-300 w-6 text-right">{Math.max(1, el.outlineWidth || 1)}</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleToggleShadow(el)}
                        className={cn(
                          "w-full text-left px-2.5 py-2 rounded border text-xs transition-colors",
                          el.shadow ? "bg-cyan-500/20 border-cyan-500 text-white" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                        )}
                      >
                        Shadow
                      </button>
                      {el.shadow && (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={el.shadowColor}
                            onChange={(e) => handleUpdateShadow(el, e.target.value, Math.max(1, el.shadowBlur || 6))}
                            className="w-8 h-8 rounded bg-transparent border-0"
                          />
                          <input
                            type="range"
                            min={1}
                            max={30}
                            value={Math.max(1, el.shadowBlur || 6)}
                            onChange={(e) => handleUpdateShadow(el, el.shadowColor || "#00000066", Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-xs text-gray-300 w-6 text-right">{Math.max(1, el.shadowBlur || 6)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {textElements.length === 0 && (
            <div className="text-center py-6">
              <Type size={24} className="text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No text elements yet.</p>
              <p className="text-[10px] text-gray-600">Use Quick Add or the + button above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

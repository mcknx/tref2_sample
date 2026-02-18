"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Upload, Trash2, Plus, Minus, Image as ImageIcon } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { useBrandStore } from "@/store/brand-store";
import { cn } from "@/lib/utils";
import * as fabric from "fabric";

interface LogoPanelProps {
  canvas: any;
}

export default function LogoPanel({ canvas }: LogoPanelProps) {
  const { logoUrl, setLogoUrl, logoSize, setLogoSize } = useEditorStore();
  const { profile } = useBrandStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detectedLogo, setDetectedLogo] = useState<string | null>(null);

  // Find the logo object on canvas — checks both our custom tag AND the hydrator's #logo id/name
  const findLogoObject = useCallback(() => {
    if (!canvas) return null;
    const objects = canvas.getObjects();
    for (const obj of objects) {
      if ((obj as any).__isLogo === true) return obj;
      const id = (obj as any).id || (obj as any).name || "";
      if (typeof id === "string" && id.startsWith("#logo")) return obj;
    }
    // Also check for Image type objects that could be a logo (not full-canvas-sized)
    for (const obj of objects) {
      if (obj.type === "image") {
        const w = (obj.width || 0) * (obj.scaleX || 1);
        const h = (obj.height || 0) * (obj.scaleY || 1);
        // Skip images that cover the whole canvas (backgrounds)
        if (w < canvas.width * 0.5 && h < canvas.height * 0.5) {
          return obj;
        }
      }
    }
    return null;
  }, [canvas]);

  // Auto-detect logo from canvas and brand store on mount / canvas change
  useEffect(() => {
    if (!canvas) return;

    const detect = () => {
      const logoObj = findLogoObject();

      if (logoObj) {
        // Try to extract the image src for preview
        if (logoObj.type === "image" && (logoObj as any)._element?.src) {
          const src = (logoObj as any)._element.src;
          setDetectedLogo(src);
          if (!logoUrl) setLogoUrl(src);
        } else if (logoObj.type === "image" && (logoObj as any).getSrc) {
          const src = (logoObj as any).getSrc();
          if (src) {
            setDetectedLogo(src);
            if (!logoUrl) setLogoUrl(src);
          }
        }

        // Sync size from canvas object
        const w = (logoObj.width || 100) * (logoObj.scaleX || 1);
        const h = (logoObj.height || 100) * (logoObj.scaleY || 1);
        setLogoSize(Math.round(Math.max(w, h)));
      } else if (profile?.logo_url && !logoUrl) {
        // No logo on canvas, but brand store has one
        setLogoUrl(profile.logo_url);
        setDetectedLogo(profile.logo_url);
      }
    };

    // Delay slightly to let canvas finish loading
    const timer = setTimeout(detect, 600);

    canvas.on("object:added", detect);
    return () => {
      clearTimeout(timer);
      canvas.off("object:added", detect);
    };
  }, [canvas, findLogoObject, profile?.logo_url, logoUrl, setLogoUrl, setLogoSize]);

  const previewUrl = logoUrl || detectedLogo || profile?.logo_url || null;
  const hasLogo = !!findLogoObject() || !!previewUrl;

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoUrl(dataUrl);
      setDetectedLogo(dataUrl);

      // Remove existing logo
      const existing = findLogoObject();
      if (existing) canvas.remove(existing);

      // Add new logo
      const img = await fabric.FabricImage.fromURL(dataUrl);
      const targetSize = logoSize || 150;
      const scale = targetSize / Math.max(img.width || 100, img.height || 100);
      img.set({
        left: 100,
        top: 200,
        scaleX: scale,
        scaleY: scale,
        hasControls: true,
        hasBorders: true,
      } as any);
      (img as any).__isLogo = true;
      (img as any).__editorId = `logo-${Date.now()}`;
      (img as any).id = "#logo";
      (img as any).name = "#logo";
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected
    e.target.value = "";
  }, [canvas, logoSize, setLogoUrl, findLogoObject]);

  const handleRemoveLogo = () => {
    const obj = findLogoObject();
    if (obj && canvas) {
      canvas.remove(obj);
      canvas.requestRenderAll();
    }
    setLogoUrl(null);
    setDetectedLogo(null);
  };

  const handleResize = (delta: number) => {
    const obj = findLogoObject();
    if (!obj || !canvas) return;
    const currentW = (obj.width || 100) * (obj.scaleX || 1);
    const currentH = (obj.height || 100) * (obj.scaleY || 1);
    const currentSize = Math.max(currentW, currentH);
    const newSize = Math.max(30, Math.min(500, currentSize + delta));
    setLogoSize(Math.round(newSize));
    const scaleFactor = newSize / Math.max(obj.width || 100, obj.height || 100);
    obj.set({ scaleX: scaleFactor, scaleY: scaleFactor } as any);
    obj.setCoords();
    canvas.requestRenderAll();
  };

  const handleSelectLogo = () => {
    const obj = findLogoObject();
    if (obj && canvas) {
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 flex-shrink-0">
        <h3 className="text-base font-bold text-white mb-3">Logo</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-0">
        {/* Upload / None Toggle */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Logo</p>
          <div className="flex bg-white/5 p-0.5 rounded-lg mb-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-md font-medium bg-white/10 text-white"
            >
              <Upload size={14} />
              Upload
            </button>
            <button
              onClick={handleRemoveLogo}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-md font-medium text-gray-500 hover:text-white"
            >
              None
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        {/* Logo Preview */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Logo Preview</p>
          <div
            className={cn(
              "bg-white/5 border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all",
              hasLogo ? "border-white/10 hover:border-cyan-500/30" : "border-dashed border-white/20"
            )}
            onClick={handleSelectLogo}
          >
            <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <ImageIcon size={24} className="text-gray-300" />
              )}
            </div>
            <div className="flex-1">
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {previewUrl ? "Replace Logo" : "Upload Logo"}
              </button>
              {hasLogo && (
                <p className="text-[10px] text-gray-500 mt-1.5">Click to select on canvas</p>
              )}
            </div>
          </div>
        </div>

        {/* Size Controls */}
        {hasLogo && (
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Size</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleResize(-10)}
                className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10"
              >
                <Minus size={14} />
              </button>
              <div className="flex-1 bg-white/5 rounded-lg h-2 relative">
                <div
                  className="absolute left-0 top-0 h-full bg-cyan-500 rounded-lg"
                  style={{ width: `${Math.min((logoSize / 500) * 100, 100)}%` }}
                />
              </div>
              <button
                onClick={() => handleResize(10)}
                className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10"
              >
                <Plus size={14} />
              </button>
              <span className="text-xs text-gray-400 font-mono w-10 text-right">{logoSize}px</span>
            </div>
          </div>
        )}

        {/* Remove */}
        {hasLogo && (
          <button
            onClick={handleRemoveLogo}
            className="mt-2 w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg py-2 transition-colors"
          >
            <Trash2 size={14} />
            Remove Logo
          </button>
        )}
      </div>
    </div>
  );
}

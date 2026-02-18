"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Globe, Mail, Phone, Linkedin, Contact, Calendar, Trash2, Plus, Minus } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { cn } from "@/lib/utils";
import * as fabric from "fabric";
import QRCode from "qrcode";

const QR_TYPES = [
  { id: "website", label: "Website", icon: Globe, placeholder: "https://example.com" },
  { id: "email", label: "Email", icon: Mail, placeholder: "name@company.com" },
  { id: "phone", label: "Phone", icon: Phone, placeholder: "+1 234 567 890" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "linkedin.com/in/username" },
  { id: "vcard", label: "Contact", icon: Contact, placeholder: "Full Name" },
] as const;

interface QRCodePanelProps {
  canvas: any;
}

export default function QRCodePanel({ canvas }: QRCodePanelProps) {
  const { qrSettings, setQRSettings, qrVisible, setQRVisible } = useEditorStore();
  const [preview, setPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const findQRObject = () => {
    if (!canvas) return null;
    return canvas.getObjects().find((obj: any) => obj.__isQRCode === true);
  };

  // Generate QR Preview
  const generateQR = useCallback(async () => {
    if (!qrSettings.data) {
      setPreview(null);
      return;
    }

    setGenerating(true);
    try {
      let qrData = qrSettings.data;

      // Format data based on type
      switch (qrSettings.type) {
        case "email":
          qrData = `mailto:${qrData}`;
          break;
        case "phone":
          qrData = `tel:${qrData}`;
          break;
        case "linkedin":
          if (!qrData.startsWith("http")) qrData = `https://${qrData}`;
          break;
        case "vcard":
          qrData = `BEGIN:VCARD\nVERSION:3.0\nFN:${qrData}\nEND:VCARD`;
          break;
        case "website":
        default:
          if (!qrData.startsWith("http")) qrData = `https://${qrData}`;
          break;
      }

      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 1,
        color: {
          dark: "#000000",
          light: qrSettings.transparent ? "#ffffff00" : "#ffffff",
        },
      });

      setPreview(dataUrl);
    } catch (err) {
      console.error("QR generation error:", err);
    } finally {
      setGenerating(false);
    }
  }, [qrSettings]);

  useEffect(() => {
    const timer = setTimeout(generateQR, 500);
    return () => clearTimeout(timer);
  }, [generateQR]);

  const handleAddToCanvas = async () => {
    if (!canvas || !preview) return;

    // Remove existing QR
    const existing = findQRObject();
    if (existing) canvas.remove(existing);

    const img = await fabric.FabricImage.fromURL(preview);
    const scale = qrSettings.size / (img.width || 300);
    img.set({
      left: 800,
      top: 400,
      scaleX: scale,
      scaleY: scale,
      hasControls: true,
      hasBorders: true,
    } as any);
    (img as any).__isQRCode = true;
    (img as any).__editorId = "qr-code";
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    setQRVisible(true);
  };

  const handleRemoveFromCanvas = () => {
    const obj = findQRObject();
    if (obj && canvas) {
      canvas.remove(obj);
      canvas.requestRenderAll();
    }
    setQRVisible(false);
  };

  const handleResize = (delta: number) => {
    const newSize = Math.max(60, Math.min(300, qrSettings.size + delta));
    setQRSettings({ size: newSize });

    const obj = findQRObject();
    if (obj && canvas) {
      const scale = newSize / ((obj as any).width || 300);
      obj.set({ scaleX: scale, scaleY: scale } as any);
      obj.setCoords();
      canvas.requestRenderAll();
    }
  };

  const currentType = QR_TYPES.find((t) => t.id === qrSettings.type) || QR_TYPES[0];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 flex-shrink-0">
        <h3 className="text-base font-bold text-white mb-3">QR Code</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-0">
        {/* Content Type */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Content Type</p>
          <div className="grid grid-cols-3 gap-1.5">
            {QR_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setQRSettings({ type: type.id as any })}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all",
                    qrSettings.type === type.id
                      ? "border-cyan-500 bg-cyan-500/10 text-white"
                      : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  )}
                >
                  <Icon size={16} />
                  <span className="text-[10px]">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Data Input */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">{currentType.label} *</p>
          <input
            type="text"
            value={qrSettings.data}
            onChange={(e) => setQRSettings({ data: e.target.value })}
            placeholder={currentType.placeholder}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Preview */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Preview</p>
          <div className="bg-white rounded-xl p-4 flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="QR Code" className="w-32 h-32" />
            ) : (
              <div className="w-32 h-32 flex items-center justify-center text-gray-300 text-xs">
                {generating ? "Generating..." : "Enter data to generate"}
              </div>
            )}
          </div>
        </div>

        {/* Transparency Toggle */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400">Transparent Background</span>
          <button
            onClick={() => setQRSettings({ transparent: !qrSettings.transparent })}
            className={cn(
              "w-9 h-5 rounded-full transition-all relative",
              qrSettings.transparent ? "bg-cyan-500" : "bg-white/10"
            )}
          >
            <div
              className={cn(
                "w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all",
                qrSettings.transparent ? "left-[18px]" : "left-1"
              )}
            />
          </button>
        </div>

        {/* Size Controls */}
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
                style={{ width: `${((qrSettings.size - 60) / 240) * 100}%` }}
              />
            </div>
            <button
              onClick={() => handleResize(10)}
              className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10"
            >
              <Plus size={14} />
            </button>
            <span className="text-xs text-gray-400 font-mono w-10 text-right">{qrSettings.size}px</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleAddToCanvas}
            disabled={!preview}
            className={cn(
              "w-full py-2.5 rounded-lg text-sm font-medium transition-all",
              preview
                ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                : "bg-white/5 text-gray-600 cursor-not-allowed"
            )}
          >
            {qrVisible ? "Update QR on Card" : "Add QR to Card"}
          </button>

          {qrVisible && (
            <button
              onClick={handleRemoveFromCanvas}
              className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg py-2 transition-colors"
            >
              <Trash2 size={14} />
              Remove QR Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

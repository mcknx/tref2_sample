"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Trash2, ImagePlus, X } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { useBrandStore } from "@/store/brand-store";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import Image from "next/image";
import * as fabric from "fabric";
import { recolorCanvasForReadability } from "@/utils/contrastAutoFix";

const DEFAULT_COLORS = [
  "#000000", "#1a1a2e", "#16213e", "#0f3460",
  "#ffffff", "#f8f9fa", "#e9ecef", "#dee2e6",
  "#e74c3c", "#e91e63", "#9b59b6", "#8e44ad",
  "#2196f3", "#00bcd4", "#009688", "#4caf50",
  "#ff9800", "#ff5722", "#795548", "#607d8b",
  "#ffeb3b", "#cddc39", "#8bc34a", "#00e676",
];

const GRADIENTS = [
  { name: "Sunset", colors: ["#f093fb", "#f5576c"], angle: 135 },
  { name: "Ocean", colors: ["#4facfe", "#00f2fe"], angle: 135 },
  { name: "Forest", colors: ["#43e97b", "#38f9d7"], angle: 135 },
  { name: "Violet", colors: ["#a18cd1", "#fbc2eb"], angle: 135 },
  { name: "Fire", colors: ["#f83600", "#f9d423"], angle: 135 },
  { name: "Night", colors: ["#0c3483", "#a2b6df"], angle: 135 },
  { name: "Midnight", colors: ["#232526", "#414345"], angle: 135 },
  { name: "Cool", colors: ["#2193b0", "#6dd5ed"], angle: 135 },
  { name: "Warm", colors: ["#e65c00", "#f9d423"], angle: 135 },
  { name: "Rose", colors: ["#ee9ca7", "#ffdde1"], angle: 135 },
  { name: "Sky", colors: ["#2980b9", "#6dd5fa"], angle: 180 },
  { name: "Peach", colors: ["#ffecd2", "#fcb69f"], angle: 135 },
];

// Decoration patterns - SVG path-based overlays
const DECORATIONS = [
  { name: "None", id: "none" },
  { name: "Dots", id: "dots" },
  { name: "Diagonal Lines", id: "diagonal" },
  { name: "Grid", id: "grid" },
  { name: "Circles", id: "circles" },
  { name: "Waves", id: "waves" },
  { name: "Confetti", id: "confetti" },
  { name: "Corner Accent", id: "corner" },
  { name: "Border Frame", id: "frame" },
];

interface BackgroundPanelProps {
  canvas: any;
}

export default function BackgroundPanel({ canvas }: BackgroundPanelProps) {
  const { backgroundColor, setBackgroundColor } = useEditorStore();
  const { profile } = useBrandStore();
  const [customColor, setCustomColor] = useState(backgroundColor);
  const [activeSection, setActiveSection] = useState<"colors" | "gradients" | "image" | "decorations">("colors");
  const [activeDecoration, setActiveDecoration] = useState("none");
  const [decorationColor, setDecorationColor] = useState("#00000015");
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgImageOpacity, setBgImageOpacity] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isForegroundObject = useCallback((obj: any) => {
    const id = obj?.id || obj?.name || "";
    const type = obj?.type;
    const isText = type === "text" || type === "i-text" || type === "textbox";
    const isLogo = id.startsWith("#logo") || obj?.__editorId === "logo";
    const isIcon = typeof obj?.__editorId === "string" && obj.__editorId.startsWith("icon-");
    const isQr = typeof obj?.__editorId === "string" && obj.__editorId.startsWith("qr-");
    const isSocial = typeof obj?.__editorId === "string" && obj.__editorId.startsWith("social-");
    return isText || isLogo || isIcon || isQr || isSocial;
  }, []);

  const isBgImageObject = useCallback((obj: any) => {
    return obj?.__isBgImage === true || obj?.__editorId === "bg-image" || obj?.id === "#bg_image";
  }, []);

  // Lock template/background shapes so they can't be selected when bg image covers them
  const lockTemplateShapes = useCallback((lock: boolean) => {
    if (!canvas) return;
    canvas.getObjects().forEach((obj: any) => {
      if (!isForegroundObject(obj) && !isBgImageObject(obj)) {
        obj.set({ selectable: !lock, evented: !lock });
        obj.__bgLocked = lock; // flag so CardEditor preserves this state
      }
    });
  }, [canvas, isForegroundObject, isBgImageObject]);

  const brandColors = [
    profile?.colors?.primaryText || "#000000",
    profile?.colors?.background || "#3b82f6",
  ];

  // Find the background rect in the canvas
  const findBgRect = useCallback(() => {
    if (!canvas) return null;
    const objects = canvas.getObjects();
    for (const obj of objects) {
      const id = (obj as any).id || (obj as any).name || "";
      if (id.startsWith("#bg") || id.startsWith("#lock")) {
        if (obj.type === "rect" || obj.type === "group") return obj;
      }
    }
    for (const obj of objects) {
      if (obj.type === "rect") {
        const w = (obj.width || 0) * (obj.scaleX || 1);
        const h = (obj.height || 0) * (obj.scaleY || 1);
        if (w >= canvas.width * 0.9 && h >= canvas.height * 0.9) {
          return obj;
        }
      }
    }
    return null;
  }, [canvas]);

  // Clear decoration objects
  const clearDecorations = useCallback(() => {
    if (!canvas) return;
    const toRemove = canvas.getObjects().filter((obj: any) => obj.__isDecoration === true);
    toRemove.forEach((obj: any) => canvas.remove(obj));
  }, [canvas]);

  // Find existing background image on canvas
  const findBgImage = useCallback(() => {
    if (!canvas) return null;
    const objects = canvas.getObjects();
    for (const obj of objects) {
      if ((obj as any).__isBgImage === true || (obj as any).__editorId === "bg-image" || (obj as any).id === "#bg_image") return obj;
    }
    return null;
  }, [canvas]);

  const syncBgPreviewFromCanvas = useCallback(() => {
    if (!canvas) return;
    const existing = findBgImage() as any;
    if (!existing) {
      setBgImageUrl(null);
      return;
    }

    const src =
      existing?.__bgSource ||
      existing?._element?.src ||
      (typeof existing?.getSrc === "function" ? existing.getSrc() : null) ||
      null;
    setBgImageUrl(src);
  }, [canvas, findBgImage]);

  // Restore panel preview state when returning to the Background tab
  useEffect(() => {
    if (!canvas) return;
    syncBgPreviewFromCanvas();

    // Also lock template shapes if a bg image already exists
    if (findBgImage()) lockTemplateShapes(true);

    const onChange = () => syncBgPreviewFromCanvas();
    canvas.on("object:added", onChange);
    canvas.on("object:removed", onChange);

    return () => {
      canvas.off("object:added", onChange);
      canvas.off("object:removed", onChange);
    };
  }, [canvas, findBgImage, syncBgPreviewFromCanvas, lockTemplateShapes]);

  // Keep uploaded background image inside card bounds while dragging
  useEffect(() => {
    if (!canvas) return;

    const clampBgImagePosition = (e: any) => {
      const target = e?.target;
      if (!target || !(target as any).__isBgImage) return;

      const canvasW = canvas.width || 1050;
      const canvasH = canvas.height || 600;
      const imgW = (target.width || 0) * (target.scaleX || 1);
      const imgH = (target.height || 0) * (target.scaleY || 1);

      const minLeft = Math.min(0, canvasW - imgW);
      const minTop = Math.min(0, canvasH - imgH);
      const maxLeft = 0;
      const maxTop = 0;

      const nextLeft = Math.min(maxLeft, Math.max(minLeft, target.left || 0));
      const nextTop = Math.min(maxTop, Math.max(minTop, target.top || 0));

      target.set({ left: nextLeft, top: nextTop });
    };

    canvas.on("object:moving", clampBgImagePosition);
    return () => {
      canvas.off("object:moving", clampBgImagePosition);
    };
  }, [canvas]);

  // Remove background image from canvas
  const removeBgImage = useCallback(() => {
    if (!canvas) return;
    const existing = findBgImage();
    if (existing) {
      canvas.discardActiveObject();
      canvas.remove(existing);
      // Unlock template shapes so they become interactive again
      lockTemplateShapes(false);
      canvas.requestRenderAll();
    }
    setBgImageUrl(null);
  }, [canvas, findBgImage, lockTemplateShapes]);

  // Apply a background image that covers the full card
  const applyBgImage = useCallback(async (imageUrl: string) => {
    if (!canvas) return;

    // Remove any existing bg image
    const existing = findBgImage();
    if (existing) canvas.remove(existing);

    try {
      const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' });

      // Fixed card dimensions
      const canvasW = 1050;
      const canvasH = 600;

      // Read natural image dimensions from the HTML element as a fallback
      const el = img.getElement() as HTMLImageElement;
      const imgW = el?.naturalWidth || el?.width || img.width || 1;
      const imgH = el?.naturalHeight || el?.height || img.height || 1;

      // "Cover" fit — scale so image fully covers the card
      const scaleFactor = Math.max(canvasW / imgW, canvasH / imgH);

      // Center the scaled image
      const renderedW = imgW * scaleFactor;
      const renderedH = imgH * scaleFactor;
      const offsetX = (canvasW - renderedW) / 2;
      const offsetY = (canvasH - renderedH) / 2;

      img.set({
        left: offsetX,
        top: offsetY,
        scaleX: scaleFactor,
        scaleY: scaleFactor,
        originX: 'left',
        originY: 'top',
        selectable: true,
        evented: true,
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hasControls: false,
        hasBorders: true,
        borderColor: '#06b6d4',
        hoverCursor: 'grab',
        moveCursor: 'grabbing',
      } as any);
      (img as any).__isBgImage = true;
      (img as any).__editorId = 'bg-image';
      (img as any).id = '#bg_image';
      (img as any).__bgSource = imageUrl;

      // Add image to canvas
      canvas.add(img);

      // Move uploaded image behind template graphics/text
      // but keep the template base background rect (#bg) behind the uploaded image
      if (typeof (canvas as any).sendObjectToBack === 'function') {
        (canvas as any).sendObjectToBack(img);
      } else if (typeof (img as any).sendToBack === 'function') {
        (img as any).sendToBack();
      }
      const bgRect = findBgRect();
      if (bgRect) {
        if (typeof (canvas as any).sendObjectToBack === 'function') {
          (canvas as any).sendObjectToBack(bgRect);
        } else if (typeof (bgRect as any).sendToBack === 'function') {
          (bgRect as any).sendToBack();
        }
      }

      // Lock template shapes so they don't steal clicks
      lockTemplateShapes(true);

      // Auto-fix text contrast (bg image may change perceived background)
      recolorCanvasForReadability(canvas, {
        brandPrimary: profile?.colors?.primaryText,
        brandBackground: profile?.colors?.background,
      });

      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      setBgImageUrl(imageUrl);
    } catch (err) {
      console.error('Error loading background image:', err);
    }
  }, [canvas, findBgImage, findBgRect, lockTemplateShapes, profile]);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        applyBgImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [applyBgImage]);

  // Apply opacity to background image
  const handleBgImageOpacity = useCallback((val: number) => {
    setBgImageOpacity(val);
    if (!canvas) return;
    const bgImg = findBgImage();
    if (bgImg) {
      bgImg.set({ opacity: val });
      canvas.requestRenderAll();
    }
  }, [canvas, findBgImage]);

  const applyColor = (color: string) => {
    if (!canvas) return;

    // Remove background image if one exists (color replaces image)
    const existingBgImg = findBgImage();
    if (existingBgImg) {
      canvas.remove(existingBgImg);
      lockTemplateShapes(false);
      setBgImageUrl(null);
      setBgImageOpacity(1);
    }

    const bgRect = findBgRect();
    if (bgRect) {
      bgRect.set({ fill: color });
    }
    canvas.backgroundColor = color;
    // Auto-fix text/structural element contrast against new background
    recolorCanvasForReadability(canvas, {
      brandPrimary: profile?.colors?.primaryText,
      brandBackground: profile?.colors?.background,
    });
    canvas.requestRenderAll();
    setBackgroundColor(color);
    setCustomColor(color);
  };

  const applyGradient = (colors: string[], angle: number = 135) => {
    if (!canvas) return;

    // Remove background image if one exists (gradient replaces image)
    const existingBgImg = findBgImage();
    if (existingBgImg) {
      canvas.remove(existingBgImg);
      lockTemplateShapes(false);
      setBgImageUrl(null);
      setBgImageOpacity(1);
    }

    const bgRect = findBgRect();

    // Convert angle to coordinates
    const rad = (angle * Math.PI) / 180;
    const getCoords = (w: number, h: number) => ({
      x1: w / 2 - (Math.cos(rad) * w) / 2,
      y1: h / 2 - (Math.sin(rad) * h) / 2,
      x2: w / 2 + (Math.cos(rad) * w) / 2,
      y2: h / 2 + (Math.sin(rad) * h) / 2,
    });

    if (bgRect) {
      const w = bgRect.width || canvas.width;
      const h = bgRect.height || canvas.height;
      const coords = getCoords(w, h);
      const gradient = new fabric.Gradient({
        type: "linear",
        coords,
        colorStops: [
          { offset: 0, color: colors[0] },
          { offset: 1, color: colors[1] },
        ],
      });
      bgRect.set({ fill: gradient });
    }

    // Also set on canvas
    const coords = getCoords(canvas.width, canvas.height);
    const canvasGradient = new fabric.Gradient({
      type: "linear",
      coords,
      colorStops: [
        { offset: 0, color: colors[0] },
        { offset: 1, color: colors[1] },
      ],
    });
    canvas.backgroundColor = canvasGradient;
    // Auto-fix text/structural element contrast against new gradient
    recolorCanvasForReadability(canvas, {
      brandPrimary: profile?.colors?.primaryText,
      brandBackground: profile?.colors?.background,
    });
    canvas.requestRenderAll();
    setBackgroundColor(`gradient:${colors.join(",")}`);
  };

  const applyDecoration = (id: string) => {
    if (!canvas) return;
    clearDecorations();
    setActiveDecoration(id);
    if (id === "none") {
      canvas.requestRenderAll();
      return;
    }

    const W = canvas.width;
    const H = canvas.height;
    const fill = decorationColor;

    const addDeco = (obj: fabric.FabricObject) => {
      (obj as any).__isDecoration = true;
      (obj as any).__editorId = `decoration-${id}`;
      obj.set({ selectable: false, evented: false } as any);
      canvas.add(obj);
    };

    switch (id) {
      case "dots": {
        const spacing = 40;
        const radius = 3;
        for (let x = spacing; x < W; x += spacing) {
          for (let y = spacing; y < H; y += spacing) {
            const dot = new fabric.Circle({
              left: x - radius,
              top: y - radius,
              radius,
              fill,
              originX: "left",
              originY: "top",
            } as any);
            addDeco(dot);
          }
        }
        break;
      }
      case "diagonal": {
        const gap = 30;
        for (let i = -H; i < W + H; i += gap) {
          const line = new fabric.Line([i, 0, i + H, H], {
            stroke: fill,
            strokeWidth: 1,
          } as any);
          addDeco(line);
        }
        break;
      }
      case "grid": {
        const gapG = 50;
        for (let x = gapG; x < W; x += gapG) {
          const vLine = new fabric.Line([x, 0, x, H], {
            stroke: fill,
            strokeWidth: 0.5,
          } as any);
          addDeco(vLine);
        }
        for (let y = gapG; y < H; y += gapG) {
          const hLine = new fabric.Line([0, y, W, y], {
            stroke: fill,
            strokeWidth: 0.5,
          } as any);
          addDeco(hLine);
        }
        break;
      }
      case "circles": {
        const sizes = [
          { cx: W * 0.85, cy: H * 0.15, r: 80 },
          { cx: W * 0.9, cy: H * 0.1, r: 120 },
          { cx: W * 0.1, cy: H * 0.85, r: 60 },
          { cx: W * 0.05, cy: H * 0.9, r: 100 },
        ];
        sizes.forEach(({ cx, cy, r }) => {
          const circle = new fabric.Circle({
            left: cx - r,
            top: cy - r,
            radius: r,
            fill: "transparent",
            stroke: fill,
            strokeWidth: 1.5,
          } as any);
          addDeco(circle);
        });
        break;
      }
      case "waves": {
        const waveCount = 5;
        const waveH = H / waveCount;
        for (let i = 0; i < waveCount; i++) {
          const yBase = waveH * (i + 1);
          const points: { x: number; y: number }[] = [];
          for (let x = 0; x <= W; x += 10) {
            points.push({ x, y: yBase + Math.sin((x / W) * Math.PI * 4) * 15 });
          }
          const pathStr = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
          const wave = new fabric.Path(pathStr, {
            stroke: fill,
            strokeWidth: 1,
            fill: "transparent",
          } as any);
          addDeco(wave);
        }
        break;
      }
      case "confetti": {
        const confettiColors = ["#f093fb30", "#4facfe30", "#43e97b30", "#f8360030", "#ffeb3b30"];
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * W;
          const y = Math.random() * H;
          const size = 6 + Math.random() * 12;
          const angle = Math.random() * 360;
          const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
          const rect = new fabric.Rect({
            left: x,
            top: y,
            width: size,
            height: size * 0.4,
            fill: color,
            angle,
            rx: 1,
            ry: 1,
          } as any);
          addDeco(rect);
        }
        break;
      }
      case "corner": {
        // Top-right corner accent
        const cornerSize = 150;
        const tr = new fabric.Triangle({
          left: W - cornerSize,
          top: 0,
          width: cornerSize,
          height: cornerSize,
          fill,
          angle: 0,
        } as any);
        addDeco(tr);
        // Bottom-left corner accent
        const bl = new fabric.Triangle({
          left: 0,
          top: H - cornerSize,
          width: cornerSize,
          height: cornerSize,
          fill,
          angle: 180,
        } as any);
        addDeco(bl);
        break;
      }
      case "frame": {
        const inset = 20;
        const frameRect = new fabric.Rect({
          left: inset,
          top: inset,
          width: W - inset * 2,
          height: H - inset * 2,
          fill: "transparent",
          stroke: fill,
          strokeWidth: 2,
          rx: 4,
          ry: 4,
        } as any);
        addDeco(frameRect);
        break;
      }
    }

    canvas.requestRenderAll();
  };

  // Small inline SVG preview for each decoration
  const DecoPreview = ({ id }: { id: string }) => {
    const s = 48; // preview size
    const col = "#9ca3af";
    switch (id) {
      case "none":
        return (
          <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
            <line x1="8" y1="8" x2={s - 8} y2={s - 8} stroke={col} strokeWidth="1.5" />
            <line x1={s - 8} y1="8" x2="8" y2={s - 8} stroke={col} strokeWidth="1.5" />
          </svg>
        );
      case "dots":
        return (
          <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
            {[12, 24, 36].map((x) =>
              [12, 24, 36].map((y) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill={col} />
              ))
            )}
          </svg>
        );
      case "diagonal":
        return (
          <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
            {[-16, 0, 16, 32, 48].map((i) => (
              <line key={i} x1={i} y1="0" x2={i + s} y2={s} stroke={col} strokeWidth="1" />
            ))}
          </svg>
        );
      case "grid":
        return (
          <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
            {[12, 24, 36].map((v) => (
              <g key={v}>
                <line x1={v} y1="0" x2={v} y2={s} stroke={col} strokeWidth="0.5" />
                <line x1="0" y1={v} x2={s} y2={v} stroke={col} strokeWidth="0.5" />
              </g>
            ))}
          </svg>
        );
      case "circles":
        return (
          <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
            <circle cx={s - 8} cy="8" r="10" fill="none" stroke={col} strokeWidth="1" />
            <circle cx="10" cy={s - 8} r="8" fill="none" stroke={col} strokeWidth="1" />
          </svg>
        );
      case "waves":
        return (
          <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
            {[16, 28, 40].map((y) => (
              <path key={y} d={`M 0 ${y} Q 12 ${y - 6} 24 ${y} Q 36 ${y + 6} 48 ${y}`} fill="none" stroke={col} strokeWidth="1" />
            ))}
          </svg>
        );
      case "confetti":
        return (
          <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
            <rect x="8" y="10" width="8" height="3" rx="1" fill="#f093fb" transform="rotate(30 12 11)" />
            <rect x="28" y="8" width="7" height="3" rx="1" fill="#4facfe" transform="rotate(-20 31 9)" />
            <rect x="14" y="30" width="9" height="3" rx="1" fill="#43e97b" transform="rotate(45 18 31)" />
            <rect x="34" y="28" width="6" height="3" rx="1" fill="#f83600" transform="rotate(-35 37 29)" />
            <rect x="20" y="18" width="7" height="3" rx="1" fill="#ffeb3b" transform="rotate(15 23 19)" />
          </svg>
        );
      case "corner":
        return (
          <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
            <polygon points={`${s},0 ${s},18 ${s - 18},0`} fill={col} opacity="0.5" />
            <polygon points={`0,${s} 0,${s - 18} 18,${s}`} fill={col} opacity="0.5" />
          </svg>
        );
      case "frame":
        return (
          <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
            <rect x="6" y="6" width={s - 12} height={s - 12} rx="2" fill="none" stroke={col} strokeWidth="1.5" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 shrink-0">
        <h3 className="text-base font-bold text-white mb-3">Background</h3>

        {/* Section Tabs */}
        <div className="flex bg-white/5 p-0.5 rounded-lg">
          {(["colors", "gradients", "image", "decorations"] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={cn(
                "flex-1 text-xs py-1.5 rounded-md font-medium capitalize transition-all",
                activeSection === section ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {section}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {activeSection === "colors" && (
          <div className="space-y-4">
            {/* Custom Color */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">New Color</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => document.getElementById("bg-color-picker")?.click()}
                  className="w-10 h-10 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/40 transition-colors"
                  style={{ backgroundColor: customColor }}
                >
                  <Plus size={16} className="text-white/60" />
                </button>
                <input
                  id="bg-color-picker"
                  type="color"
                  value={customColor}
                  onChange={(e) => applyColor(e.target.value)}
                  className="invisible w-0 h-0 absolute"
                />
                <span className="text-xs text-gray-400 font-mono">{customColor}</span>
              </div>
            </div>

            {/* Brand Colors */}
            {brandColors.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Brand Colors</p>
                <div className="flex gap-2 flex-wrap">
                  {brandColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => applyColor(color)}
                      className={cn(
                        "w-9 h-9 rounded-lg border-2 transition-all hover:scale-110",
                        backgroundColor === color ? "border-cyan-400 ring-2 ring-cyan-400/30" : "border-white/10"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Logo Colors */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Logo Colors</p>
              <div className="flex gap-2">
                <button onClick={() => applyColor("#ffffff")} className={cn("w-9 h-9 rounded-lg border-2 transition-all", backgroundColor === "#ffffff" ? "border-cyan-400" : "border-white/20")} style={{ backgroundColor: "#ffffff" }} />
                <button onClick={() => applyColor("#000000")} className={cn("w-9 h-9 rounded-lg border-2 transition-all", backgroundColor === "#000000" ? "border-cyan-400" : "border-white/20")} style={{ backgroundColor: "#000000" }} />
              </div>
            </div>

            {/* Default Colors Grid */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Default Colors</p>
              <div className="grid grid-cols-6 gap-1.5">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => applyColor(color)}
                    className={cn(
                      "w-full aspect-square rounded-lg border-2 transition-all hover:scale-110",
                      backgroundColor === color ? "border-cyan-400 ring-1 ring-cyan-400/30" : "border-white/5"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === "gradients" && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Gradient Presets</p>
            <div className="grid grid-cols-3 gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g.name}
                  onClick={() => applyGradient(g.colors, g.angle)}
                  className="aspect-square rounded-xl border border-white/10 hover:border-white/30 transition-all hover:scale-105 overflow-hidden group"
                  style={{
                    background: `linear-gradient(${g.angle}deg, ${g.colors[0]}, ${g.colors[1]})`,
                  }}
                >
                  <div className="w-full h-full flex items-end p-1.5">
                    <span className="text-[9px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                      {g.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSection === "image" && (
          <div className="space-y-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Upload area */}
            {!bgImageUrl ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[1.75] rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-400/50 bg-white/2 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-cyan-500/10 flex items-center justify-center transition-colors">
                  <ImagePlus size={24} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Upload Image</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">JPG, PNG, WebP • Max 10MB</p>
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                {/* Preview */}
                <div className="relative w-full aspect-[1.75] rounded-xl overflow-hidden border border-white/10">
                  <Image
                    src={bgImageUrl}
                    alt="Background"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {/* Remove button overlay */}
                  <button
                    onClick={removeBgImage}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-500/80 backdrop-blur-sm flex items-center justify-center transition-colors"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-white/10 bg-white/5 text-gray-300 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
                  >
                    <ImagePlus size={12} />
                    Replace
                  </button>
                  <button
                    onClick={removeBgImage}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>

                {/* Image Opacity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Opacity</p>
                    <span className="text-[10px] text-gray-400 font-mono">{Math.round(bgImageOpacity * 100)}%</span>
                  </div>
                  <Slider
                    value={[bgImageOpacity]}
                    min={0.05}
                    max={1}
                    step={0.05}
                    onValueChange={(val) => handleBgImageOpacity(val[0])}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="rounded-lg bg-white/3 border border-white/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Tips</p>
              <ul className="space-y-1">
                <li className="text-[11px] text-gray-400">• Use high-resolution images (1050×600px or larger)</li>
                <li className="text-[11px] text-gray-400">• Image will auto-scale to cover the full card</li>
                <li className="text-[11px] text-gray-400">• Use subtle or dark images for readable text</li>
              </ul>
            </div>
          </div>
        )}

        {activeSection === "decorations" && (
          <div className="space-y-4">
            {/* Decoration color */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Overlay Color</p>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { label: "Light", value: "#00000015" },
                  { label: "Medium", value: "#00000030" },
                  { label: "Dark", value: "#00000060" },
                  { label: "White", value: "#ffffff20" },
                  { label: "Cyan", value: "#06b6d420" },
                  { label: "Gold", value: "#f59e0b25" },
                ].map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      setDecorationColor(c.value);
                      if (activeDecoration !== "none") {
                        // Re-apply with new color
                        setTimeout(() => applyDecoration(activeDecoration), 50);
                      }
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all",
                      decorationColor === c.value
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                        : "border-white/10 bg-white/5 text-gray-400 hover:text-white"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Decoration patterns */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Patterns</p>
              <div className="grid grid-cols-3 gap-2">
                {DECORATIONS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => applyDecoration(d.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all hover:scale-105",
                      activeDecoration === d.id
                        ? "border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/20"
                        : "border-white/10 bg-white/3 hover:border-white/20"
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                      <DecoPreview id={d.id} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium leading-tight text-center",
                      activeDecoration === d.id ? "text-cyan-400" : "text-gray-500"
                    )}>
                      {d.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Clear decoration button */}
            {activeDecoration !== "none" && (
              <button
                onClick={() => applyDecoration("none")}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={12} />
                Remove Decoration
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

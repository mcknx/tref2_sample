"use client";

import { useState, useRef, useCallback } from "react";
import { ImagePlus } from "lucide-react";
import { useBrandStore } from "@/store/brand-store";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import * as fabric from "fabric";

const SHAPE_PRESETS = [
  { id: "rect", label: "Rectangle", icon: "rect" },
  { id: "rounded-rect", label: "Rounded Rect", icon: "rounded-rect" },
  { id: "circle", label: "Circle", icon: "circle" },
  { id: "ellipse", label: "Ellipse", icon: "ellipse" },
  { id: "triangle", label: "Triangle", icon: "triangle" },
  { id: "diamond", label: "Diamond", icon: "diamond" },
  { id: "star", label: "Star", icon: "star" },
  { id: "hexagon", label: "Hexagon", icon: "hexagon" },
  { id: "line", label: "Line", icon: "line" },
  { id: "arrow", label: "Arrow", icon: "arrow" },
  { id: "heart", label: "Heart", icon: "heart" },
  { id: "cross", label: "Cross", icon: "cross" },
];

// SVG path previews for each shape
function ShapePreview({ id, size = 28 }: { id: string; size?: number }) {
  const col = "currentColor";
  const s = size;
  const viewBox = `0 0 ${s} ${s}`;
  const pad = 3;

  switch (id) {
    case "rect":
      return <svg width={s} height={s} viewBox={viewBox}><rect x={pad} y={pad + 2} width={s - pad * 2} height={s - pad * 2 - 4} fill={col} rx={1} /></svg>;
    case "rounded-rect":
      return <svg width={s} height={s} viewBox={viewBox}><rect x={pad} y={pad + 2} width={s - pad * 2} height={s - pad * 2 - 4} rx={4} ry={4} fill={col} /></svg>;
    case "circle":
      return <svg width={s} height={s} viewBox={viewBox}><circle cx={s / 2} cy={s / 2} r={s / 2 - pad} fill={col} /></svg>;
    case "ellipse":
      return <svg width={s} height={s} viewBox={viewBox}><ellipse cx={s / 2} cy={s / 2} rx={s / 2 - pad} ry={s / 3 - 1} fill={col} /></svg>;
    case "triangle":
      return <svg width={s} height={s} viewBox={viewBox}><polygon points={`${s / 2},${pad} ${s - pad},${s - pad} ${pad},${s - pad}`} fill={col} /></svg>;
    case "diamond":
      return <svg width={s} height={s} viewBox={viewBox}><polygon points={`${s / 2},${pad} ${s - pad},${s / 2} ${s / 2},${s - pad} ${pad},${s / 2}`} fill={col} /></svg>;
    case "star": {
      const cx = s / 2, cy = s / 2, outerR = s / 2 - pad, innerR = outerR * 0.4;
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const outerAngle = (Math.PI / 2) + (2 * Math.PI * i) / 5;
        const innerAngle = outerAngle + Math.PI / 5;
        pts.push(`${cx - outerR * Math.cos(outerAngle)},${cy - outerR * Math.sin(outerAngle)}`);
        pts.push(`${cx - innerR * Math.cos(innerAngle)},${cy - innerR * Math.sin(innerAngle)}`);
      }
      return <svg width={s} height={s} viewBox={viewBox}><polygon points={pts.join(" ")} fill={col} /></svg>;
    }
    case "hexagon": {
      const cx = s / 2, cy = s / 2, r = s / 2 - pad;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      });
      return <svg width={s} height={s} viewBox={viewBox}><polygon points={pts.join(" ")} fill={col} /></svg>;
    }
    case "line":
      return <svg width={s} height={s} viewBox={viewBox}><line x1={pad} y1={s - pad} x2={s - pad} y2={pad} stroke={col} strokeWidth={2} /></svg>;
    case "arrow":
      return <svg width={s} height={s} viewBox={viewBox}><line x1={pad} y1={s / 2} x2={s - pad - 4} y2={s / 2} stroke={col} strokeWidth={2} /><polyline points={`${s - pad - 8},${s / 2 - 5} ${s - pad},${s / 2} ${s - pad - 8},${s / 2 + 5}`} stroke={col} strokeWidth={2} fill="none" /></svg>;
    case "heart":
      return <svg width={s} height={s} viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill={col} /></svg>;
    case "cross":
      return <svg width={s} height={s} viewBox={viewBox}><rect x={s / 2 - 3} y={pad} width={6} height={s - pad * 2} fill={col} /><rect x={pad} y={s / 2 - 3} width={s - pad * 2} height={6} fill={col} /></svg>;
    default:
      return null;
  }
}

// Create the star polygon points for Fabric
function createStarPoints(cx: number, cy: number, outerR: number, innerR: number, points: number = 5): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < points; i++) {
    const outerAngle = (Math.PI / 2) + (2 * Math.PI * i) / points;
    const innerAngle = outerAngle + Math.PI / points;
    pts.push({ x: cx - outerR * Math.cos(outerAngle), y: cy - outerR * Math.sin(outerAngle) });
    pts.push({ x: cx - innerR * Math.cos(innerAngle), y: cy - innerR * Math.sin(innerAngle) });
  }
  return pts;
}

function createHexagonPoints(cx: number, cy: number, r: number): { x: number; y: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

interface ShapesPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any;
}

export default function ShapesPanel({ canvas }: ShapesPanelProps) {
  const { profile } = useBrandStore();
  const [shapeColor, setShapeColor] = useState("#3b82f6");
  const [shapeBorder, setShapeBorder] = useState("#000000");
  const [shapeBorderWidth, setShapeBorderWidth] = useState(0);
  const [shapeOpacity, setShapeOpacity] = useState(1);
  const clipImageInputRef = useRef<HTMLInputElement>(null);

  const brandColors = [
    profile?.colors?.primaryText || "#000000",
    profile?.colors?.background || "#ffffff",
  ];

  const QUICK_COLORS = [
    "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
    "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
    "#10b981", "#f59e0b",
  ];

  const addShapeToCanvas = useCallback((shapeId: string) => {
    if (!canvas) return;

    const centerX = 525;
    const centerY = 300;
    const id = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    let obj: fabric.FabricObject | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commonProps: any = {
      fill: shapeColor,
      stroke: shapeBorderWidth > 0 ? shapeBorder : undefined,
      strokeWidth: shapeBorderWidth,
      opacity: shapeOpacity,
      originX: "center",
      originY: "center",
      left: centerX,
      top: centerY,
    };

    switch (shapeId) {
      case "rect":
        obj = new fabric.Rect({ ...commonProps, width: 160, height: 100 });
        break;
      case "rounded-rect":
        obj = new fabric.Rect({ ...commonProps, width: 160, height: 100, rx: 16, ry: 16 });
        break;
      case "circle":
        obj = new fabric.Circle({ ...commonProps, radius: 60 });
        break;
      case "ellipse":
        obj = new fabric.Ellipse({ ...commonProps, rx: 80, ry: 50 });
        break;
      case "triangle":
        obj = new fabric.Triangle({ ...commonProps, width: 120, height: 120 });
        break;
      case "diamond":
        obj = new fabric.Rect({ ...commonProps, width: 90, height: 90, angle: 45 });
        break;
      case "star": {
        const starPts = createStarPoints(0, 0, 60, 24, 5);
        obj = new fabric.Polygon(starPts, commonProps);
        break;
      }
      case "hexagon": {
        const hexPts = createHexagonPoints(0, 0, 60);
        obj = new fabric.Polygon(hexPts, commonProps);
        break;
      }
      case "line":
        obj = new fabric.Line([-60, 0, 60, 0], {
          ...commonProps,
          fill: undefined,
          stroke: shapeColor,
          strokeWidth: Math.max(3, shapeBorderWidth || 3),
        });
        break;
      case "arrow": {
        const arrowPath = "M 0 0 L 100 0 M 85 -12 L 100 0 L 85 12";
        obj = new fabric.Path(arrowPath, {
          ...commonProps,
          fill: undefined,
          stroke: shapeColor,
          strokeWidth: Math.max(3, shapeBorderWidth || 3),
          left: centerX - 50,
          top: centerY,
        });
        break;
      }
      case "heart": {
        const heartPath = "M 12 21.35 l -1.45 -1.32 C 5.4 15.36 2 12.28 2 8.5 C 2 5.42 4.42 3 7.5 3 c 1.74 0 3.41 0.81 4.5 2.09 C 13.09 3.81 14.76 3 16.5 3 C 19.58 3 22 5.42 22 8.5 c 0 3.78 -3.4 6.86 -8.55 11.54 L 12 21.35 z";
        obj = new fabric.Path(heartPath, {
          ...commonProps,
          scaleX: 4,
          scaleY: 4,
        });
        break;
      }
      case "cross": {
        const crossPath = "M 8 0 L 16 0 L 16 8 L 24 8 L 24 16 L 16 16 L 16 24 L 8 24 L 8 16 L 0 16 L 0 8 L 8 8 Z";
        obj = new fabric.Path(crossPath, {
          ...commonProps,
          scaleX: 4,
          scaleY: 4,
        });
        break;
      }
    }

    if (obj) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj as any).__editorId = id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj as any).__isShape = true;
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
    }
  }, [canvas, shapeColor, shapeBorder, shapeBorderWidth, shapeOpacity]);

  // Clip image to shape: uploads image, clips it to the currently selected shape
  const handleClipImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;
    if (!file.type.startsWith('image/')) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      alert("Select a shape first, then upload an image to clip into it.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      try {
        const img = await fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' });

        // Get the shape's bounding box
        const shapeBounds = activeObj.getBoundingRect();
        const shapeW = shapeBounds.width;
        const shapeH = shapeBounds.height;

        const el = img.getElement() as HTMLImageElement;
        const imgW = el?.naturalWidth || img.width || 1;
        const imgH = el?.naturalHeight || img.height || 1;

        // Cover fit inside the shape bounds
        const scaleFactor = Math.max(shapeW / imgW, shapeH / imgH);

        img.set({
          scaleX: scaleFactor,
          scaleY: scaleFactor,
          left: shapeBounds.left + shapeW / 2,
          top: shapeBounds.top + shapeH / 2,
          originX: "center",
          originY: "center",
        });

        // Use the shape as a clipPath
        const clipShape = await activeObj.clone();
        clipShape.set({
          absolutePositioned: true,
        });
        img.clipPath = clipShape;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (img as any).__editorId = `clipped-image-${Date.now()}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (img as any).__isShape = true;

        // Remove the original shape and add the clipped image
        canvas.remove(activeObj);
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      } catch (err) {
        console.error("Error clipping image to shape:", err);
      }
    };
    reader.readAsDataURL(file);

    if (clipImageInputRef.current) clipImageInputRef.current.value = '';
  }, [canvas]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 shrink-0">
        <h3 className="text-base font-bold text-white mb-3">Shapes</h3>

        {/* Fill Color */}
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Fill Color</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="relative">
              <button
                onClick={() => document.getElementById("shape-fill-input")?.click()}
                className="w-7 h-7 rounded-md border-2 border-dashed border-white/20 hover:border-white/40 transition-all"
                style={{ backgroundColor: shapeColor }}
              />
              <input
                id="shape-fill-input"
                type="color"
                value={shapeColor}
                onChange={(e) => setShapeColor(e.target.value)}
                className="absolute inset-0 opacity-0 w-0 h-0"
              />
            </div>
            {brandColors.map((c) => (
              <button
                key={c}
                onClick={() => setShapeColor(c)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                  shapeColor === c ? "border-cyan-400 ring-1 ring-cyan-400/40" : "border-white/10"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            {QUICK_COLORS.slice(0, 8).map((c) => (
              <button
                key={c}
                onClick={() => setShapeColor(c)}
                className={cn(
                  "w-5 h-5 rounded-full border transition-all hover:scale-110",
                  shapeColor === c ? "border-cyan-400" : "border-white/10"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Border */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Border</p>
            <span className="text-[10px] text-gray-400 font-mono">{shapeBorderWidth}px</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => document.getElementById("shape-border-input")?.click()}
                className="w-6 h-6 rounded-md border border-white/20 hover:border-white/40 transition-all"
                style={{ backgroundColor: shapeBorder }}
              />
              <input
                id="shape-border-input"
                type="color"
                value={shapeBorder}
                onChange={(e) => setShapeBorder(e.target.value)}
                className="absolute inset-0 opacity-0 w-0 h-0"
              />
            </div>
            <Slider
              value={[shapeBorderWidth]}
              min={0}
              max={10}
              step={1}
              onValueChange={(val) => setShapeBorderWidth(val[0])}
              className="flex-1 cursor-pointer"
            />
          </div>
        </div>

        {/* Opacity */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Opacity</p>
            <span className="text-[10px] text-gray-400 font-mono">{Math.round(shapeOpacity * 100)}%</span>
          </div>
          <Slider
            value={[shapeOpacity]}
            min={0.05}
            max={1}
            step={0.05}
            onValueChange={(val) => setShapeOpacity(val[0])}
            className="cursor-pointer"
          />
        </div>
      </div>

      {/* Shape Grid */}
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Add Shape</p>
        <div className="grid grid-cols-3 gap-2">
          {SHAPE_PRESETS.map((shape) => (
            <button
              key={shape.id}
              onClick={() => addShapeToCanvas(shape.id)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/10 bg-white/3 hover:bg-white/8 hover:border-white/20 transition-all group"
              title={shape.label}
            >
              <div className="text-gray-400 group-hover:text-white transition-colors">
                <ShapePreview id={shape.id} />
              </div>
              <span className="text-[9px] text-gray-600 group-hover:text-gray-400 font-medium">{shape.label}</span>
            </button>
          ))}
        </div>

        {/* Image in Shape */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Image in Shape</p>
          <p className="text-[11px] text-gray-500 mb-2">Select a shape on the canvas, then upload an image to clip into it.</p>
          <input
            ref={clipImageInputRef}
            type="file"
            accept="image/*"
            onChange={handleClipImageUpload}
            className="hidden"
          />
          <button
            onClick={() => clipImageInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-cyan-400/50 bg-white/2 hover:bg-white/5 text-gray-400 hover:text-white text-xs font-medium transition-all"
          >
            <ImagePlus size={14} />
            Upload Image to Shape
          </button>
        </div>
      </div>
    </div>
  );
}

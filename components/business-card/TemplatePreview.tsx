"use client";

import { useEffect, useRef, useState, memo } from "react";
import * as fabric from "fabric";
import { BrandProfile } from "@/types/brand";
import { CARD_CANVAS_HEIGHT, CARD_CANVAS_WIDTH, renderCardSource } from "@/utils/cardCanvasRenderer";

/** Lightweight preview canvas — renders an SVG template hydrated with brand colours. */
const TemplatePreview = memo(function TemplatePreview({
  templatePath,
  profile,
}: {
  templatePath: string;
  profile: Partial<BrandProfile>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const mountedRef = useRef(true);
  const [scale, setScale] = useState(1);

  // Initialize canvas once
  useEffect(() => {
    mountedRef.current = true;
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CARD_CANVAS_WIDTH,
      height: CARD_CANVAS_HEIGHT,
      backgroundColor: "#ffffff",
      selection: false,
      renderOnAddRemove: true,
    });
    fabricRef.current = canvas;

    return () => {
      mountedRef.current = false;
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // Responsive scaling via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const w = container.clientWidth;
      const s = w / CARD_CANVAS_WIDTH;
      setScale(s);
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    updateScale();

    return () => observer.disconnect();
  }, []);

  // Stable serialized key to avoid re-running on every render due to new object refs
  const profileKey = JSON.stringify(profile);

  // Re-hydrate whenever profile changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    let cancelled = false;

    const doHydrate = async () => {
      try {
        await renderCardSource({
          canvas,
          source: templatePath,
          profile,
          readOnly: true,
        });
        if (cancelled || !mountedRef.current) return;
      } catch (err) {
        console.error(`Error hydrating ${templatePath}:`, err);
      }
    };

    doHydrate();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatePath, profileKey]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ aspectRatio: "1050 / 600" }}
    >
      <div
        style={{
          width: CARD_CANVAS_WIDTH,
          height: CARD_CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
});

export default TemplatePreview;

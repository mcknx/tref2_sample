import * as fabric from "fabric";
import { hydrateSVG } from "@/utils/svgHydrator";
import { BrandProfile } from "@/types/brand";

export const CARD_CANVAS_WIDTH = 1050;
export const CARD_CANVAS_HEIGHT = 600;

interface RenderCardSourceOptions {
  canvas: fabric.Canvas;
  source: unknown;
  profile: Partial<BrandProfile>;
  readOnly?: boolean;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isCanvasAlive(canvas: fabric.Canvas): boolean {
  try {
    // Fabric.js stores the 2D context; if disposed it becomes undefined
    return !!(canvas as unknown as Record<string, unknown>).contextContainer;
  } catch {
    return false;
  }
}

function applyObjectsToCanvas(
  canvas: fabric.Canvas,
  objects: fabric.Object[],
  options: Record<string, unknown> | undefined,
  normalizeToCanvas: boolean
) {
  if (!isCanvasAlive(canvas)) return;

  const sourceWidth = toNumber(options?.width) ?? canvas.getWidth();
  const sourceHeight = toNumber(options?.height) ?? canvas.getHeight();
  const sourceLeft = toNumber(options?.left) ?? 0;
  const sourceTop = toNumber(options?.top) ?? 0;

  const targetWidth = canvas.getWidth();
  const targetHeight = canvas.getHeight();
  const scaleX = sourceWidth > 0 ? targetWidth / sourceWidth : 1;
  const scaleY = sourceHeight > 0 ? targetHeight / sourceHeight : 1;

  canvas.clear();
  objects.forEach((obj) => {
    if (normalizeToCanvas) {
      obj.set({
        left: ((obj.left ?? 0) - sourceLeft) * scaleX,
        top: ((obj.top ?? 0) - sourceTop) * scaleY,
        scaleX: (obj.scaleX ?? 1) * scaleX,
        scaleY: (obj.scaleY ?? 1) * scaleY,
      });
    }
    obj.setCoords();
    canvas.add(obj);
  });
}

export async function renderCardSource({
  canvas,
  source,
  profile,
  readOnly = false,
}: RenderCardSourceOptions): Promise<void> {
  if (!source) return;
  if (!isCanvasAlive(canvas)) return;

  if (typeof source === "string") {
    const input = source.trim();
    const isSvgMarkup = /<svg[\s>]/i.test(input);

    if (isSvgMarkup) {
      const { objects, options } = await fabric.loadSVGFromString(input);
      if (!isCanvasAlive(canvas)) return;
      applyObjectsToCanvas(
        canvas,
        (objects || []) as fabric.Object[],
        (options || {}) as Record<string, unknown>,
        true
      );
    } else if (input.endsWith(".svg")) {
      const { objects, options } = await fabric.loadSVGFromURL(input);
      if (!isCanvasAlive(canvas)) return;
      const hydratedObjects = await hydrateSVG(
        (objects || []) as fabric.Object[],
        options,
        profile,
        { templatePath: input }
      );
      if (!isCanvasAlive(canvas)) return;

      applyObjectsToCanvas(
        canvas,
        hydratedObjects,
        (options || {}) as Record<string, unknown>,
        false
      );
    } else {
      // JSON string (compact canvas state) or raw JSON
      let parsed: unknown;
      try {
        parsed = typeof source === 'string' ? JSON.parse(source) : source;
      } catch {
        parsed = source;
      }
      if (!isCanvasAlive(canvas)) return;
      try {
        await canvas.loadFromJSON(parsed as object);
      } catch {
        if (!isCanvasAlive(canvas)) return;
        throw new Error('Failed to load JSON into canvas');
      }
    }
  } else {
    if (!isCanvasAlive(canvas)) return;
    try {
      await canvas.loadFromJSON(source as object);
    } catch {
      if (!isCanvasAlive(canvas)) return;
      throw new Error('Failed to load JSON into canvas');
    }
  }

  if (!isCanvasAlive(canvas)) return;

  if (readOnly) {
    canvas.forEachObject((obj) => {
      obj.selectable = false;
      obj.evented = false;
      obj.lockMovementX = true;
      obj.lockMovementY = true;
    });
  }

  canvas.requestRenderAll();
}

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Canvas undo/redo history based on JSON snapshots.
 *
 * After every meaningful Fabric.js change we serialize the canvas to JSON
 * and push it onto an undo stack. Undo / redo navigate between snapshots.
 * A new action after an undo clears the redo stack (standard behaviour).
 * Saves are debounced (100 ms) to avoid flooding during drags.
 */

const MAX_HISTORY = 50;

export interface CanvasHistoryAPI {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Call once after the initial template is fully loaded. */
  saveInitialState: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCanvasHistory(canvas: any | null): CanvasHistoryAPI {
  // Stacks live in refs so callbacks always see the latest values.
  const undoRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);

  // Boolean state drives re-renders for the disabled prop on buttons.
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Guard – true while restoring a snapshot (prevents re-save loops)
  const isRestoring = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Sync the boolean states from the ref lengths. */
  const syncFlags = useCallback(() => {
    setCanUndo(undoRef.current.length > 1);
    setCanRedo(redoRef.current.length > 0);
  }, []);

  // ── Snapshot helpers ──────────────────────────────────────────────────
  const takeSnapshot = useCallback((): string | null => {
    if (!canvas) return null;
    try {
      return JSON.stringify(canvas.toJSON());
    } catch {
      return null;
    }
  }, [canvas]);

  const restoreSnapshot = useCallback(
    (json: string) => {
      if (!canvas) return;
      isRestoring.current = true;
      canvas.loadFromJSON(json).then(() => {
        canvas.requestRenderAll();
        // Small delay so Fabric events from loadFromJSON don't re-trigger saveState
        requestAnimationFrame(() => {
          isRestoring.current = false;
        });
      });
    },
    [canvas],
  );

  // ── Save ──────────────────────────────────────────────────────────────
  const saveState = useCallback(() => {
    if (isRestoring.current || !canvas) return;

    const snap = takeSnapshot();
    if (!snap) return;

    // Avoid duplicate consecutive entries
    const stack = undoRef.current;
    if (stack.length > 0 && stack[stack.length - 1] === snap) return;

    stack.push(snap);

    // Cap history
    if (stack.length > MAX_HISTORY) stack.shift();

    // Any new action clears the redo stack
    redoRef.current = [];
    syncFlags();
  }, [canvas, takeSnapshot, syncFlags]);

  const debouncedSave = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(saveState, 100);
  }, [saveState]);

  // ── Public API ────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    const stack = undoRef.current;
    if (!canvas || stack.length <= 1) return;

    const current = stack.pop()!;
    redoRef.current.push(current);
    syncFlags();

    restoreSnapshot(stack[stack.length - 1]);
  }, [canvas, restoreSnapshot, syncFlags]);

  const redo = useCallback(() => {
    const rStack = redoRef.current;
    if (!canvas || rStack.length === 0) return;

    const next = rStack.pop()!;
    undoRef.current.push(next);
    syncFlags();

    restoreSnapshot(next);
  }, [canvas, restoreSnapshot, syncFlags]);

  const saveInitialState = useCallback(() => {
    if (!canvas) return;
    const snap = takeSnapshot();
    if (!snap) return;

    undoRef.current = [snap];
    redoRef.current = [];
    syncFlags();
  }, [canvas, takeSnapshot, syncFlags]);

  // ── Wire up Fabric events & keyboard shortcuts ────────────────────────
  useEffect(() => {
    if (!canvas) return;

    const onChange = () => debouncedSave();

    canvas.on('object:modified', onChange);
    canvas.on('object:added', onChange);
    canvas.on('object:removed', onChange);

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.off('object:modified', onChange);
      canvas.off('object:added', onChange);
      canvas.off('object:removed', onChange);
      window.removeEventListener('keydown', handleKeyDown);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [canvas, debouncedSave, undo, redo]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    saveInitialState,
  };
}

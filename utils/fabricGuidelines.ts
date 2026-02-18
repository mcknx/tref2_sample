import * as fabric from "fabric";

/**
 * Adds alignment guidelines and snapping to a Fabric.js canvas.
 */
export function initCenteringGuidelines(canvas: fabric.Canvas) {
    const ctx = canvas.getContext();
    const aligningLineMargin = 4;
    const aligningLineWidth = 1;
    const aligningLineColor = "rgb(0, 191, 255)";
    const softSnapStrength = 0.22;
    const maxNudgePerMove = 8;

    let viewportTransform: any;
    let zoom = 1;

    let verticalLines: any[] = [];
    let horizontalLines: any[] = [];

    function drawVerticalLine(x: number) {
        drawLine(
            x + 0.5,
            -(8000 / zoom),
            x + 0.5,
            (8000 / zoom)
        );
    }

    function drawHorizontalLine(y: number) {
        drawLine(
            -(8000 / zoom),
            y + 0.5,
            (8000 / zoom),
            y + 0.5
        );
    }

    function drawLine(x1: number, y1: number, x2: number, y2: number) {
        ctx.save();
        ctx.lineWidth = aligningLineWidth;
        ctx.strokeStyle = aligningLineColor;
        ctx.beginPath();
        ctx.moveTo(x1 * zoom + viewportTransform[4], y1 * zoom + viewportTransform[5]);
        ctx.lineTo(x2 * zoom + viewportTransform[4], y2 * zoom + viewportTransform[5]);
        ctx.stroke();
        ctx.restore();
    }

    function isInRange(value1: number, value2: number) {
        return Math.abs(value1 - value2) <= aligningLineMargin;
    }

    function clampNudge(delta: number) {
        return Math.max(-maxNudgePerMove, Math.min(maxNudgePerMove, delta));
    }

    canvas.on("mouse:down", () => {
        viewportTransform = canvas.viewportTransform;
        zoom = canvas.getZoom();
    });

    canvas.on("object:moving", (e) => {
        const activeObject = e.target;
        if (!activeObject) return;

        const canvasWidth = canvas.getWidth() / zoom;
        const canvasHeight = canvas.getHeight() / zoom;

        // Use getBoundingRect to handle rotated/scaled objects accurately
        const activeObjectBoundingRect = activeObject.getBoundingRect();
        const activeObjectCenter = activeObject.getCenterPoint();

        // Check against canvas centers
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        verticalLines = [];
        horizontalLines = [];

        const currentLeft = activeObject.left || 0;
        const currentTop = activeObject.top || 0;

        let bestX: { target: number; diff: number } | null = null;
        let bestY: { target: number; diff: number } | null = null;

        const considerX = (target: number, diff: number) => {
            if (!bestX || diff < bestX.diff) {
                bestX = { target, diff };
            }
        };

        const considerY = (target: number, diff: number) => {
            if (!bestY || diff < bestY.diff) {
                bestY = { target, diff };
            }
        };

        // Show guide for vertical center + soft nudge
        if (isInRange(activeObjectCenter.x, centerX)) {
            verticalLines.push(centerX);
            const deltaX = centerX - activeObjectCenter.x;
            considerX(currentLeft + deltaX, Math.abs(deltaX));
        }

        // Show guide for horizontal center + soft nudge
        if (isInRange(activeObjectCenter.y, centerY)) {
            horizontalLines.push(centerY);
            const deltaY = centerY - activeObjectCenter.y;
            considerY(currentTop + deltaY, Math.abs(deltaY));
        }

        // Show guides against other objects + soft nudge
        canvas.forEachObject((obj) => {
            if (obj === activeObject || !obj.selectable) return;

            const objectBoundingRect = obj.getBoundingRect();
            const objectCenter = obj.getCenterPoint();

            // Vertical alignments
            // Center to Center
            if (isInRange(activeObjectCenter.x, objectCenter.x)) {
                verticalLines.push(objectCenter.x);
                const deltaX = objectCenter.x - activeObjectCenter.x;
                considerX(currentLeft + deltaX, Math.abs(deltaX));
            }
            // Left to Left
            if (isInRange(activeObjectBoundingRect.left, objectBoundingRect.left)) {
                verticalLines.push(objectBoundingRect.left);
                const deltaX = objectBoundingRect.left - activeObjectBoundingRect.left;
                considerX(currentLeft + deltaX, Math.abs(deltaX));
            }
            // Right to Right
            if (isInRange(activeObjectBoundingRect.left + activeObjectBoundingRect.width, objectBoundingRect.left + objectBoundingRect.width)) {
                verticalLines.push(objectBoundingRect.left + objectBoundingRect.width);
                const activeRight = activeObjectBoundingRect.left + activeObjectBoundingRect.width;
                const objectRight = objectBoundingRect.left + objectBoundingRect.width;
                const deltaX = objectRight - activeRight;
                considerX(currentLeft + deltaX, Math.abs(deltaX));
            }

            // Horizontal alignments
            // Center to Center
            if (isInRange(activeObjectCenter.y, objectCenter.y)) {
                horizontalLines.push(objectCenter.y);
                const deltaY = objectCenter.y - activeObjectCenter.y;
                considerY(currentTop + deltaY, Math.abs(deltaY));
            }
            // Top to Top
            if (isInRange(activeObjectBoundingRect.top, objectBoundingRect.top)) {
                horizontalLines.push(objectBoundingRect.top);
                const deltaY = objectBoundingRect.top - activeObjectBoundingRect.top;
                considerY(currentTop + deltaY, Math.abs(deltaY));
            }
            // Bottom to Bottom
            if (isInRange(activeObjectBoundingRect.top + activeObjectBoundingRect.height, objectBoundingRect.top + objectBoundingRect.height)) {
                horizontalLines.push(objectBoundingRect.top + objectBoundingRect.height);
                const activeBottom = activeObjectBoundingRect.top + activeObjectBoundingRect.height;
                const objectBottom = objectBoundingRect.top + objectBoundingRect.height;
                const deltaY = objectBottom - activeBottom;
                considerY(currentTop + deltaY, Math.abs(deltaY));
            }
        });

        // Apply soft magnetic pull toward closest alignment on each axis
        if (bestX) {
            const xCandidate: { target: number; diff: number } = bestX;
            const pullX = (xCandidate.target - currentLeft) * softSnapStrength;
            activeObject.set({ left: currentLeft + clampNudge(pullX) });
        }

        if (bestY) {
            const yCandidate: { target: number; diff: number } = bestY;
            const pullY = (yCandidate.target - currentTop) * softSnapStrength;
            activeObject.set({ top: currentTop + clampNudge(pullY) });
        }
    });

    canvas.on("before:render", () => {
        canvas.clearContext(canvas.contextTop);
    });

    canvas.on("after:render", () => {
        for (let i = verticalLines.length; i--;) {
            drawVerticalLine(verticalLines[i]);
        }
        for (let j = horizontalLines.length; j--;) {
            drawHorizontalLine(horizontalLines[j]);
        }
        verticalLines = [];
        horizontalLines = [];
    });

    canvas.on("mouse:up", () => {
        canvas.requestRenderAll();
    });
}

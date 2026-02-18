"use client";

import { useEffect, useRef } from "react";
import ColorThief from "colorthief";

// Helper to convert RGB array to Hex
const rgbToHex = (r: number, g: number, b: number) =>
    "#" +
    [r, g, b]
        .map((x) => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        })
        .join("");

interface ColorExtractorProps {
    imageSrc: string;
    onColorsExtracted?: (colors: string[]) => void;
}

export default function ColorExtractor({ imageSrc, onColorsExtracted }: ColorExtractorProps) {
    const imgRef = useRef<HTMLImageElement>(null);
    const callbackRef = useRef(onColorsExtracted);
    callbackRef.current = onColorsExtracted;

    useEffect(() => {
        if (!imageSrc || !imgRef.current) return;

        const img = imgRef.current;

        const extract = () => {
            try {
                const colorThief = new ColorThief();
                const palette = colorThief.getPalette(img, 6); // Get up to 6 colors

                if (palette && palette.length > 0) {
                    const hexColors = palette.map(([r, g, b]: [number, number, number]) => rgbToHex(r, g, b));
                    
                    // Remove near-duplicates
                    const uniqueColors = hexColors.filter((color: string, index: number, self: string[]) => {
                        return self.indexOf(color) === index;
                    });
                    
                    console.log("Extracted palette:", uniqueColors);
                    if (callbackRef.current) {
                        callbackRef.current(uniqueColors);
                    }
                }
            } catch (e) {
                console.error("Color extraction failed", e);
            }
        };

        if (img.complete) {
            extract();
        } else {
            img.addEventListener("load", extract);
            return () => img.removeEventListener("load", extract);
        }
    }, [imageSrc]);

    return (
        <div className="hidden">
            {/* Hidden image used for analysis */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                ref={imgRef}
                src={imageSrc}
                alt="analysis target"
                crossOrigin="anonymous"
                width={200}
                height={200}
            />
        </div>
    );
}

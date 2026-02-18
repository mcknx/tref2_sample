"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
    className?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: number[];
    onValueChange?: (value: number[]) => void;
    disabled?: boolean;
}

export function Slider({
    className,
    min = 0,
    max = 100,
    step = 1,
    value = [0],
    onValueChange,
    disabled
}: SliderProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onValueChange) {
            onValueChange([parseFloat(e.target.value)]);
        }
    };

    const val = value[0] ?? min;

    return (
        <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={val}
                onChange={handleChange}
                disabled={disabled}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
            />
        </div>
    );
}

"use client";

import { useBrandStore } from "@/store/brand-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function ColorPicker() {
    const { profile, updateProfile } = useBrandStore();
    const colors = profile.colors || { primaryText: "#1e293b", text: "#334155", background: "#ffffff" };

    const handleChange = (key: keyof typeof colors, value: string) => {
        updateProfile({ colors: { ...colors, [key]: value } });
    };

    return (
        <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
                <Label>Primary</Label>
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded border" style={{ backgroundColor: colors.primaryText }}></div>
                    <Input
                        type="color"
                        value={colors.primaryText}
                        onChange={(e) => handleChange("primaryText", e.target.value)}
                        className="w-12 h-10 p-1"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Text</Label>
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded border" style={{ backgroundColor: colors.text || colors.primaryText }}></div>
                    <Input
                        type="color"
                        value={colors.text || colors.primaryText}
                        onChange={(e) => handleChange("text", e.target.value)}
                        className="w-12 h-10 p-1"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Background</Label>
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded border" style={{ backgroundColor: colors.background }}></div>
                    <Input
                        type="color"
                        value={colors.background}
                        onChange={(e) => handleChange("background", e.target.value)}
                        className="w-12 h-10 p-1"
                    />
                </div>
            </div>
        </div>
    );
}

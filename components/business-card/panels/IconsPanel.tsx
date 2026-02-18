"use client";

import { useState } from "react";
import { Search, Plus, Minus, Trash2 } from "lucide-react";
import { useEditorStore, IconElement } from "@/store/editor-store";
import { useBrandStore } from "@/store/brand-store";
import { cn } from "@/lib/utils";
import * as fabric from "fabric";

// Simple icon set using unicode / SVG path based icons
const ICON_CATEGORIES = [
  { name: "All", icons: [] },
  {
    name: "Business",
    icons: [
      { name: "briefcase", label: "Briefcase", path: "M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z" },
      { name: "building", label: "Building", path: "M6 2h12a2 2 0 012 2v16H4V4a2 2 0 012-2zm2 4v2h2V6H8zm6 0v2h2V6h-2zM8 10v2h2v-2H8zm6 0v2h2v-2h-2zM8 14v2h2v-2H8zm6 0v2h2v-2h-2z" },
      { name: "phone", label: "Phone", path: "M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.86 19.86 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" },
      { name: "mail", label: "Mail", path: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" },
      { name: "globe", label: "Globe", path: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 0a14 14 0 014 10 14 14 0 01-4 10m0-20a14 14 0 00-4 10 14 14 0 004 10M2 12h20" },
      { name: "map-pin", label: "Location", path: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 13a3 3 0 100-6 3 3 0 000 6z" },
      { name: "calendar", label: "Calendar", path: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" },
      { name: "clock", label: "Clock", path: "M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2" },
      { name: "user", label: "User", path: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" },
      { name: "award", label: "Award", path: "M12 15a7 7 0 100-14 7 7 0 000 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.12" },
    ],
  },
  {
    name: "Social",
    icons: [
      { name: "share-2", label: "Share", path: "M18 8a3 3 0 100-6 3 3 0 000 6zm-12 4a3 3 0 100-6 3 3 0 000 6zm12 4a3 3 0 100-6 3 3 0 000 6zM8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" },
      { name: "at-sign", label: "At Sign", path: "M12 16a4 4 0 100-8 4 4 0 000 8zm0 0v1.5A2.5 2.5 0 0014.5 20 10 10 0 1022 12" },
      { name: "link", label: "Link", path: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" },
      { name: "message-circle", label: "Chat", path: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" },
      { name: "thumbs-up", label: "Like", path: "M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" },
      { name: "heart", label: "Heart", path: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" },
    ],
  },
  {
    name: "Tech",
    icons: [
      { name: "code", label: "Code", path: "M16 18l6-6-6-6M8 6l-6 6 6 6" },
      { name: "cpu", label: "CPU", path: "M9 9h6v6H9zM2 12h3M19 12h3M12 2v3M12 19v3" },
      { name: "wifi", label: "WiFi", path: "M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" },
      { name: "monitor", label: "Monitor", path: "M2 3h20v14H2zM8 21h8M12 17v4" },
      { name: "smartphone", label: "Phone", path: "M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zM12 18h.01" },
      { name: "cloud", label: "Cloud", path: "M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" },
    ],
  },
  {
    name: "Arrows",
    icons: [
      { name: "arrow-right", label: "Right", path: "M5 12h14M12 5l7 7-7 7" },
      { name: "arrow-up-right", label: "Up Right", path: "M7 17L17 7M7 7h10v10" },
      { name: "check", label: "Check", path: "M20 6L9 17l-5-5" },
      { name: "chevron-right", label: "Chevron", path: "M9 18l6-6-6-6" },
      { name: "external-link", label: "External", path: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" },
      { name: "zap", label: "Zap", path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
    ],
  },
];

const ALL_ICONS = ICON_CATEGORIES.slice(1).flatMap((c) => c.icons);

const ICON_TO_FIELD_PREFIX: Record<string, string[]> = {
  phone: ["#phone"],
  mail: ["#email"],
  globe: ["#website"],
  link: ["#website"],
  "map-pin": ["#address", "#location"],
};

interface IconsPanelProps {
  canvas: any;
}

export default function IconsPanel({ canvas }: IconsPanelProps) {
  const { iconElements, addIconElement, removeIconElement, updateIconElement } = useEditorStore();
  const { profile } = useBrandStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [iconColor, setIconColor] = useState("#000000");
  const [iconSize, setIconSize] = useState(24);

  const brandColors = [
    profile?.colors?.primaryText || "#000000",
    profile?.colors?.background || "#3b82f6",
  ];

  const filteredIcons = activeCategory === "All"
    ? ALL_ICONS.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : (ICON_CATEGORIES.find((c) => c.name === activeCategory)?.icons || []).filter((i) =>
        i.label.toLowerCase().includes(search.toLowerCase())
      );

  const findTargetField = (iconName: string) => {
    if (!canvas) return null;
    const prefixes = ICON_TO_FIELD_PREFIX[iconName] || [];
    if (prefixes.length === 0) return null;

    const objects = canvas.getObjects();
    for (const prefix of prefixes) {
      const target = objects.find((obj: any) => {
        const id = obj?.id || obj?.name || "";
        return (
          typeof id === "string" &&
          id.startsWith(prefix) &&
          (obj.type === "textbox" || obj.type === "text" || obj.type === "i-text")
        );
      });
      if (target) return target;
    }
    return null;
  };

  const handleAddIcon = (icon: typeof ALL_ICONS[0]) => {
    if (!canvas) return;
    const id = `icon-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const targetField = findTargetField(icon.name);
    const scale = iconSize / 24;
    let left = 300 + Math.random() * 200;
    let top = 200 + Math.random() * 100;

    if (targetField) {
      const targetBounds = targetField.getBoundingRect();
      const gap = 10;

      const existingAnchoredIcons = canvas
        .getObjects()
        .filter((obj: any) => obj.__isIcon === true && obj.__anchorField === (targetField as any).id);

      const iconWidth = iconSize;
      const iconHeight = iconSize;
      const stackOffset = existingAnchoredIcons.length * (iconWidth + 6);

      left = targetBounds.left - gap - iconWidth - stackOffset;
      top = targetBounds.top + (targetBounds.height - iconHeight) / 2;
    }

    // Create SVG path on canvas
    const pathObj = new fabric.Path(icon.path, {
      left,
      top,
      fill: iconColor,
      stroke: iconColor,
      strokeWidth: 1.5,
      scaleX: scale,
      scaleY: scale,
    } as any);
    (pathObj as any).__editorId = id;
    (pathObj as any).__isIcon = true;
    (pathObj as any).__anchorField = targetField ? (targetField as any).id : null;
    canvas.add(pathObj);
    canvas.setActiveObject(pathObj);
    canvas.requestRenderAll();

    addIconElement({
      id,
      fabricId: id,
      name: icon.name,
      icon: icon.label,
      fill: iconColor,
      size: iconSize,
    });
  };

  const handleRemoveIcon = (id: string) => {
    if (!canvas) return;
    const obj = canvas.getObjects().find((o: any) => o.__editorId === id);
    if (obj) {
      canvas.remove(obj);
      canvas.requestRenderAll();
    }
    removeIconElement(id);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 shrink-0">
        <h3 className="text-base font-bold text-white mb-3">Icons</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-2">
          {ICON_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                "text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap border transition-all",
                activeCategory === cat.name
                  ? "bg-cyan-500 text-white border-cyan-500"
                  : "text-gray-400 border-white/10 hover:text-white"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Icon Color & Size */}
        <div className="flex items-center gap-2 mb-2">
          <input
            type="color"
            value={iconColor}
            onChange={(e) => setIconColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
          />
          {brandColors.map((c) => (
            <button
              key={c}
              onClick={() => setIconColor(c)}
              className={cn("w-5 h-5 rounded-full border", iconColor === c ? "border-cyan-400" : "border-white/20")}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setIconSize(Math.max(12, iconSize - 4))} className="w-6 h-6 flex items-center justify-center bg-white/5 border border-white/10 rounded text-white text-xs hover:bg-white/10">
              <Minus size={10} />
            </button>
            <span className="text-[10px] text-gray-400 w-6 text-center">{iconSize}</span>
            <button onClick={() => setIconSize(Math.min(96, iconSize + 4))} className="w-6 h-6 flex items-center justify-center bg-white/5 border border-white/10 rounded text-white text-xs hover:bg-white/10">
              <Plus size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* Icon Grid */}
      <div className="flex-1 overflow-y-auto p-4 pt-0">
        <div className="grid grid-cols-4 gap-2">
          {filteredIcons.map((icon) => (
            <button
              key={icon.name}
              onClick={() => handleAddIcon(icon)}
              className="aspect-square rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 flex flex-col items-center justify-center gap-1 transition-all group"
              title={icon.label}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-white transition-colors">
                <path d={icon.path} />
              </svg>
              <span className="text-[8px] text-gray-600 group-hover:text-gray-400">{icon.label}</span>
            </button>
          ))}
        </div>
        {filteredIcons.length === 0 && (
          <p className="text-xs text-gray-500 text-center mt-6">No icons found.</p>
        )}

        {/* Added Icons */}
        {iconElements.length > 0 && (
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Added Icons</p>
            <div className="space-y-1">
              {iconElements.map((el) => (
                <div key={el.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-xs text-white">{el.icon}</span>
                  <button onClick={() => handleRemoveIcon(el.id)} className="p-1 hover:bg-red-500/20 rounded">
                    <Trash2 size={12} className="text-gray-400 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

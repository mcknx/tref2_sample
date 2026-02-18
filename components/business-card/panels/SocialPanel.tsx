"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "@/store/editor-store";
import { useBrandStore } from "@/store/brand-store";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import * as fabric from "fabric";

// Official SVG paths for social platforms
const SOCIAL_SVG: Record<string, { path: string; viewBox: string; bg: string; color: string }> = {
  Instagram: {
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
    viewBox: "0 0 24 24",
    bg: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
    color: "#E1306C",
  },
  LinkedIn: {
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    viewBox: "0 0 24 24",
    bg: "#0A66C2",
    color: "#0A66C2",
  },
  Twitter: {
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    viewBox: "0 0 24 24",
    bg: "#000000",
    color: "#000000",
  },
  Facebook: {
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    viewBox: "0 0 24 24",
    bg: "#1877F2",
    color: "#1877F2",
  },
  TikTok: {
    path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    viewBox: "0 0 24 24",
    bg: "#000000",
    color: "#000000",
  },
  YouTube: {
    path: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
    viewBox: "0 0 24 24",
    bg: "#FF0000",
    color: "#FF0000",
  },
  GitHub: {
    path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
    viewBox: "0 0 24 24",
    bg: "#181717",
    color: "#181717",
  },
  Dribbble: {
    path: "M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.81zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702C16.86 2.61 14.546 1.71 12.01 1.71c-.825 0-1.63.117-2.4.343zm10.335 3.483c-.218.29-1.91 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z",
    viewBox: "0 0 24 24",
    bg: "#EA4C89",
    color: "#EA4C89",
  },
  Behance: {
    path: "M22 7h-7V5h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988H0V5.021h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zM3 11h3.584c2.508 0 2.906-3-.312-3H3v3zm3.391 3H3v3.016h3.341c3.055 0 2.868-3.016.05-3.016z",
    viewBox: "0 0 24 24",
    bg: "#1769FF",
    color: "#1769FF",
  },
};

const PLATFORMS = [
  { name: "Instagram", placeholder: "@username" },
  { name: "LinkedIn", placeholder: "linkedin.com/in/username" },
  { name: "Twitter", placeholder: "@handle" },
  { name: "Facebook", placeholder: "facebook.com/page" },
  { name: "TikTok", placeholder: "@username" },
  { name: "YouTube", placeholder: "youtube.com/channel" },
  { name: "GitHub", placeholder: "github.com/username" },
  { name: "Dribbble", placeholder: "dribbble.com/username" },
  { name: "Behance", placeholder: "behance.net/username" },
];

interface SocialPanelProps {
  canvas: any;
}

type SocialColorMode = "original" | "custom";

// Sidebar icon with brand-colored background pill
function SocialIconBadge({ platform, size = 14 }: { platform: string; size?: number }) {
  const svg = SOCIAL_SVG[platform];
  if (!svg) return null;
  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: svg.bg }}
    >
      <svg viewBox={svg.viewBox} width={size} height={size} fill="#ffffff">
        <path d={svg.path} />
      </svg>
    </div>
  );
}

// Helper: create a fabric.Path icon scaled to a target size
function createSocialIcon(
  platformName: string,
  color: string,
  size: number,
  left: number,
  top: number
): fabric.Path | null {
  const svg = SOCIAL_SVG[platformName];
  if (!svg) return null;
  const icon = new fabric.Path(svg.path, {
    fill: color,
    left,
    top,
    originX: "left",
    originY: "top",
    selectable: true,
    evented: true,
  } as any);
  const bounds = icon.getBoundingRect();
  const scale = size / Math.max(bounds.width, bounds.height);
  icon.set({ scaleX: scale, scaleY: scale });
  return icon;
}

export default function SocialPanel({ canvas }: SocialPanelProps) {
  const {
    socialLinks,
    updateSocialLink,
    socialDisplayStyle,
    setSocialDisplayStyle,
  } = useEditorStore();
  const { profile } = useBrandStore();
  const [socialColor, setSocialColor] = useState("#000000");
  const [socialColorMode, setSocialColorMode] = useState<SocialColorMode>("original");
  const [socialDirection, setSocialDirection] = useState<"horizontal" | "vertical">("horizontal");
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const brandColors = [
    profile?.colors?.primaryText || "#000000",
    profile?.colors?.background || "#3b82f6",
  ];

  const enabledCount = socialLinks.filter((l) => l.enabled).length;

  const getSocialIconColor = useCallback((platformName: string) => {
    if (socialColorMode === "custom") return socialColor;
    return SOCIAL_SVG[platformName]?.color || socialColor;
  }, [socialColor, socialColorMode]);

  // Remove all social-tagged objects from canvas
  const clearSocialObjects = useCallback(() => {
    if (!canvas) return;
    const toRemove = canvas.getObjects().filter((obj: any) =>
      obj.__isSocialItem === true
    );
    toRemove.forEach((obj: any) => canvas.remove(obj));
  }, [canvas]);

  const renderSocialOnCanvas = useCallback(() => {
    if (!canvas) return;

    clearSocialObjects();

    const enabledLinks = socialLinks.filter((l) => l.enabled && l.handle);
    if (enabledLinks.length === 0) {
      canvas.requestRenderAll();
      return;
    }

    const ICON_SIZE = 14;
    const ICON_TEXT_GAP = 5;
    const ITEM_GAP = socialDisplayStyle === "icons-text" ? 24 : 12;
    const isVertical = socialDirection === "vertical";
    const startX = isVertical ? 40 : 100;
    const startY = isVertical ? 380 : 548;
    let xOffset = startX;
    let yOffset = startY;

    const socialObjects: fabric.FabricObject[] = [];

    enabledLinks.forEach((link) => {
      const icon = createSocialIcon(
        link.platform,
        getSocialIconColor(link.platform),
        ICON_SIZE,
        isVertical ? xOffset : xOffset,
        isVertical ? yOffset : startY
      );
      if (icon) {
        (icon as any).__isSocialItem = true;
        (icon as any).__editorId = `social-icon-${link.platform}`;
        socialObjects.push(icon);
        if (!isVertical) {
          xOffset += ICON_SIZE + (socialDisplayStyle === "icons-text" ? ICON_TEXT_GAP : ITEM_GAP);
        }
      }

      if (socialDisplayStyle === "icons-text") {
        const handleText = new fabric.IText(link.handle, {
          left: isVertical ? xOffset + ICON_SIZE + ICON_TEXT_GAP : xOffset,
          top: isVertical ? yOffset : startY,
          fontSize: 11,
          fontFamily: "Inter, Arial, sans-serif",
          fill: socialColor,
          originX: "left",
          originY: "top",
        } as any);
        (handleText as any).__isSocialItem = true;
        (handleText as any).__editorId = `social-handle-${link.platform}`;
        socialObjects.push(handleText);
        handleText.setCoords();
        if (!isVertical) {
          const textWidth = handleText.getBoundingRect().width;
          xOffset += textWidth + ITEM_GAP;
        }
      }

      if (isVertical) {
        yOffset += ICON_SIZE + 10;
      }
    });

    // Create a group so all social items move together
    if (socialObjects.length > 0) {
      const group = new fabric.Group(socialObjects, {
        left: startX,
        top: startY,
        originX: "left",
        originY: "top",
        selectable: true,
        evented: true,
        subTargetCheck: false,
      } as any);
      (group as any).__isSocialItem = true;
      (group as any).__editorId = "social-group";
      canvas.add(group);
    }

    canvas.requestRenderAll();
  }, [canvas, socialLinks, socialDisplayStyle, socialColor, socialDirection, clearSocialObjects, getSocialIconColor]);

  // Debounced re-render when social settings change
  useEffect(() => {
    if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    renderTimeoutRef.current = setTimeout(renderSocialOnCanvas, 350);
    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [renderSocialOnCanvas]);

  const handleTogglePlatform = (platform: string) => {
    const link = socialLinks.find((l) => l.platform === platform);
    if (!link) return;
    updateSocialLink(platform, { enabled: !link.enabled });
  };

  const handleUpdateHandle = (platform: string, handle: string) => {
    updateSocialLink(platform, { handle });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-3 flex-shrink-0 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white mb-1">Social Media</h3>
        <p className="text-[11px] text-gray-500 mb-3">Add social links to your card</p>

        {/* Display Style */}
        <div className="flex bg-white/5 p-0.5 rounded-lg mb-3">
          <button
            onClick={() => setSocialDisplayStyle("icons")}
            className={cn(
              "flex-1 text-[11px] py-1.5 rounded-md font-medium transition-all",
              socialDisplayStyle === "icons"
                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            Icons Only
          </button>
          <button
            onClick={() => setSocialDisplayStyle("icons-text")}
            className={cn(
              "flex-1 text-[11px] py-1.5 rounded-md font-medium transition-all",
              socialDisplayStyle === "icons-text"
                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            Icons + Text
          </button>
        </div>

        {/* Color Picker Row */}
        <div className="flex bg-white/5 p-0.5 rounded-lg mb-2">
          <button
            onClick={() => setSocialColorMode("original")}
            className={cn(
              "flex-1 text-[11px] py-1.5 rounded-md font-medium transition-all",
              socialColorMode === "original"
                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            Original
          </button>
          <button
            onClick={() => setSocialColorMode("custom")}
            className={cn(
              "flex-1 text-[11px] py-1.5 rounded-md font-medium transition-all",
              socialColorMode === "custom"
                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            Custom
          </button>
        </div>

        {/* Direction Toggle */}
        <div className="flex bg-white/5 p-0.5 rounded-lg mb-2">
          <button
            onClick={() => setSocialDirection("horizontal")}
            className={cn(
              "flex-1 text-[11px] py-1.5 rounded-md font-medium transition-all",
              socialDirection === "horizontal"
                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            Horizontal
          </button>
          <button
            onClick={() => setSocialDirection("vertical")}
            className={cn(
              "flex-1 text-[11px] py-1.5 rounded-md font-medium transition-all",
              socialDirection === "vertical"
                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            Vertical
          </button>
        </div>

        {/* Color Picker Row */}
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mr-auto">Icon Color</p>
          {brandColors.map((c) => (
            <button
              key={c}
              onClick={() => setSocialColor(c)}
              disabled={socialColorMode !== "custom"}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                socialColor === c ? "border-cyan-400 ring-1 ring-cyan-400/40" : "border-white/10",
                socialColorMode !== "custom" && "opacity-40 cursor-not-allowed"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="relative">
            <button
              onClick={() => document.getElementById("social-color-input")?.click()}
              disabled={socialColorMode !== "custom"}
              className="w-6 h-6 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-[10px] text-gray-500 hover:border-white/40 transition-all"
              style={{ backgroundColor: socialColor }}
            />
            <input
              id="social-color-input"
              type="color"
              value={socialColor}
              disabled={socialColorMode !== "custom"}
              onChange={(e) => setSocialColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-0 h-0"
            />
          </div>
        </div>
      </div>

      {/* Active count */}
      {enabledCount > 0 && (
        <div className="px-4 py-2 bg-cyan-500/5 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <Eye size={12} className="text-cyan-400" />
            <span className="text-[11px] text-cyan-400 font-medium">
              {enabledCount} platform{enabledCount > 1 ? "s" : ""} active
            </span>
          </div>
        </div>
      )}

      {/* Platforms List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1.5">
          {PLATFORMS.map((platform) => {
            const link = socialLinks.find((l) => l.platform === platform.name);
            const isEnabled = link?.enabled ?? false;

            return (
              <div
                key={platform.name}
                className={cn(
                  "rounded-xl transition-all overflow-hidden",
                  isEnabled
                    ? "bg-white/[0.06] ring-1 ring-cyan-500/20"
                    : "bg-white/[0.02] hover:bg-white/[0.04]"
                )}
              >
                {/* Platform row */}
                <button
                  onClick={() => handleTogglePlatform(platform.name)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 cursor-pointer"
                >
                  <SocialIconBadge platform={platform.name} />
                  <span className={cn(
                    "text-[13px] flex-1 text-left font-medium transition-colors",
                    isEnabled ? "text-white" : "text-gray-400"
                  )}>
                    {platform.name}
                  </span>
                  {/* Toggle */}
                  <div
                    className={cn(
                      "w-9 h-[22px] rounded-full transition-all relative flex-shrink-0",
                      isEnabled ? "bg-cyan-500" : "bg-white/10"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full bg-white absolute top-[3px] transition-all shadow-sm",
                        isEnabled ? "left-[18px]" : "left-[3px]"
                      )}
                    />
                  </div>
                </button>

                {/* Handle input (expanded) */}
                {isEnabled && (
                  <div className="px-3 pb-2.5 pt-0">
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-white/10 px-2.5 py-2 focus-within:border-cyan-500/50 transition-colors">
                      <svg
                        viewBox={SOCIAL_SVG[platform.name]?.viewBox || "0 0 24 24"}
                        width={12}
                        height={12}
                        fill="#6b7280"
                        className="flex-shrink-0"
                      >
                        <path d={SOCIAL_SVG[platform.name]?.path || ""} />
                      </svg>
                      <input
                        type="text"
                        value={link?.handle || ""}
                        onChange={(e) => handleUpdateHandle(platform.name, e.target.value)}
                        placeholder={platform.placeholder}
                        className="w-full bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

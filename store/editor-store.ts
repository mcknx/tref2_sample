import { create } from 'zustand';

export type EditorTab = 'templates' | 'text' | 'background' | 'logo' | 'shapes' | 'icons' | 'social' | 'qrcode';

export interface TextElement {
  id: string;
  fabricId: string;
  label: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight: string;
  fontStyle: string;
  underline: boolean;
  linethrough: boolean;
  charSpacing: number;
  curved: boolean;
  outline: boolean;
  outlineColor: string;
  outlineWidth: number;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  visible: boolean;
  textAlign: string;
}

export interface SocialLink {
  platform: string;
  handle: string;
  enabled: boolean;
  icon: string;
}

export interface QRSettings {
  type: 'website' | 'email' | 'phone' | 'linkedin' | 'vcard';
  data: string;
  showLogo: boolean;
  transparent: boolean;
  size: number;
}

export interface IconElement {
  id: string;
  fabricId: string;
  name: string;
  icon: string;
  fill: string;
  size: number;
}

interface EditorState {
  // Active sidebar tab
  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void;

  // Canvas reference (stored outside React to avoid re-renders)
  canvas: any | null;
  setCanvas: (canvas: any) => void;

  // Selected element
  selectedElementId: string | null;
  selectedElementType: string | null;
  setSelectedElement: (id: string | null, type: string | null) => void;

  // Text elements on canvas
  textElements: TextElement[];
  setTextElements: (elements: TextElement[]) => void;
  updateTextElement: (id: string, updates: Partial<TextElement>) => void;
  addTextElement: (element: TextElement) => void;
  removeTextElement: (id: string) => void;

  // Background
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  backgroundGradient: string | null;
  setBackgroundGradient: (gradient: string | null) => void;

  // Logo
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  logoSize: number;
  setLogoSize: (size: number) => void;

  // Social links
  socialLinks: SocialLink[];
  setSocialLinks: (links: SocialLink[]) => void;
  updateSocialLink: (platform: string, updates: Partial<SocialLink>) => void;
  socialDisplayStyle: 'icons' | 'icons-text';
  setSocialDisplayStyle: (style: 'icons' | 'icons-text') => void;

  // QR Code
  qrSettings: QRSettings;
  setQRSettings: (settings: Partial<QRSettings>) => void;
  qrVisible: boolean;
  setQRVisible: (visible: boolean) => void;

  // Icons
  iconElements: IconElement[];
  addIconElement: (element: IconElement) => void;
  removeIconElement: (id: string) => void;
  updateIconElement: (id: string, updates: Partial<IconElement>) => void;

  // Zoom & Side
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  currentSide: 'front' | 'back';
  setCurrentSide: (side: 'front' | 'back') => void;
  activeTool: 'select' | 'hand';
  setActiveTool: (tool: 'select' | 'hand') => void;
}

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { platform: 'Instagram', handle: '', enabled: false, icon: 'instagram' },
  { platform: 'LinkedIn', handle: '', enabled: false, icon: 'linkedin' },
  { platform: 'Twitter', handle: '', enabled: false, icon: 'twitter' },
  { platform: 'Facebook', handle: '', enabled: false, icon: 'facebook' },
  { platform: 'TikTok', handle: '', enabled: false, icon: 'music-2' },
  { platform: 'YouTube', handle: '', enabled: false, icon: 'youtube' },
  { platform: 'GitHub', handle: '', enabled: false, icon: 'github' },
  { platform: 'Dribbble', handle: '', enabled: false, icon: 'dribbble' },
  { platform: 'Behance', handle: '', enabled: false, icon: 'figma' },
];

export const useEditorStore = create<EditorState>((set) => ({
  activeTab: 'templates',
  setActiveTab: (tab) => set({ activeTab: tab }),

  canvas: null,
  setCanvas: (canvas) => set({ canvas }),

  selectedElementId: null,
  selectedElementType: null,
  setSelectedElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),

  textElements: [],
  setTextElements: (elements) => set({ textElements: elements }),
  updateTextElement: (id, updates) =>
    set((state) => ({
      textElements: state.textElements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),
  addTextElement: (element) =>
    set((state) => ({ textElements: [...state.textElements, element] })),
  removeTextElement: (id) =>
    set((state) => ({
      textElements: state.textElements.filter((el) => el.id !== id),
    })),

  backgroundColor: '#ffffff',
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  backgroundGradient: null,
  setBackgroundGradient: (gradient) => set({ backgroundGradient: gradient }),

  logoUrl: null,
  setLogoUrl: (url) => set({ logoUrl: url }),
  logoSize: 100,
  setLogoSize: (size) => set({ logoSize: size }),

  socialLinks: DEFAULT_SOCIAL_LINKS,
  setSocialLinks: (links) => set({ socialLinks: links }),
  updateSocialLink: (platform, updates) =>
    set((state) => ({
      socialLinks: state.socialLinks.map((link) =>
        link.platform === platform ? { ...link, ...updates } : link
      ),
    })),
  socialDisplayStyle: 'icons',
  setSocialDisplayStyle: (style) => set({ socialDisplayStyle: style }),

  qrSettings: {
    type: 'website',
    data: '',
    showLogo: false,
    transparent: false,
    size: 120,
  },
  setQRSettings: (settings) =>
    set((state) => ({
      qrSettings: { ...state.qrSettings, ...settings },
    })),
  qrVisible: false,
  setQRVisible: (visible) => set({ qrVisible: visible }),

  iconElements: [],
  addIconElement: (element) =>
    set((state) => ({ iconElements: [...state.iconElements, element] })),
  removeIconElement: (id) =>
    set((state) => ({
      iconElements: state.iconElements.filter((el) => el.id !== id),
    })),
  updateIconElement: (id, updates) =>
    set((state) => ({
      iconElements: state.iconElements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),

  zoomLevel: 1,
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
  currentSide: 'front',
  setCurrentSide: (side) => set({ currentSide: side }),
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomTheme {
  id: string;
  name: string;
  colors: {
    primary: string; // discord-blurple
    bgMain: string;
    bgSidebar: string;
    bgServerList: string;
    textNormal: string;
    textMuted: string;
  };
  backgroundImage?: string;
  backgroundOpacity?: number;
  backgroundBlur?: number;
}

interface ThemeState {
  activeThemeId: string;
  customThemes: CustomTheme[];
  activeTheme: CustomTheme | null;
  setTheme: (themeId: string) => void;
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (themeId: string) => void;
  applyTheme: (theme: CustomTheme | null) => void;
}

const DEFAULT_DARK: CustomTheme = {
  id: 'dark',
  name: 'Dark',
  colors: {
    primary: '#5865F2',
    bgMain: '#313338',
    bgSidebar: '#2B2D31',
    bgServerList: '#1E1F22',
    textNormal: '#DBDEE1',
    textMuted: '#949BA4',
  }
};

const DEFAULT_LIGHT: CustomTheme = {
  id: 'light',
  name: 'Light',
  colors: {
    primary: '#5865F2',
    bgMain: '#FFFFFF',
    bgSidebar: '#F2F3F5',
    bgServerList: '#E3E5E8',
    textNormal: '#313338',
    textMuted: '#5C5E66',
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      activeThemeId: 'dark',
      customThemes: [],
      activeTheme: DEFAULT_DARK,
      
      setTheme: (themeId) => {
        let theme: CustomTheme | null = null;
        if (themeId === 'dark') theme = DEFAULT_DARK;
        else if (themeId === 'light') theme = DEFAULT_LIGHT;
        else theme = get().customThemes.find(t => t.id === themeId) || DEFAULT_DARK;
        
        set({ activeThemeId: themeId, activeTheme: theme });
        get().applyTheme(theme);
      },
      
      addCustomTheme: (theme) => {
        set((state) => ({ customThemes: [...state.customThemes, theme] }));
      },
      
      removeCustomTheme: (themeId) => {
         set((state) => ({ customThemes: state.customThemes.filter(t => t.id !== themeId) }));
      },

      applyTheme: (theme) => {
        if (!theme) return;
        
        const root = document.documentElement;
        
        // Helper to convert hex to HSL for Shadcn-like variables
        const hexToHSL = (hex: string) => {
          let r = 0, g = 0, b = 0;
          if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
          } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
          }
          r /= 255; g /= 255; b /= 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h = 0, s, l = (max + min) / 2;
          if (max === min) h = s = 0;
          else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
          }
          return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        };

        // Apply colors to CSS variables
        root.style.setProperty('--background', hexToHSL(theme.colors.bgMain));
        root.style.setProperty('--card', hexToHSL(theme.colors.bgSidebar));
        root.style.setProperty('--popover', hexToHSL(theme.colors.bgServerList));
        root.style.setProperty('--primary', hexToHSL(theme.colors.primary));
        root.style.setProperty('--foreground', hexToHSL(theme.colors.textNormal));
        root.style.setProperty('--muted-foreground', hexToHSL(theme.colors.textMuted));
        
        // Handle background images
        if (theme.backgroundImage) {
          root.style.setProperty('--bg-image', `url(${theme.backgroundImage})`);
          root.style.setProperty('--bg-opacity', (theme.backgroundOpacity || 1).toString());
          root.style.setProperty('--bg-blur', `${theme.backgroundBlur || 0}px`);
        } else {
          root.style.removeProperty('--bg-image');
          root.style.removeProperty('--bg-opacity');
          root.style.removeProperty('--bg-blur');
        }
      }
    }),
    { name: 'teamer-theme' }
  )
);

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme, SKINS } from '../constants/colors';

export const LS_SKIN = 'unyield_skin';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export function ThemeProvider({ children }) {
  const [skin, setSkinState] = useState(SKINS.operator);
  const [isReady, setIsReady] = useState(false);

  // Load skin preference on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const savedSkin = await AsyncStorage.getItem(LS_SKIN);
        if (mounted) {
          if (savedSkin && Object.values(SKINS).includes(savedSkin)) {
            setSkinState(savedSkin);
          }
          setIsReady(true);
        }
      } catch (e) {
        if (mounted) setIsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setSkin = async (newSkin) => {
    if (!Object.values(SKINS).includes(newSkin)) return;
    setSkinState(newSkin);
    try {
      await AsyncStorage.setItem(LS_SKIN, newSkin);
    } catch (e) {
      // Ignore storage errors
    }
  };

  const theme = useMemo(() => getTheme(skin), [skin]);

  const value = useMemo(() => ({
    skin,
    setSkin,
    theme,
    isReady,
  }), [skin, theme, isReady]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

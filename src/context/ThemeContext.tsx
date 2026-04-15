

import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = {
  background: string;
  text: string;
  card: string;
  border: string;
  primary: string; // main accent
  subtext: string;
  button?: string;      // button background
  buttonText?: string;  // button text
  danger?: string;      // red badge
  info?: string;        // blue badge
  success?: string;     // green text
  badge?: string;       // category badge background
  shadow?: string;      // shadow color
};


const lightTheme: Theme = {
  background: "#fff",
  text: "#000",
  card: "#f8f8f8",
  subtext: "#444",
  border: "#ddd",
  primary: "#007AFF",
  button: "#28a745",       // green button
  buttonText: "#fff",
  danger: "#dc3545",
  info: "#0d6efd",
  success: "#28a745",
  badge: "#e0e0e0",
  shadow: "#00000033",
};

const darkTheme: Theme = {
  background: "#000",
  text: "#fff",
  card: "#111",
  subtext: "#aaa",
  border: "#333",
  primary: "#0A84FF",
  button: "#28a745",
  buttonText: "#fff",
  danger: "#dc3545",
  info: "#0d6efd",
  success: "#28a745",
  badge: "#222",
  shadow: "#ffffff33",
};


type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme) {
        setIsDark(savedTheme === "dark");
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newValue = !isDark;
    setIsDark(newValue);
    await AsyncStorage.setItem("theme", newValue ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{ theme: isDark ? darkTheme : lightTheme, isDark, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};

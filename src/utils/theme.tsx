import { createContext, useContext, useState, useEffect } from "react";
import { flushSync } from "react-dom";
export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent) => void;
  setTheme: (theme: Theme) => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = (e?: React.MouseEvent) => {
    const isDark = theme === "dark";
    const nextTheme = isDark ? "light" : "dark";

    if (!document.startViewTransition || !e) {
      setThemeState(nextTheme);
      return;
    }

    let targetX = e ? e.clientX : innerWidth / 2;
    let targetY = e ? e.clientY : innerHeight / 2;

    document.documentElement.classList.add("theme-transitioning");
    
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setIsTransitioning(true);
        setThemeState(nextTheme);
      });
      document.documentElement.setAttribute("data-theme", nextTheme);

      const knob = document.getElementById("theme-knob");
      if (knob) {
        const rect = knob.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }
    });

    transition.ready.then(() => {
      const endRadius = Math.hypot(
        Math.max(targetX, innerWidth - targetX),
        Math.max(targetY, innerHeight - targetY)
      );

      const expandPath = [
        `circle(12px at ${targetX}px ${targetY}px)`,
        `circle(${endRadius}px at ${targetX}px ${targetY}px)`,
      ];

      const shrinkPath = [
        `circle(${endRadius}px at ${targetX}px ${targetY}px)`,
        `circle(12px at ${targetX}px ${targetY}px)`,
      ];

      document.documentElement.animate(
        {
          clipPath: isDark ? shrinkPath : expandPath,
          opacity: isDark ? [1, 1, 0] : [1, 1],
          offset: isDark ? [0, 0.99, 1] : undefined
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: isDark
            ? "::view-transition-old(root)"
            : "::view-transition-new(root)",
        }
      );
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove("theme-transitioning");
      setIsTransitioning(false);
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const contextValue: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
    isTransitioning,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme =
  | "blue"
  | "mint"
  | "green"
  | "purple"
  | "pink"
  | "orange"
  | "red";

export interface ThemeInfo {
  id: Theme;
  name: string;
  description: string;
  color: string;
}

export const THEMES: ThemeInfo[] = [
  {
    id: "blue",
    name: "파란색",
    description: "차분하고 신뢰감 있는 파란색 테마",
    color: "hsl(215, 74.10%, 53.10%)",
  },
  {
    id: "mint",
    name: "민트색",
    description: "상쾌하고 깔끔한 민트색 테마",
    color: "hsl(173, 69.20%, 77.10%)",
  },
  {
    id: "green",
    name: "초록색",
    description: "자연스럽고 안정감 있는 초록색 테마",
    color: "hsl(142, 54.30%, 50.20%)",
  },
  {
    id: "purple",
    name: "보라색",
    description: "창의적이고 우아한 보라색 테마",
    color: "hsl(238, 94%, 67%)",
  },
  {
    id: "pink",
    name: "핑크색",
    description: "따뜻하고 친근한 핑크색 테마",
    color: "hsl(330, 61.40%, 72.50%)",
  },
  {
    id: "orange",
    name: "주황색",
    description: "활기차고 에너지 넘치는 주황색 테마",
    color: "hsl(25, 83.70%, 66.30%)",
  },
  {
    id: "red",
    name: "빨간색",
    description: "강렬하고 역동적인 빨간색 테마",
    color: "hsl(0, 80.10%, 66.50%)",
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: ThemeInfo[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("blue");
  const [mounted, setMounted] = useState(false);

  // 컴포넌트가 마운트된 후에 localStorage에서 테마 로드
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("word-universe-theme") as Theme;
    if (savedTheme && THEMES.find((t) => t.id === savedTheme)) {
      setThemeState(savedTheme);
    }
  }, []);

  // 테마 변경 시 localStorage에 저장하고 DOM에 적용
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("word-universe-theme", newTheme);

    // HTML 요소에 data-theme 속성 설정
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  // 초기 테마 적용
  useEffect(() => {
    if (mounted && typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, mounted]);

  // 서버 사이드 렌더링 중에는 기본 테마 반환
  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{ theme: "blue", setTheme: () => {}, themes: THEMES }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

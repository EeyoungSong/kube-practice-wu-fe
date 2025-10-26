"use client";

import { useTheme, type Theme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          테마
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>색상 테마 선택</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((themeInfo) => (
          <DropdownMenuItem
            key={themeInfo.id}
            onClick={() => setTheme(themeInfo.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: themeInfo.color }}
              />
              <div>
                <div className="font-medium">{themeInfo.name}</div>
                <div className="text-xs text-muted-foreground">
                  {themeInfo.description}
                </div>
              </div>
            </div>
            {theme === themeInfo.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 간단한 색상 팔레트 버전 (헤더나 사이드바용)
export function ThemePalette() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">테마:</span>
      <div className="flex gap-1">
        {themes.map((themeInfo) => (
          <button
            key={themeInfo.id}
            onClick={() => setTheme(themeInfo.id)}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
              theme === themeInfo.id
                ? "border-foreground shadow-md"
                : "border-border hover:border-muted-foreground"
            )}
            style={{ backgroundColor: themeInfo.color }}
            title={themeInfo.name}
          />
        ))}
      </div>
    </div>
  );
}

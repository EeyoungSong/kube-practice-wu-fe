"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemePalette } from "@/components/ThemeSelector";
import { useTheme } from "@/contexts/theme-context";

export function ThemeDemo() {
  const { theme } = useTheme();

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-primary">테마 시스템 데모</h2>
        <p className="text-muted-foreground">
          현재 선택된 테마: <Badge variant="secondary">{theme}</Badge>
        </p>
        <ThemePalette />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Primary 색상</CardTitle>
            <CardDescription>메인 브랜드 색상으로 사용됩니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Primary Button</Button>
            <Button variant="outline" className="w-full">
              Outline Button
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-accent">Accent 색상</CardTitle>
            <CardDescription>강조 요소에 사용되는 색상입니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="w-full h-12 bg-accent rounded flex items-center justify-center text-accent-foreground">
              Accent Background
            </div>
            <Badge>Accent Badge</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Secondary 색상</CardTitle>
            <CardDescription>보조 색상으로 사용됩니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="secondary" className="w-full">
              Secondary Button
            </Button>
            <div className="w-full h-12 bg-secondary rounded flex items-center justify-center text-secondary-foreground">
              Secondary Background
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Destructive 색상</CardTitle>
            <CardDescription>경고나 삭제 등에 사용됩니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="destructive" className="w-full">
              Delete Button
            </Button>
            <Badge variant="destructive">Error Badge</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Muted 색상</CardTitle>
            <CardDescription>보조 텍스트에 사용됩니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="w-full h-12 bg-muted rounded flex items-center justify-center text-muted-foreground">
              Muted Background
            </div>
            <p className="text-muted-foreground">Muted text example</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Border & Input</CardTitle>
            <CardDescription>테두리와 입력 필드 색상</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="w-full h-12 border border-border rounded flex items-center justify-center">
              Border Example
            </div>
            <input
              className="w-full p-2 border border-input rounded bg-background text-foreground"
              placeholder="Input field example"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

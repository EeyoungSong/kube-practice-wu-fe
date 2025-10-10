"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Loader2,
  ChevronDown,
  ChevronRight,
  Play,
} from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import { useLanguage } from "@/hooks/use-language";
import type { Category } from "@/types/category";
import { useRouter } from "next/navigation";

export default function ReviewFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [wordCounts, setWordCounts] = useState<{ [key: number]: number }>({});
  const { selectedLanguage } = useLanguage();
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategories(selectedLanguage);
  const router = useRouter();

  const handleCategoryToggle = (categoryId: number) => {
    const newExpandedCategory =
      expandedCategory === categoryId ? null : categoryId;
    setExpandedCategory(newExpandedCategory);

    // 카테고리가 처음 열릴 때 기본값 설정
    if (newExpandedCategory === categoryId && !wordCounts[categoryId]) {
      setWordCounts((prev) => ({ ...prev, [categoryId]: 20 }));
    }
  };

  const handleWordCountChange = (categoryId: number, value: number[]) => {
    setWordCounts((prev) => ({ ...prev, [categoryId]: value[0] }));
  };

  const handleCategoryReview = (categoryId: number) => {
    const wordCount = wordCounts[categoryId] || 20;
    router.push(
      `/review/?language=${selectedLanguage}&categoryId=${categoryId}&wordCount=${wordCount}`
    );
    setIsOpen(false);
  };

  // 언어가 "all"이거나 카테고리가 없으면 버튼을 표시하지 않음
  if (
    selectedLanguage === "all" ||
    !categoriesData ||
    categoriesData.length === 0
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setExpandedCategory(null);
            setWordCounts({});
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 border-0"
          >
            <div className="relative">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 bg-gray-900 border-gray-700 text-white"
          sideOffset={8}
        >
          <div className="px-3 py-2">
            <p className="text-xs text-gray-400">
              복습할 단어가 있는 카테고리를 선택하세요
            </p>
          </div>

          <DropdownMenuSeparator className="bg-gray-700" />

          <div className="max-h-64 overflow-y-auto">
            {categoriesLoading ? (
              <div className="px-3 py-4 text-center">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-400" />
                <span className="text-xs text-gray-400">
                  카테고리 로딩 중...
                </span>
              </div>
            ) : categoriesData.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <span className="text-xs text-gray-400">
                  카테고리가 없습니다
                </span>
              </div>
            ) : (
              categoriesData.map((category) => (
                <div key={category.id}>
                  {/* Category Header */}
                  <DropdownMenuItem
                    className="px-3 py-2 text-white hover:bg-gray-800 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCategoryToggle(category.id);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{category.name}</span>
                      {expandedCategory === category.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </DropdownMenuItem>

                  {/* Word Count Options (shown when expanded) */}
                  {expandedCategory === category.id && (
                    <div className="bg-gray-800 border-l-2 border-indigo-500 ml-3 p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            복습할 단어 개수
                          </span>
                          <span className="text-sm text-white font-medium">
                            {wordCounts[category.id] || 20}개
                          </span>
                        </div>

                        <Slider
                          value={[wordCounts[category.id] || 20]}
                          onValueChange={(value) =>
                            handleWordCountChange(category.id, value)
                          }
                          max={50}
                          min={10}
                          step={5}
                          className="w-full"
                        />

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>10개</span>
                          <span>50개</span>
                        </div>

                        <Button
                          onClick={() => handleCategoryReview(category.id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-3"
                          size="sm"
                        >
                          <Play className="w-3 h-3 mr-2" />
                          복습 시작
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

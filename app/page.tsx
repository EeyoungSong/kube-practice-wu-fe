"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Filter,
  BookOpen,
  Plus,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { languages } from "./add/page";
import Header from "@/components/Header";
import { useCategories } from "@/hooks/use-categories";
import { useWordbooks } from "@/hooks/use-wordbooks";
import type { Wordbook, WordbookResponse } from "@/hooks/use-wordbooks";
import type { Category } from "@/types/api";
import { wordbookService } from "@/services";

interface Note {
  id: string;
  name: string;
  category: string;
  language: string;
  createdAt: string;
  wordCount: number;
  reviewedWords: number;
  sentences: number;
}

export default function NotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체 카테고리");
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0].value);

  // 카테고리 API 호출
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  // 단어장 API 호출
  const {
    data: wordbooksData,
    isLoading: wordbooksLoading,
    error: wordbooksError,
  } = useWordbooks();

  useEffect(() => {
    console.log(wordbooksData);
  }, [wordbooksData]);

  useEffect(() => {
    console.log(categoriesData);
  }, [categoriesData]);

  const handleDeleteNote = async (id: string) => {
    try {
      await wordbookService.deleteWordbook(id);
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete wordbook:", error);
    }
  };

  // 단어장 데이터를 Note 형태로 변환
  const notes: Note[] = (wordbooksData as WordbookResponse)?.wordbooks
    ? (wordbooksData as WordbookResponse).wordbooks.map(
        (wordbook: Wordbook) => ({
          id: wordbook.id.toString(),
          name: wordbook.name,
          category: wordbook.category_name,
          language: wordbook.language,
          createdAt: wordbook.created_at,
          wordCount: wordbook.sentences.reduce(
            (total, sentence) => total + sentence.words.length,
            0
          ),
          reviewedWords: wordbook.sentences.reduce((total, sentence) => {
            return sentence.is_last_review_successful
              ? total + sentence.words.length
              : total;
          }, 0),
          sentences: wordbook.sentences.length,
        })
      )
    : [];

  const getLanguageLabel = (lang: string) => {
    const labels: { [key: string]: string } = {
      en: "English",
      fr: "Français",
      es: "Español",
      de: "Deutsch",
      ja: "日本語",
      ko: "한국어",
    };
    return labels[lang] || lang;
  };

  const getProgressPercentage = (reviewed: number, total: number) => {
    return total === 0 ? 0 : Math.round((reviewed / total) * 100);
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "전체 카테고리" ||
      note.category === selectedCategory;
    const matchesLanguage =
      selectedLanguage === "전체 언어" || note.language === selectedLanguage;
    return matchesSearch && matchesCategory && matchesLanguage;
  });

  // 로딩 상태 처리
  if (categoriesLoading || wordbooksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <Header
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          languages={languages}
        />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-white mb-2">
                데이터를 불러오는 중...
              </h3>
              <p className="text-gray-400">잠시만 기다려주세요.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Header */}
      <Header
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        languages={languages}
      />

      <main className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          {/* Filters */}
          <div className="mb-8">
            <div className="flex flex-row justify-start  gap-6">
              <div className="space-y-2">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  disabled={categoriesLoading}
                  defaultValue="전체 카테고리"
                >
                  <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white focus:ring-0 focus:ring-offset-0">
                    <SelectValue
                      placeholder={
                        categoriesLoading
                          ? "카테고리 로딩 중..."
                          : "카테고리 선택"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {categoriesData && (
                      <>
                        <SelectItem
                          value="전체 카테고리"
                          className="text-white hover:bg-gray-700"
                        >
                          전체 카테고리
                        </SelectItem>
                        {categoriesData.map((category: Category) => (
                          <SelectItem
                            key={category.id}
                            value={category.name}
                            className="text-white hover:bg-gray-700"
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-1/3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="노트 이름으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error handling */}
          {(categoriesError || wordbooksError) && (
            <Card className="mb-8 bg-red-900/20 border-red-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-red-400 mb-2">
                    오류가 발생했습니다
                  </h3>
                  <p className="text-red-300">
                    {categoriesError?.message || wordbooksError?.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <Link href={`/notes/${note.id}`} key={note.id}>
                <Card
                  key={note.id}
                  className="border-2 border-gray-700 bg-transparent hover:border-indigo-500 transition-all hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg text-white">
                          {note.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-gray-800 text-gray-300 border-gray-600"
                          >
                            {note.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-gray-500 text-gray-300"
                          >
                            {getLanguageLabel(note.language)}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white hover:bg-gray-700"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="bg-gray-800 border-gray-700 text-white"
                          align="start"
                        >
                          <DropdownMenuItem
                            className="text-white hover:bg-gray-700 cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log("편집:", note.id);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            노트 편집
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 hover:bg-gray-700 hover:text-red-300 cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            노트 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.createdAt).toLocaleDateString("ko-KR")}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filteredNotes.length === 0 && !wordbooksLoading && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                노트가 없습니다
              </h3>
              <p className="text-gray-400 mb-4">
                새로운 노트를 만들어 단어 학습을 시작해보세요!
              </p>
              <Link href="/add">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />첫 번째 노트 만들기
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

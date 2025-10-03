"use client";

import { FormEvent, useEffect, useState } from "react";
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
  History,
  TrendingUp,
  Star,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { languages } from "@/types/word";
import Header from "@/components/Header";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";

import { useCategories } from "@/hooks/use-categories";
import { useWordbooks } from "@/hooks/use-wordbooks";
import { useLanguage } from "@/hooks/use-language";
import type { Wordbook, WordbookResponse } from "@/hooks/use-wordbooks";
import type { Category } from "@/types/category";
import { wordbookService } from "@/services";
import { APIError } from "@/services/api-client";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "timeline"
  const queryClient = useQueryClient();

  // 전역 언어 상태 관리
  const { selectedLanguage, setSelectedLanguage, isLoaded } = useLanguage();

  // 카테고리 API 호출
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories(selectedLanguage);

  // 단어장 API 호출
  const {
    data: wordbooksData,
    isLoading: wordbooksLoading,
    error: wordbooksError,
  } = useWordbooks();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; category: string }>({
    name: "",
    category: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setEditForm({
      name: note.name,
      category: note.category,
    });
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingNote(null);
      setEditForm({ name: "", category: "" });
      setEditError(null);
      setIsSavingEdit(false);
    }
    setIsEditDialogOpen(open);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingNote) return;

    const trimmedName = editForm.name.trim();
    const trimmedCategory = editForm.category.trim();

    if (!trimmedName) {
      setEditError("노트 이름을 입력해주세요.");
      return;
    }

    if (!trimmedCategory) {
      setEditError("카테고리를 선택해주세요.");
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError(null);
      await wordbookService.updateWordbook(Number(editingNote.id), {
        name: trimmedName,
        category: trimmedCategory,
      });
      await queryClient.invalidateQueries({ queryKey: ["wordbooks"] });
      setIsEditDialogOpen(false);
      setEditingNote(null);
      setEditForm({ name: "", category: "" });
    } catch (error) {
      console.error("Failed to update wordbook:", error);
      if (error instanceof APIError && error.detail) {
        setEditError(error.detail);
      } else {
        const fallbackMessage =
          error instanceof Error
            ? error.message
            : "노트 업데이트에 실패했습니다. 다시 시도해주세요.";
        setEditError(fallbackMessage);
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

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
      english: "영어",
      chinese: "중국어",
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
      selectedLanguage === "all" || note.language === selectedLanguage;
    return matchesSearch && matchesCategory && matchesLanguage;
  });

  // 날짜별 학습 기록을 위한 데이터 준비
  const getStudyTimeline = () => {
    const timelineData: { [date: string]: any } = {};

    filteredNotes.forEach((note) => {
      const createdDate = new Date(note.createdAt).toLocaleDateString("ko-KR");
      if (!timelineData[createdDate]) {
        timelineData[createdDate] = {
          date: createdDate,
          createdWordbooks: [],
          totalWords: 0,
          totalSentences: 0,
          totalReviewed: 0,
        };
      }

      timelineData[createdDate].createdWordbooks.push(note);
      timelineData[createdDate].totalWords += note.wordCount;
      timelineData[createdDate].totalSentences += note.sentences;
      timelineData[createdDate].totalReviewed += note.reviewedWords;
    });

    return Object.values(timelineData).sort(
      (a: any, b: any) =>
        new Date(b.date.split(".").reverse().join("-")).getTime() -
        new Date(a.date.split(".").reverse().join("-")).getTime()
    );
  };

  // 로딩 상태 처리 (언어 로딩 추가)
  if (categoriesLoading || wordbooksLoading || !isLoaded) {
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

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Filters */}
          <div className="mb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
              {/* 상단: 보기 모드 전환과 새 노트 만들기 버튼 */}
              <div className="flex flex-row justify-between items-center">
                {/* 보기 모드 전환 */}
                <div className="flex border border-gray-600 rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`${
                      viewMode === "grid"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "text-gray-300 hover:bg-gray-800"
                    } rounded-none border-none w-10 h-10 flex items-center justify-center p-0`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "timeline" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("timeline")}
                    className={`${
                      viewMode === "timeline"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "text-gray-300 hover:bg-gray-800"
                    } rounded-none border-none w-10 h-10 flex items-center justify-center p-0`}
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </div>

                {/* 새 노트 만들기 버튼 */}
                <Link href="/add">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white m-4">
                    <Plus className="w-4 h-4 m-2" />
                    <span className="hidden sm:inline">새 노트 만들기</span>
                    <span className="sm:hidden">새 노트</span>
                  </Button>
                </Link>
              </div>

              {/* 하단: 카테고리와 검색 (grid 모드일 때만) */}
              {viewMode === "grid" && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex-shrink-0">
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                      disabled={categoriesLoading}
                      defaultValue="전체 카테고리"
                    >
                      <SelectTrigger className="w-full sm:w-40 bg-gray-800 text-white focus:ring-0 focus:ring-offset-0 border-none">
                        <SelectValue
                          placeholder={
                            categoriesLoading
                              ? "카테고리 로딩 중..."
                              : "카테고리 선택"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-none">
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

                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="노트 이름으로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-800 border-none text-white placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                </div>
              )}
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

          {/* 목록 보기 모드 */}
          {viewMode === "grid" && (
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
                                openEditDialog(note);
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
          )}

          {/* 학습기록 보기 모드 */}
          {viewMode === "timeline" && (
            <div className="space-y-6">
              {getStudyTimeline().map((timelineItem: any, index: number) => (
                <Card key={index} className="bg-transparent border-gray-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {timelineItem.date}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {timelineItem.createdWordbooks.length}개 단어장 생성
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          <span>{timelineItem.totalWords}개 단어</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{timelineItem.totalSentences}개 문장</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>{timelineItem.totalReviewed}개 복습완료</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {timelineItem.createdWordbooks.map((note: Note) => (
                        <Link href={`/notes/${note.id}`} key={note.id}>
                          <div className="rounded-lg p-4 border-l-4 border-indigo-600 hover:bg-gray-800 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-white font-medium">
                                    {note.name}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="bg-gray-600 text-gray-300"
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
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    <span>{note.wordCount}개 단어</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    <span>{note.sentences}개 문장</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      복습률:{" "}
                                      {getProgressPercentage(
                                        note.reviewedWords,
                                        note.wordCount
                                      )}
                                      %
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {getStudyTimeline().length === 0 && (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    학습 기록이 없습니다
                  </h3>
                  <p className="text-gray-400 mb-4">
                    단어장을 생성하여 학습 기록을 만들어보세요!
                  </p>
                  <Link href="/add">
                    <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />첫 번째 노트 만들기
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 목록보기에서 노트가 없을 때 */}
          {viewMode === "grid" &&
            filteredNotes.length === 0 &&
            !wordbooksLoading && (
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
      <Dialog open={isEditDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>노트 편집</DialogTitle>
            <DialogDescription className="text-gray-400">
              노트 이름과 카테고리를 업데이트할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="edit-note-name"
                className="text-gray-200 font-medium"
              >
                노트 이름
              </Label>
              <Input
                id="edit-note-name"
                value={editForm.name}
                onChange={(event) => {
                  setEditForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }));
                  if (editError) {
                    setEditError(null);
                  }
                }}
                className="bg-gray-800 border border-gray-700 text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="노트 이름을 입력하세요"
                disabled={isSavingEdit}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="edit-note-category"
                className="text-gray-200 font-medium"
              >
                카테고리
              </Label>
              <Select
                value={editForm.category || undefined}
                onValueChange={(value) => {
                  setEditForm((prev) => ({ ...prev, category: value }));
                  if (editError) {
                    setEditError(null);
                  }
                }}
                disabled={categoriesLoading || isSavingEdit}
              >
                <SelectTrigger
                  id="edit-note-category"
                  className="bg-gray-800 border border-gray-700 text-white focus:ring-0 focus:ring-offset-0"
                >
                  <SelectValue
                    placeholder={
                      categoriesLoading
                        ? "카테고리 로딩 중..."
                        : "카테고리를 선택하세요"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-700 text-white">
                  {categoriesData?.map((category: Category) => (
                    <SelectItem
                      key={category.id}
                      value={category.name}
                      className="text-white hover:bg-gray-700"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                  {!categoriesLoading &&
                    editForm.category &&
                    !categoriesData?.some(
                      (category: Category) =>
                        category.name === editForm.category
                    ) && (
                      <SelectItem
                        key={`custom-${editForm.category}`}
                        value={editForm.category}
                        className="text-white hover:bg-gray-700"
                      >
                        {editForm.category}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            {editError && (
              <p className="text-sm text-red-400" role="alert">
                {editError}
              </p>
            )}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-gray-600 text-gray-200 hover:bg-gray-800"
                onClick={() => handleDialogOpenChange(false)}
                disabled={isSavingEdit}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "저장 중..." : "변경 사항 저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

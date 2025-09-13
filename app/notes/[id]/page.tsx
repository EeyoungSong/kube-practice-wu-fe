"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  BookOpen,
  Star,
  Play,
  Network,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { wordbookService } from "@/services";
import type {
  Wordbook,
  Sentence,
  WordWithSentences,
  SentenceWithWordbook,
} from "@/types/api";
import nlp from "compromise";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function NoteDetailPage({ params }: PageProps) {
  const [activeTab, setActiveTab] = useState("words");
  const [wordbookId, setWordbookId] = useState<string | null>(null);
  const [expandedWords, setExpandedWords] = useState<Set<number>>(new Set());

  const toggleWordExpanded = (wordId: number) => {
    setExpandedWords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  // ✅ params를 await하여 id 추출
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setWordbookId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  const {
    data: wordbook,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["wordbook", wordbookId],
    queryFn: () => wordbookService.getWordbook(Number(wordbookId)),
    enabled: !!wordbookId, // wordbookId가 있을 때만 쿼리 실행
  });

  const getLanguageLabel = (lang: string) => {
    const labels: { [key: string]: string } = {
      english: "English",
      japanese: "日本語",
      korean: "한국어",
      chinese: "中文",
      french: "Français",
      spanish: "Español",
    };
    return labels[lang] || lang;
  };

  const getReviewStatusColor = (isSuccessful: boolean) => {
    return isSuccessful
      ? "bg-green-900 text-green-200 border-green-800"
      : "bg-red-900 text-red-200 border-red-800";
  };

  const getReviewStatusIcon = (isSuccessful: boolean) => {
    return isSuccessful ? CheckCircle : XCircle;
  };

  // 문장에서 특정 단어를 하이라이트하는 함수
  const highlightWordInSentence = (sentence: string, targetWord: string) => {
    if (!sentence || !targetWord) return sentence;

    // compromise를 사용해 원형 추출
    const getRoot = (word: string) => {
      const cleaned = word.toLowerCase().replace(/[^\w]/g, "");

      // 동사의 경우 원형으로 변환
      const verbRoot = nlp(cleaned).verbs().toInfinitive().text();
      if (verbRoot) return verbRoot;

      // 명사의 경우 단수형으로 변환
      const nounRoot = nlp(cleaned).nouns().toSingular().text();
      if (nounRoot) return nounRoot;

      // 형용사의 경우 원급으로 변환
      const adjRoot = nlp(cleaned).adjectives().json()[0]?.root || cleaned;

      return adjRoot;
    };

    const targetRoot = getRoot(targetWord);

    // 단어 단위로 분할하여 비교
    return sentence.split(/(\w+)/).map((part, index) => {
      if (/\w+/.test(part)) {
        const word = part;
        const root = getRoot(word);
        if (root === targetRoot) {
          return (
            <span key={index} className="text-indigo-400 font-bold rounded">
              {word}
            </span>
          );
        }
      }
      return part;
    });
  };

  // wordbookId가 아직 로드되지 않았을 때
  if (!wordbookId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-white mb-2">
                페이지를 로드하는 중...
              </h3>
              <p className="text-gray-400">잠시만 기다려주세요.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-white mb-2">
                단어장을 불러오는 중...
              </h3>
              <p className="text-gray-400">잠시만 기다려주세요.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-red-400 mb-2">
                오류가 발생했습니다
              </h3>
              <p className="text-gray-400 mb-4">단어장을 불러올 수 없습니다.</p>
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  목록으로 돌아가기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!wordbook) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-white mb-2">
                단어장을 찾을 수 없습니다
              </h3>
              <p className="text-gray-400 mb-4">
                요청하신 단어장이 존재하지 않습니다.
              </p>
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  목록으로 돌아가기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const wordbookData = wordbook as Wordbook;
  const totalWords = wordbookData.sentences.reduce(
    (total: number, sentence: Sentence) => total + sentence.words.length,
    0
  );
  const reviewedWords = wordbookData.sentences.filter(
    (sentence: Sentence) => sentence.is_last_review_successful
  ).length;
  const progressPercentage =
    totalWords > 0
      ? Math.round((reviewedWords / wordbookData.sentences.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  목록으로
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {wordbookData.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className="bg-gray-700 text-gray-300 border-gray-600"
                  >
                    {wordbookData.category_name}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-gray-500 text-gray-300"
                  >
                    {wordbookData.language}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/review/${wordbookData.id}`}>
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                  <Play className="w-4 h-4 mr-2" />
                  복습하기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
              <TabsTrigger
                value="words"
                className="flex items-center gap-2 text-white data-[state=active]:bg-gray-700"
              >
                <Star className="w-4 h-4" />
                단어 목록
              </TabsTrigger>
              <TabsTrigger
                value="sentences"
                className="flex items-center gap-2 text-white data-[state=active]:bg-gray-700"
              >
                <BookOpen className="w-4 h-4" />
                문장 목록
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sentences" className="space-y-4">
              {wordbookData.sentences.map((sentence) => {
                const StatusIcon = getReviewStatusIcon(
                  sentence.is_last_review_successful ?? false
                );
                return (
                  <Card
                    key={sentence.id}
                    className="bg-gray-800 border-gray-700"
                  >
                    <CardHeader>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="text-lg font-medium text-white flex-1">
                            {sentence.text}
                          </p>
                        </div>
                        <p className="text-gray-400">{sentence.meaning}</p>
                        {sentence.last_reviewed_at && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            마지막 복습:{" "}
                            {new Date(
                              sentence.last_reviewed_at
                            ).toLocaleDateString("ko-KR")}
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {sentence.words.map((word) => (
                          <Badge
                            key={word.id}
                            variant="outline"
                            className="border-gray-500 text-gray-300 cursor-pointer hover:bg-gray-700"
                            title={word.meaning}
                          >
                            {word.text}
                            {word.others ? ` (${word.others})` : ""}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="words" className="space-y-4">
              {wordbookData.words_with_sentences?.map(
                (wordData: WordWithSentences) => (
                  <Card
                    key={wordData.id}
                    className="bg-gray-800 border-gray-700"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">
                            {wordData.text}
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="space-y-3">
                            {wordData.sentences
                              .filter(
                                (sentence: SentenceWithWordbook) =>
                                  sentence.is_current_wordbook
                              )
                              .map(
                                (
                                  sentence: SentenceWithWordbook,
                                  index: number
                                ) => (
                                  <div
                                    key={sentence.id}
                                    className="text-gray-300 bg-gray-700 p-3 rounded"
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <p className="font-medium mb-1 text-lg">
                                          {highlightWordInSentence(
                                            sentence.text,
                                            wordData.text
                                          )}
                                        </p>
                                        <p className="text-gray-400 italic mb-2 text-sm">
                                          "{sentence.meaning}"
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <Badge
                                            variant="outline"
                                            className="border-gray-500 text-gray-300 text-xs"
                                          >
                                            {sentence.word_meaning_in_context}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>

                                    {sentence.last_reviewed_at && (
                                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                        <Clock className="w-3 h-3" />
                                        마지막 복습:{" "}
                                        {new Date(
                                          sentence.last_reviewed_at
                                        ).toLocaleDateString("ko-KR")}
                                        <span className="mx-2">•</span>
                                        복습 횟수: {sentence.review_count}회
                                        <span className="mx-2">•</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                          </div>
                        </div>

                        {/* 다른 단어장에서의 사용 */}
                        {wordData.sentences.some(
                          (sentence: SentenceWithWordbook) =>
                            !sentence.is_current_wordbook
                        ) && (
                          <div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleWordExpanded(wordData.id)}
                              className="text-gray-400 hover:text-white p-0 h-auto font-normal"
                            >
                              <div className="flex items-center gap-2">
                                {expandedWords.has(wordData.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                                <span>
                                  다른 단어장에서의 사용 (
                                  {
                                    wordData.sentences.filter(
                                      (s: SentenceWithWordbook) =>
                                        !s.is_current_wordbook
                                    ).length
                                  }
                                  개)
                                </span>
                              </div>
                            </Button>

                            {expandedWords.has(wordData.id) && (
                              <div className="space-y-3 mt-3">
                                {wordData.sentences
                                  .filter(
                                    (sentence: SentenceWithWordbook) =>
                                      !sentence.is_current_wordbook
                                  )
                                  .map(
                                    (
                                      sentence: SentenceWithWordbook,
                                      index: number
                                    ) => (
                                      <div
                                        key={sentence.id}
                                        className="text-sm text-gray-300 bg-gray-600 p-3 rounded border-l-2 border-gray-400"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <p className="font-medium mb-1">
                                              {highlightWordInSentence(
                                                sentence.text,
                                                wordData.text
                                              )}
                                            </p>
                                            <p className="text-gray-400 italic mb-2">
                                              "{sentence.meaning}"
                                            </p>
                                            <div className="flex items-center gap-2">
                                              <Badge
                                                variant="outline"
                                                className="border-gray-400 text-gray-300 text-xs"
                                              >
                                                {
                                                  sentence.word_meaning_in_context
                                                }
                                              </Badge>
                                              <Badge
                                                variant="secondary"
                                                className="bg-gray-500 text-gray-200 text-xs"
                                              >
                                                {sentence.wordbook_info?.name}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>

                                        {sentence.last_reviewed_at && (
                                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                                            <Clock className="w-3 h-3" />
                                            마지막 복습:{" "}
                                            {new Date(
                                              sentence.last_reviewed_at
                                            ).toLocaleDateString("ko-KR")}
                                            <span className="mx-2">•</span>
                                            복습 횟수: {sentence.review_count}회
                                            <span className="mx-2">•</span>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

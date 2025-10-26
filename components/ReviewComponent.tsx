"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Check,
  X,
  RotateCcw,
  Star,
  BookOpen,
  Loader2,
  Brain,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { wordbookService } from "@/services";
import { useCategories } from "@/hooks/use-categories";
import type {
  ReviewWord,
  CategoryReviewWord,
  CategoryReviewMeaning,
  ReviewResult,
  ReviewData,
  ReviewSubmission,
} from "@/types/word";
import type { Category } from "@/types/category";

interface ReviewComponentProps {
  // 단일 단어장 복습 시
  wordbookId?: number;
  wordbookName?: string;

  // 카테고리별 복습 시
  categoryId?: number;
  language?: string;

  // 복습할 단어 개수 제한
  wordCount?: number;
}

export default function ReviewComponent({
  wordbookId,
  wordbookName,
  categoryId,
  language = "english",
  wordCount,
}: ReviewComponentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showMeaning, setShowMeaning] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [allWords, setAllWords] = useState<(ReviewWord | CategoryReviewWord)[]>(
    []
  );
  const [reviewWords, setReviewWords] = useState<
    (ReviewWord | CategoryReviewWord)[]
  >([]);
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([]);
  const [unknownWords, setUnknownWords] = useState<
    (ReviewWord | CategoryReviewWord)[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(
    Date.now()
  );
  const [isRetryMode, setIsRetryMode] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);

  const router = useRouter();
  const { data: categoriesData } = useCategories(language);

  // 복습 모드 확인
  const isWordbookReview = wordbookId !== undefined;
  const isCategoryReview = categoryId !== undefined;

  // 타입 가드 함수들
  const isCategoryReviewWord = (
    word: ReviewWord | CategoryReviewWord
  ): word is CategoryReviewWord => {
    return "meanings" in word;
  };

  const isRegularReviewWord = (
    word: ReviewWord | CategoryReviewWord
  ): word is ReviewWord => {
    return "meaning" in word && "context" in word;
  };

  // 현재 단어의 정보를 가져오는 헬퍼 함수들
  const getCurrentWordText = (
    word: ReviewWord | CategoryReviewWord
  ): string => {
    if (isCategoryReviewWord(word)) {
      return word.word;
    }
    return word.word;
  };

  const getCurrentWordMeaning = (
    word: ReviewWord | CategoryReviewWord
  ): string => {
    if (isCategoryReviewWord(word)) {
      return word.meanings.map((m) => m.meaning).join(", ");
    }
    return word.meaning;
  };

  const getCurrentWordContext = (
    word: ReviewWord | CategoryReviewWord
  ): string => {
    if (isCategoryReviewWord(word)) {
      // 첫 번째 의미의 context를 사용하거나, 모든 context를 합칠 수 있음
      return word.meanings[0]?.context || "";
    }
    return word.context;
  };

  const getCurrentWordId = (word: ReviewWord | CategoryReviewWord): string => {
    if (isCategoryReviewWord(word)) {
      // 첫 번째 의미의 ID를 사용
      return word.meanings[0]?.id || "";
    }
    return word.id;
  };

  // 카테고리 정보 설정 (카테고리 복습 시)
  useEffect(() => {
    if (isCategoryReview && categoriesData && categoryId) {
      console.log("categoriesData", categoriesData);
      console.log("categoryId", categoryId);
      const foundCategory = categoriesData.find((cat) => cat.id === categoryId);
      setCategory(foundCategory || null);
    }
  }, [categoriesData, categoryId, isCategoryReview]);

  // 복습 데이터 가져오기
  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let data: ReviewData;

        if (isWordbookReview && wordbookId) {
          // 단일 단어장 복습
          data = await wordbookService.getReviewData(wordbookId);
        } else if (isCategoryReview && categoryId) {
          // 카테고리별 복습
          data = await wordbookService.getAllReviewData(
            language,
            categoryId,
            wordCount || 20
          );
        } else {
          throw new Error("Invalid review configuration");
        }

        if (data.words && data.words.length > 0) {
          let wordsToReview = data.words;

          // wordCount가 지정된 경우 해당 개수만큼만 선택
          if (wordCount && wordCount > 0 && wordCount < data.words.length) {
            // 랜덤하게 섞어서 지정된 개수만큼 선택
            const shuffled = [...data.words].sort(() => Math.random() - 0.5);
            wordsToReview = shuffled.slice(0, wordCount);
          }

          setAllWords(wordsToReview);
          setReviewWords(wordsToReview);
          setQuestionStartTime(Date.now());
        } else {
          setError("복습할 단어가 없습니다.");
        }
      } catch (err) {
        console.error("Failed to fetch review data:", err);
        setError("복습 데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    if ((isWordbookReview && wordbookId) || (isCategoryReview && categoryId)) {
      fetchReviewData();
    }
  }, [
    wordbookId,
    categoryId,
    language,
    wordCount,
    isWordbookReview,
    isCategoryReview,
  ]);

  const handleAnswer = (isKnown: boolean) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(isKnown);
    setShowMeaning(true);

    const currentWord = reviewWords[currentIndex];
    const result: ReviewResult = {
      word_id: getCurrentWordId(currentWord),
      is_known: isKnown,
    };

    setReviewResults((prev) => [...prev, result]);

    if (isKnown) {
      setKnownCount((prev) => prev + 1);
    } else {
      setUnknownWords((prev) => [...prev, currentWord]);
    }
  };

  const handleNext = () => {
    if (currentIndex < reviewWords.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowMeaning(false);
      setShowContext(false);
      setQuestionStartTime(Date.now());
    } else {
      // 복습 완료
      setReviewComplete(true);
    }
  };

  const handleRetry = () => {
    if (unknownWords.length > 0) {
      setReviewWords(unknownWords);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowMeaning(false);
      setShowContext(false);
      setReviewResults([]);
      setUnknownWords([]);
      setKnownCount(0);
      setReviewComplete(false);
      setIsRetryMode(true);
      setQuestionStartTime(Date.now());
    }
  };

  const handleSubmitReview = async () => {
    if (!isWordbookReview || !wordbookId) return;

    try {
      setIsSubmitting(true);
      const submissionData: ReviewSubmission = {
        wordbook_id: wordbookId,
        results: reviewResults,
      };
      await wordbookService.submitReview(submissionData);
      router.push("/");
    } catch (err) {
      console.error("Failed to submit review:", err);
      setError("복습 결과 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (isWordbookReview) {
      handleSubmitReview();
    } else {
      router.push("/");
    }
  };

  // 제목 결정
  const getTitle = () => {
    const baseTitle = isWordbookReview
      ? wordbookName || "단어장 복습"
      : isCategoryReview
      ? `${category?.name || "카테고리"} 복습`
      : "복습";

    const countInfo =
      wordCount && allWords.length > 0
        ? ` (${Math.min(wordCount, allWords.length)}개)`
        : "";

    return baseTitle + countInfo;
  };

  // 완료 메시지 결정
  const getCompletionMessage = () => {
    if (isWordbookReview) {
      return isRetryMode
        ? "재복습을 완료했습니다!"
        : "단어장 복습을 완료했습니다!";
    } else if (isCategoryReview) {
      return isRetryMode
        ? "재복습을 완료했습니다!"
        : `${category?.name} 카테고리 복습을 완료했습니다!`;
    }
    return "복습을 완료했습니다!";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-medium text-white mb-2">
            복습 데이터를 불러오는 중...
          </h3>
          <p className="text-gray-400">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-red-400">오류 발생</CardTitle>
            <CardDescription className="text-gray-300">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button className="bg-primary hover:bg-primary-hover text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                홈으로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (reviewComplete) {
    const totalWords = allWords.length;
    const score = Math.round((knownCount / totalWords) * 100);

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white mb-2">
              복습 완료!
            </CardTitle>
            <CardDescription className="text-gray-300">
              {getCompletionMessage()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">
                {score}점
              </div>
              <div className="text-gray-400">
                {knownCount}/{totalWords} 단어를 알고 있습니다
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {knownCount}
                </div>
                <div className="text-sm text-gray-400">알고 있는 단어</div>
              </div>
              <div className="text-center p-4 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {totalWords - knownCount}
                </div>
                <div className="text-sm text-gray-400">모르는 단어</div>
              </div>
            </div>

            {unknownWords.length > 0 && !isRetryMode && (
              <div className="text-center">
                <p className="text-gray-400 mb-4">
                  모르는 단어 {unknownWords.length}개를 다시 복습하시겠습니까?
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={handleRetry}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    모르는 단어 재복습
                  </Button>
                  <Button
                    onClick={handleFinish}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      "완료"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {(unknownWords.length === 0 || isRetryMode) && (
              <div className="text-center">
                <Button
                  onClick={handleFinish}
                  className="bg-primary hover:bg-primary-hover text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      복습 완료
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentWord = reviewWords[currentIndex];
  const progress = ((currentIndex + 1) / reviewWords.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                홈으로
              </Button>
            </Link>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-white">{getTitle()}</h1>
              <p className="text-sm text-gray-400">
                {currentIndex + 1} / {reviewWords.length}
                {isRetryMode && " (재복습)"}
              </p>
            </div>
            <div className="w-16"></div>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">진행률</span>
              <span className="text-sm text-gray-400">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2 bg-gray-700" />
          </div>

          {/* Review Card */}
          <Card className="bg-gray-800 border-gray-800 mb-8">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary" />
                <span className="text-sm text-gray-400">
                  이 단어를 알고 있나요?
                </span>
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {/* Word */}
              <div className="space-y-2">
                <h2 className="text-4xl font-bold text-white">
                  {getCurrentWordText(currentWord)}
                </h2>
                {!showMeaning && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowContext(!showContext)}
                    className="text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    {showContext ? "문장 숨기기" : "문장 보기"}
                  </Button>
                )}
                {showContext && !showMeaning && (
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {getCurrentWordContext(currentWord)}
                    </p>
                  </div>
                )}
              </div>

              {/* Meaning (shown after answer) */}
              {showMeaning && (
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-400">정답</span>
                  </div>
                  <p className="text-xl text-white mb-3">
                    {getCurrentWordMeaning(currentWord)}
                  </p>
                  {/* Context is always shown after answer */}
                  <div className="border-t border-gray-600 pt-3">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {getCurrentWordContext(currentWord)}
                    </p>
                  </div>
                </div>
              )}

              {/* Answer Buttons */}
              {!showMeaning && (
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => handleAnswer(true)}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                    disabled={selectedAnswer !== null}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    알고 있어요
                  </Button>
                  <Button
                    onClick={() => handleAnswer(false)}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
                    disabled={selectedAnswer !== null}
                  >
                    <X className="w-5 h-5 mr-2" />
                    모르겠어요
                  </Button>
                </div>
              )}

              {/* Next Button */}
              {showMeaning && (
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="bg-primary hover:bg-primary-hover text-white px-8 py-3"
                >
                  {currentIndex < reviewWords.length - 1
                    ? "다음 단어"
                    : "복습 완료"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

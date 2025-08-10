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
import { wordbookService } from "@/services";
import type { ReviewWord, ReviewResult, ReviewData } from "@/types/api";

export default function ReviewPage({ params }: { params: { id: string } }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null); // true: 알고 있음, false: 모름
  const [showMeaning, setShowMeaning] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [allWords, setAllWords] = useState<ReviewWord[]>([]); // 전체 단어
  const [reviewWords, setReviewWords] = useState<ReviewWord[]>([]); // 현재 복습 중인 단어
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([]);
  const [unknownWords, setUnknownWords] = useState<ReviewWord[]>([]); // 모르는 단어들
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(
    Date.now()
  );
  const [isRetryMode, setIsRetryMode] = useState(false); // 재복습 모드 여부

  // 복습 데이터 가져오기
  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        setIsLoading(true);
        const data: ReviewData = await wordbookService.getReviewData(
          parseInt(params.id)
        );
        setAllWords(data.words);
        setReviewWords(data.words);
        setQuestionStartTime(Date.now());
      } catch (err) {
        console.error("Failed to fetch review data:", err);
        setError("복습 데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewData();
  }, [params.id]);

  const currentWord = reviewWords[currentIndex];
  const progress = ((currentIndex + 1) / reviewWords.length) * 100;

  const handleAnswerSelect = (isKnown: boolean) => {
    setSelectedAnswer(isKnown);
    if (!isKnown) {
      // 모른다고 선택하면 바로 뜻을 보여줌
      setShowMeaning(true);
    }
  };

  const handleShowMeaning = () => {
    setShowMeaning(true);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;

    const isKnown = selectedAnswer;

    // 결과 저장
    const result: ReviewResult = {
      word_id: currentWord.id,
      is_known: isKnown,
    };

    setReviewResults((prev) => [...prev, result]);

    if (isKnown) {
      setKnownCount((prev) => prev + 1);
    } else {
      // 모르는 단어는 따로 저장
      setUnknownWords((prev) => [...prev, currentWord]);
    }

    // 다음 단어로 이동
    if (currentIndex < reviewWords.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowMeaning(false);
      setQuestionStartTime(Date.now());
    } else {
      // 복습 완료
      submitReviewResults();
    }
  };

  const submitReviewResults = async () => {
    try {
      setIsSubmitting(true);
      await wordbookService.submitReview({
        wordbook_id: parseInt(params.id),
        results: reviewResults,
      });
      setReviewComplete(true);
    } catch (err) {
      console.error("Failed to submit review:", err);
      // 제출 실패해도 복습 완료 화면은 보여줌
      setReviewComplete(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryUnknownWords = () => {
    if (unknownWords.length === 0) {
      alert("복습할 단어가 없습니다!");
      return;
    }

    // 모르는 단어들만으로 새로운 복습 시작
    setReviewWords(unknownWords);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowMeaning(false);
    setKnownCount(0);
    setReviewComplete(false);
    setReviewResults([]);
    setUnknownWords([]);
    setQuestionStartTime(Date.now());
    setIsRetryMode(true);
  };

  const handleRestartAll = () => {
    // 전체 단어로 새로운 복습 시작
    setReviewWords(allWords);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowMeaning(false);
    setKnownCount(0);
    setReviewComplete(false);
    setReviewResults([]);
    setUnknownWords([]);
    setQuestionStartTime(Date.now());
    setIsRetryMode(false);
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto" />
              <h3 className="text-lg font-medium text-white">
                복습 데이터 로딩 중...
              </h3>
              <p className="text-gray-400">잠시만 기다려주세요.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-900 rounded-full flex items-center justify-center mx-auto">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-white">오류 발생</h3>
              <p className="text-gray-400">{error}</p>
              <Link href={`/notes/${params.id}`}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  노트로 돌아가기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 복습 단어가 없는 경우
  if (reviewWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <BookOpen className="w-12 h-12 text-gray-500 mx-auto" />
              <h3 className="text-lg font-medium text-white">
                복습할 단어가 없습니다
              </h3>
              <p className="text-gray-400">먼저 단어를 학습해주세요.</p>
              <Link href={`/notes/${params.id}`}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  노트로 돌아가기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (reviewComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl text-white">
              {isRetryMode ? "재복습 완료!" : "복습 완료!"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isRetryMode
                ? "모르는 단어 복습을 마쳤습니다"
                : "오늘의 복습을 모두 마쳤습니다"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">
                {knownCount}/{reviewWords.length}
              </div>
              <p className="text-gray-400">
                알고 있는 단어:{" "}
                {Math.round((knownCount / reviewWords.length) * 100)}%
              </p>
              {!isRetryMode && unknownWords.length > 0 && (
                <p className="text-red-400 mt-2">
                  모르는 단어: {unknownWords.length}개
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Link href={`/notes/${params.id}`}>
                <Button
                  className="w-full bg-transparent border-gray-600 text-white hover:bg-gray-700"
                  variant="outline"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  노트로 돌아가기
                </Button>
              </Link>

              {!isRetryMode && unknownWords.length > 0 && (
                <Button
                  onClick={handleRetryUnknownWords}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white"
                  disabled={isSubmitting}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  모르는 단어만 다시 복습 ({unknownWords.length}개)
                </Button>
              )}

              <Button
                onClick={handleRestartAll}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                disabled={isSubmitting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                전체 단어 다시 복습하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/notes/${params.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                노트로 돌아가기
              </Button>
            </Link>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">
                {isRetryMode ? "모르는 단어 재복습" : "단어 복습"}
              </h1>
              <p className="text-sm text-gray-400">
                {currentIndex + 1} / {reviewWords.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">알고 있는 단어</p>
              <p className="text-lg font-bold text-indigo-400">
                {knownCount}/{reviewWords.length}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="h-2 bg-gray-700" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-gray-700 bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="bg-gray-700 text-gray-300 border-gray-600"
                >
                  {currentIndex + 1} / {reviewWords.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Context */}
              <div className="p-4 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">문맥:</p>
                <p className="text-white italic">"{currentWord.context}"</p>
              </div>

              {/* Question */}
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-6">
                  {currentWord.word}
                </h2>
                <p className="text-lg text-gray-400 mb-4">
                  이 단어의 뜻을 알고 있나요?
                </p>
              </div>

              {/* Self Assessment Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={selectedAnswer === true ? "default" : "outline"}
                  className={`h-20 text-lg ${
                    selectedAnswer === true
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                  }`}
                  onClick={() => handleAnswerSelect(true)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Check className="w-6 h-6" />
                    <span>알고 있음</span>
                  </div>
                </Button>

                <Button
                  variant={selectedAnswer === false ? "default" : "outline"}
                  className={`h-20 text-lg ${
                    selectedAnswer === false
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                  }`}
                  onClick={() => handleAnswerSelect(false)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <X className="w-6 h-6" />
                    <span>모름</span>
                  </div>
                </Button>
              </div>

              {/* Show Meaning Button */}
              {selectedAnswer === true && !showMeaning && (
                <div className="text-center">
                  <Button
                    onClick={handleShowMeaning}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 mr-2" />뜻 확인하기
                  </Button>
                </div>
              )}

              {/* Meaning Display */}
              {showMeaning && (
                <div className="p-4 bg-blue-900/30 border border-blue-500 rounded-lg text-center">
                  <p className="text-blue-300 font-medium text-lg">
                    {currentWord.meaning}
                  </p>
                </div>
              )}

              {/* Next Button */}
              {selectedAnswer !== null &&
                (selectedAnswer === false || showMeaning) && (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleNext}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                      size="lg"
                    >
                      {currentIndex < reviewWords.length - 1
                        ? "다음 단어"
                        : "복습 완료"}
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

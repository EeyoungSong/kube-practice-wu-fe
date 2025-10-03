"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ArrowLeft, Type } from "lucide-react";
import Link from "next/link";
import { extractionService, APIError } from "@/services";

interface Word {
  id: string;
  word: string;
  meaning: string;
  partOfSpeech: string;
  isSelected: boolean;
  isKnown?: boolean;
}

interface AnalyzedSentence {
  id: string;
  original: string;
  translation: string;
  words: Word[];
}

export default function TextAnalyzePage() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [sentences, setSentences] = useState<string[]>([]);
  const [selectedSentences, setSelectedSentences] = useState<Set<number>>(
    new Set()
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedSentences, setAnalyzedSentences] = useState<
    AnalyzedSentence[]
  >([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string>("");

  // 텍스트를 문장으로 분리하는 함수
  const splitIntoSentences = (text: string): string[] => {
    // 문장 종료 부호로 분리하되, 빈 문장은 제거
    const sentenceEnders = /[.!?;:。！？；：]\s*/;
    return text
      .split(sentenceEnders)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  // 텍스트 입력 처리
  const handleTextChange = (text: string) => {
    setInputText(text);
    if (text.trim()) {
      const splitSentences = splitIntoSentences(text);
      setSentences(splitSentences);
    } else {
      setSentences([]);
      setSelectedSentences(new Set());
    }
  };

  // 문장 선택 토글
  const toggleSentenceSelection = (index: number) => {
    const newSelected = new Set(selectedSentences);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSentences(newSelected);
  };

  // 전체 선택/해제
  const selectAllSentences = () => {
    setSelectedSentences(new Set(sentences.map((_, index) => index)));
  };

  const clearSelection = () => {
    setSelectedSentences(new Set());
  };

  // AI 분석 수행
  const performAIAnalysis = async () => {
    if (selectedSentences.size === 0) return;

    setIsAnalyzing(true);
    setError("");

    try {
      const selectedSentenceTexts = Array.from(selectedSentences).map(
        (index) => sentences[index]
      );

      const result = await extractionService.analyzeSentences(
        selectedSentenceTexts,
        "ko" // TODO: Add language selection in UI
      );

      // API 응답을 컴포넌트 형식에 맞게 변환
      const analyzedSentences: AnalyzedSentence[] = result.selected.map(
        (item: any, index: number) => ({
          id: `sentence-${index}`,
          original: item.text,
          translation: item.meaning,
          words: item.words.map((word: any, wordIndex: number) => ({
            id: `word-${index}-${wordIndex}`,
            word: word.text,
            meaning: word.meaning,
            partOfSpeech: "단어", // API에서 품사 정보가 없으므로 기본값
            isSelected: false,
            isKnown: false,
          })),
        })
      );

      setAnalyzedSentences(analyzedSentences);
      setAnalysisComplete(true);
    } catch (error) {
      console.error("AI 분석 중 오류:", error);
      if (error instanceof APIError) {
        setError(error.message);
      } else {
        setError("AI 분석 중 오류가 발생했습니다.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 분석된 단어 선택 토글
  const toggleAnalyzedWordSelection = (sentenceId: string, wordId: string) => {
    setAnalyzedSentences((prev) =>
      prev.map((sentence) =>
        sentence.id === sentenceId
          ? {
              ...sentence,
              words: sentence.words.map((word) =>
                word.id === wordId
                  ? { ...word, isSelected: !word.isSelected }
                  : word
              ),
            }
          : sentence
      )
    );
  };

  // 선택된 단어 수 계산
  const getSelectedWordsCount = () => {
    return analyzedSentences.reduce(
      (total, sentence) =>
        total + sentence.words.filter((word) => word.isSelected).length,
      0
    );
  };

  // 단어장에 저장
  const handleSaveToNote = async () => {
    const sentencesWithSelectedWords = analyzedSentences
      .map((sentence) => ({
        ...sentence,
        words: sentence.words.filter((word) => word.isSelected),
      }))
      .filter((sentence) => sentence.words.length > 0);

    if (sentencesWithSelectedWords.length === 0) {
      alert("저장할 단어를 선택해주세요.");
      return;
    }

    // 여기에 실제 저장 로직 구현
    console.log("저장할 데이터:", sentencesWithSelectedWords);
    alert(`${getSelectedWordsCount()}개 단어가 단어장에 저장되었습니다!`);
  };

  // 다시 시작
  const handleReset = () => {
    setInputText("");
    setSentences([]);
    setSelectedSentences(new Set());
    setAnalyzedSentences([]);
    setAnalysisComplete(false);
    setError("");
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                AI가 문장을 분석하고 있습니다
              </h3>
              <p className="text-sm text-gray-400">
                핵심 단어를 추출하고 의미를 분석하고 있어요...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <div className="text-red-400 mb-4">
                <X className="w-8 h-8 mx-auto mb-2" />
                <h3 className="text-lg font-semibold mb-2">
                  오류가 발생했습니다
                </h3>
                <p className="text-sm">{error}</p>
              </div>
              <Button
                onClick={handleReset}
                variant="outline"
                className="bg-gray-700 border-gray-600 text-white"
              >
                다시 시도
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (analysisComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 헤더 */}
            <div className="flex items-center gap-4 mb-6">
              <Link href="/add">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  돌아가기
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-white">AI 분석 결과</h1>
            </div>

            {/* 결과 요약 */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">분석 완료</CardTitle>
                <p className="text-sm text-gray-400 mt-2">
                  학습하고 싶은 단어를 선택하세요. 이미 알고 있는 단어는 건너뛸
                  수 있습니다.
                </p>
                <Badge
                  variant="secondary"
                  className="bg-indigo-900 text-indigo-200 border-indigo-800 w-fit"
                >
                  {getSelectedWordsCount()}개 단어 선택됨
                </Badge>
              </CardHeader>
            </Card>

            {/* 분석된 문장들 */}
            <div className="space-y-6">
              {analyzedSentences.map((sentence) => (
                <Card
                  key={sentence.id}
                  className="border-2 border-gray-700 bg-gray-800 hover:border-indigo-500 transition-colors"
                >
                  <CardHeader>
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-white">
                        {sentence.original}
                      </p>
                      <p className="text-gray-400">{sentence.translation}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <h4 className="font-medium text-white flex items-center gap-2">
                        추출된 단어들
                      </h4>
                      <div className="grid gap-3">
                        {sentence.words.map((word) => (
                          <div
                            key={word.id}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              word.isSelected
                                ? "border-indigo-500 bg-indigo-900/30"
                                : "border-gray-600 hover:border-indigo-400 bg-gray-700/50"
                            }`}
                            onClick={() =>
                              toggleAnalyzedWordSelection(sentence.id, word.id)
                            }
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-white">
                                    {word.word}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-gray-500 text-gray-300"
                                  >
                                    {word.partOfSpeech}
                                  </Badge>
                                  {word.isKnown && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs bg-green-900 text-green-300 border-green-800"
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      학습됨
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-400">{word.meaning}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveToNote}
                disabled={getSelectedWordsCount() === 0}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                단어장에 저장하기 ({getSelectedWordsCount()}개 단어)
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                다시 시작
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 헤더 */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/add">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                돌아가기
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">텍스트 분석</h1>
          </div>

          {/* 텍스트 입력 영역 */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Type className="w-5 h-5" />
                텍스트를 입력하세요
              </CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                학습하고 싶은 문장들을 입력하세요. 문장 부호로 자동 분리됩니다.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="여기에 텍스트를 입력하세요. 여러 문장을 입력할 수 있습니다..."
                value={inputText}
                onChange={(e) => handleTextChange(e.target.value)}
                className="min-h-[200px] bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 resize-none"
              />
            </CardContent>
          </Card>

          {/* 문장 선택 영역 */}
          {sentences.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">문장 선택</CardTitle>
                <div className="flex items-center gap-2 mt-4">
                  <Badge
                    variant="secondary"
                    className="bg-indigo-900 text-indigo-200"
                  >
                    {selectedSentences.size}개 선택됨
                  </Badge>
                  <Button
                    size="sm"
                    onClick={selectAllSentences}
                    variant="outline"
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    전체 선택
                  </Button>
                  <Button
                    size="sm"
                    onClick={clearSelection}
                    variant="outline"
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    선택 해제
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sentences.map((sentence, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSentences.has(index)
                          ? "border-indigo-500 bg-indigo-900/30"
                          : "border-gray-600 hover:border-indigo-400 bg-gray-700/50"
                      }`}
                      onClick={() => toggleSentenceSelection(index)}
                    >
                      <p className="text-white">{sentence}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 분석 버튼 */}
          {selectedSentences.size > 0 && (
            <div className="flex gap-3">
              <Button
                onClick={performAIAnalysis}
                className="flex-1 bg-indigo-700 hover:bg-indigo-600 text-white"
              >
                선택된 문장 AI 분석하기 ({selectedSentences.size}개 문장)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

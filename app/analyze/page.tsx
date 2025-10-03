"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Star,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
} from "lucide-react";
import Link from "next/link";
import { analyzeSentences, wordService, wordbookService } from "@/services";
import { useLanguage } from "@/hooks/use-language";
import type { SaveWordbookRequest } from "@/types/word";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnalysisWord {
  id: string;
  original: string;
  word: string;
  meaning: string;
  others: string;
  pos: string;
  isSelected: boolean;
  isKnown?: boolean;
  previousContexts?: string[];
}

interface AnalysisSentence {
  id: string;
  original: string;
  translation?: string;
  words: AnalysisWord[];
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  isTranslationVisible?: boolean; // 번역 표시 상태 추가
}

interface SelectedWordInfo {
  sentenceId: string;
  wordId: string;
  word: AnalysisWord;
}

// 인터페이스 추가
interface WordContext {
  word: {
    id: number;
    text: string;
    last_reviewed_at: string;
    review_count: number;
    is_last_review_successful: boolean;
  };
  sentences: Array<{
    sentence: {
      id: number;
      text: string;
      meaning: string;
      words: Array<{
        id: number;
        text: string;
        meaning: string;
        others: string;
      }>;
      last_reviewed_at: string;
      review_count: number;
      is_last_review_successful: boolean;
    };
    meaning: string;
  }>;
}

export default function AnalyzePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 전역 언어 상태 (기본값으로 사용)
  const { selectedLanguage: globalLanguage } = useLanguage();

  // 새로운 방식: sessionStorage에서 데이터 읽기
  const analysisId = searchParams.get("id");

  // useMemo를 사용해서 분석 데이터를 메모이제이션
  const analysisData = useMemo(() => {
    if (analysisId && typeof window !== "undefined") {
      // 새로운 방식: sessionStorage에서 읽기 (클라이언트 환경에서만 허용)
      const storedData = window.sessionStorage?.getItem(
        `analysis_${analysisId}`
      );
      if (storedData) {
        const data = JSON.parse(storedData);
        return {
          language: data.lang,
          inputType: data.type,
          noteName: data.name,
          category: data.category,
          sentences: data.sentences,
          analyzedSentences: data.analyzedSentences || [], // 분석된 문장들 추가
        };
      }
    }

    // 기존 방식: URL 파라미터에서 읽기 (하위 호환성)
    const lang = searchParams.get("lang") || globalLanguage || "en";
    // "all"인 경우 기본 언어로 변환
    const actualLanguage = lang === "all" ? "en" : lang;

    return {
      language: actualLanguage,
      inputType: searchParams.get("type") || "text",
      noteName: searchParams.get("name") || "",
      category: searchParams.get("category") || "일반",
      sentences: searchParams.get("sentences")?.split(" | ") || [],
      analyzedSentences: [], // 기본값
    };
  }, [analysisId, searchParams]);

  const {
    language,
    inputType,
    noteName,
    category,
    sentences: inputSentences,
    analyzedSentences,
  } = analysisData;

  const [sentences, setSentences] = useState<AnalysisSentence[]>([]);
  const [selectedWordInfo, setSelectedWordInfo] =
    useState<SelectedWordInfo | null>(null);
  const [wordContext, setWordContext] = useState<WordContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isEditingWord, setIsEditingWord] = useState(false);
  const [editingWordValues, setEditingWordValues] = useState({
    meaning: "",
    others: "",
  });

  useEffect(() => {
    const fetchWordContext = async () => {
      if (selectedWordInfo) {
        setIsLoadingContext(true);
        try {
          const context = await wordService.getWordHistoryByWord(
            selectedWordInfo.word.word
          );
          setWordContext(context as unknown as WordContext);
        } catch (error) {
          console.error("단어 과거 맥락 가져오기 실패:", error);
          setWordContext(null);
        } finally {
          setIsLoadingContext(false);
        }
      }
    };
    fetchWordContext();
  }, [selectedWordInfo?.word?.word]);

  // 처음 로드 시 문장들을 초기화 (저장된 분석 결과가 있으면 복원)
  useEffect(() => {
    if (inputSentences && inputSentences.length > 0) {
      const initialSentences: AnalysisSentence[] = inputSentences.map(
        (sentence: string, index: number) => {
          const sentenceId = `sentence_${index}`;

          // 저장된 분석 결과에서 해당 문장 찾기
          const savedSentence = analyzedSentences.find(
            (s: AnalysisSentence) =>
              s.id === sentenceId && s.original === sentence
          );

          if (savedSentence) {
            // 저장된 분석 결과가 있으면 복원
            return {
              ...savedSentence,
              isAnalyzing: false, // 로딩 상태는 항상 false로 초기화
            };
          } else {
            // 저장된 결과가 없으면 기본 상태로 초기화
            return {
              id: sentenceId,
              original: sentence,
              translation: undefined,
              words: [],
              isAnalyzed: false,
              isAnalyzing: false,
              isTranslationVisible: false, // 기본적으로 숨김
            };
          }
        }
      );
      setSentences(initialSentences);
    }
  }, [inputSentences, analyzedSentences]);

  useEffect(() => {
    console.log(sentences);
    console.log(selectedWordInfo);
  }, [sentences, selectedWordInfo]);

  // 선택된 단어 정보를 sentences 상태와 동기화
  useEffect(() => {
    if (selectedWordInfo) {
      const sentence = sentences.find(
        (s) => s.id === selectedWordInfo.sentenceId
      );
      const word = sentence?.words.find(
        (w) => w.id === selectedWordInfo.wordId
      );
      if (word) {
        setSelectedWordInfo((prev) => (prev ? { ...prev, word } : null));
        if (!isEditingWord) {
          setEditingWordValues({
            meaning: word.meaning,
            others: word.others,
          });
        }
      }
    }
  }, [
    sentences,
    selectedWordInfo?.sentenceId,
    selectedWordInfo?.wordId,
    isEditingWord,
  ]);

  useEffect(() => {
    if (selectedWordInfo) {
      // 편집 중이 아닐 때만 값을 업데이트
      if (!isEditingWord) {
        setEditingWordValues({
          meaning: selectedWordInfo.word.meaning,
          others: selectedWordInfo.word.others,
        });
      }
    } else {
      setIsEditingWord(false);
      setEditingWordValues({ meaning: "", others: "" });
    }
  }, [selectedWordInfo, isEditingWord]);

  // sessionStorage에 분석 결과 저장하는 함수
  const saveAnalysisToSession = (updatedSentences: AnalysisSentence[]) => {
    if (analysisId && typeof window !== "undefined") {
      const currentData = window.sessionStorage?.getItem(
        `analysis_${analysisId}`
      );
      if (currentData) {
        const data = JSON.parse(currentData);
        // 분석된 문장들을 저장
        data.analyzedSentences = updatedSentences.filter((s) => s.isAnalyzed);
        window.sessionStorage?.setItem(
          `analysis_${analysisId}`,
          JSON.stringify(data)
        );
      }
    }
  };

  // 개별 문장 분석 함수
  const analyzeSingleSentence = async (sentenceId: string) => {
    const sentenceToAnalyze = sentences.find((s) => s.id === sentenceId);
    if (!sentenceToAnalyze) return;

    // 해당 문장의 분석 상태를 true로 설정
    setSentences((prev) =>
      prev.map((sentence) =>
        sentence.id === sentenceId
          ? { ...sentence, isAnalyzing: true }
          : sentence
      )
    );

    try {
      console.log("문장 분석 시작:", {
        sentence: sentenceToAnalyze.original,
        language,
      });
      const response = await analyzeSentences(
        [sentenceToAnalyze.original],
        language
      );
      console.log("문장 분석 완료:", response);

      if (response.selected && response.selected.length > 0) {
        const analyzedData = response.selected[0];

        const analyzedWords: AnalysisWord[] = analyzedData.words.map(
          (word, wordIndex) => ({
            id: `word_${sentenceId}_${wordIndex}`,
            original: word.original_text,
            word: word.text,
            meaning: word.meaning,
            others: word.others,
            pos: word.pos,
            isSelected: false,
          })
        );

        // 분석 결과로 문장 업데이트
        setSentences((prev) => {
          const updatedSentences = prev.map((sentence) =>
            sentence.id === sentenceId
              ? {
                  ...sentence,
                  translation: analyzedData.meaning,
                  words: analyzedWords,
                  isAnalyzed: true,
                  isAnalyzing: false,
                  isTranslationVisible: false, // 기본적으로 숨김
                }
              : sentence
          );

          // sessionStorage에 저장
          saveAnalysisToSession(updatedSentences);

          return updatedSentences;
        });
      }
    } catch (error) {
      console.error("문장 분석 중 오류:", error);
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      alert(`문장 분석에 실패했습니다: ${errorMessage}`);

      // 분석 실패 시 상태 복원
      setSentences((prev) =>
        prev.map((sentence) =>
          sentence.id === sentenceId
            ? { ...sentence, isAnalyzing: false }
            : sentence
        )
      );
    }
  };

  // 토글 함수 추가 (analyzeSingleSentence 함수 근처에)
  const toggleTranslation = (sentenceId: string) => {
    setSentences((prev) => {
      const updatedSentences = prev.map((sentence) =>
        sentence.id === sentenceId
          ? {
              ...sentence,
              isTranslationVisible: !sentence.isTranslationVisible,
            }
          : sentence
      );

      // sessionStorage에 저장
      saveAnalysisToSession(updatedSentences);

      return updatedSentences;
    });
  };

  const toggleWordSelection = (sentenceId: string, wordId: string) => {
    console.log("toggleWordSelection", sentenceId, wordId);
    setSentences((prev) => {
      const updatedSentences = prev.map((sentence) =>
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
      );

      // sessionStorage에 저장
      saveAnalysisToSession(updatedSentences);

      return updatedSentences;
    });
  };

  const startWordEditing = () => {
    if (!selectedWordInfo) return;
    setEditingWordValues({
      meaning: selectedWordInfo.word.meaning,
      others: selectedWordInfo.word.others,
    });
    setIsEditingWord(true);
  };

  const handleWordFieldChange = (
    field: "meaning" | "others",
    value: string
  ) => {
    console.log("handleWordFieldChange", field, value);
    setEditingWordValues((prev) => ({ ...prev, [field]: value }));
  };

  const cancelWordEditing = () => {
    if (!selectedWordInfo) {
      setIsEditingWord(false);
      return;
    }
    setEditingWordValues({
      meaning: selectedWordInfo.word.meaning,
      others: selectedWordInfo.word.others,
    });
    setIsEditingWord(false);
  };

  const saveEditedWord = () => {
    if (!selectedWordInfo) return;

    console.log("saveEditedWord", editingWordValues);

    setSentences((prev) => {
      const updatedSentences = prev.map((sentence) =>
        sentence.id === selectedWordInfo.sentenceId
          ? {
              ...sentence,
              words: sentence.words.map((word) =>
                word.id === selectedWordInfo.wordId
                  ? {
                      ...word,
                      meaning: editingWordValues.meaning,
                      others: editingWordValues.others,
                    }
                  : word
              ),
            }
          : sentence
      );

      // sessionStorage에 저장
      saveAnalysisToSession(updatedSentences);

      return updatedSentences;
    });

    setIsEditingWord(false);
  };

  const handleWordClick = (sentenceId: string, wordId: string) => {
    const sentence = sentences.find((s) => s.id === sentenceId);
    if (!sentence || !sentence.isAnalyzed) return;

    const word = sentence.words.find((w) => w.id === wordId);

    if (word) {
      console.log("찾은 단어:", word);
      setSelectedWordInfo({
        sentenceId,
        wordId: word.id,
        word,
      });
      // 클릭 시 바로 선택/해제
      toggleWordSelection(sentenceId, wordId);
    } else {
      console.log("단어를 찾지 못함:", wordId);
    }
  };

  // 문장을 단어별로 분할하고 클릭 가능하게 만드는 함수
  const renderClickableWords = (sentence: AnalysisSentence) => {
    if (!sentence.isAnalyzed) {
      return <span className="break-words">{sentence.original}</span>;
    }

    const words = sentence.words;
    return (
      <span className="inline-flex flex-wrap gap-1">
        {words.map((word, index) => {
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <span
                  className={`cursor-pointer rounded transition-colors break-words ${
                    word.isSelected
                      ? "bg-indigo-900/50 text-indigo-300 hover:bg-indigo-900/70"
                      : "hover:bg-indigo-900/30 hover:text-indigo-300"
                  }`}
                  onClick={() => handleWordClick(sentence.id, word.id)}
                >
                  {word.original}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs bg-gray-800">
                <div className="space-y-1">
                  <p className="text-sm">{word.meaning}</p>
                  <p className="text-xs text-gray-400">{word.others}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
    );
  };

  const getSelectedWordsCount = () => {
    return sentences
      .filter((sentence) => sentence.isAnalyzed)
      .reduce(
        (total, sentence) =>
          total + sentence.words.filter((word) => word.isSelected).length,
        0
      );
  };

  const getAnalyzedSentencesCount = () => {
    return sentences.filter((sentence) => sentence.isAnalyzed).length;
  };

  const saveSelectedWords = async () => {
    // 분석된 문장들 중에서 선택된 단어가 있는 문장들만 필터링
    const analyzedSentences = sentences.filter(
      (sentence) => sentence.isAnalyzed
    );
    const selectedWords = analyzedSentences.flatMap((sentence) =>
      sentence.words.filter((word) => word.isSelected)
    );

    const sentencesWithSelectedWords = analyzedSentences.filter((sentence) =>
      sentence.words.some((word) => word.isSelected)
    );

    if (sentencesWithSelectedWords.length === 0) {
      alert(
        "선택된 단어가 없습니다. 먼저 문장을 분석하고 단어를 선택해주세요."
      );
      return;
    }

    const saveData: SaveWordbookRequest = {
      name: noteName,
      category: category,
      language: language,
      input_type: inputType,
      sentences: sentencesWithSelectedWords.map((sentence) => ({
        text: sentence.original,
        meaning: sentence.translation || "",
        words: sentence.words
          .filter((word) => word.isSelected)
          .map((word) => ({
            text: word.word,
            meaning: word.meaning,
            others: word.others,
          })),
      })),
    };

    await wordbookService.saveWordbook(saveData);

    alert(`${selectedWords.length}개의 단어가 단어장에 저장되었습니다!`);

    // 홈페이지로 이동하면서 새로고침
    window.location.href = "/";
  };

  return (
    <TooltipProvider delayDuration={200}>
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
                    돌아가기
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-white">{noteName}</h1>
                  <p className="text-sm text-gray-400">
                    {category} • {language.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant="secondary"
                  className="bg-blue-900 text-blue-200 border-blue-800"
                >
                  {getAnalyzedSentencesCount()}/{sentences.length}개 문장 분석됨
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-indigo-900 text-indigo-200 border-indigo-800"
                >
                  {getSelectedWordsCount()}개 단어 선택됨
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 문장 목록 */}
              <div className="lg:col-span-2 space-y-6">
                {sentences.map((sentence) => (
                  <div key={sentence.id} className="space-y-4">
                    <Card className="border-2 border-gray-700 bg-gray-800 hover:border-indigo-500 transition-colors">
                      <CardHeader>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-lg font-medium text-white leading-relaxed break-words">
                                {renderClickableWords(sentence)}
                              </p>
                            </div>
                            {!sentence.isAnalyzed && !sentence.isAnalyzing && (
                              <Button
                                onClick={() =>
                                  analyzeSingleSentence(sentence.id)
                                }
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 ml-4"
                              >
                                분석하기
                              </Button>
                            )}
                            {sentence.isAnalyzing && (
                              <div className="flex items-center gap-2 ml-4">
                                <div className="animate-spin w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
                                <span className="text-sm text-indigo-400">
                                  분석 중...
                                </span>
                              </div>
                            )}
                          </div>
                          {sentence.translation && (
                            <div className="space-y-2">
                              <button
                                onClick={() => toggleTranslation(sentence.id)}
                                className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                {sentence.isTranslationVisible ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" />
                                    번역 숨기기
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    번역 보기
                                  </>
                                )}
                              </button>
                              {sentence.isTranslationVisible && (
                                <p className="text-gray-400 pl-5">
                                  {sentence.translation}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                    </Card>

                    {/* 작은 화면에서 선택된 단어 정보를 문장 바로 아래 표시 */}
                    {selectedWordInfo &&
                      selectedWordInfo.sentenceId === sentence.id && (
                        <Card className="bg-indigo-600/50 mt-4 lg:hidden">
                          <CardHeader>
                            <h3 className="font-medium text-white flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              단어 정보
                            </h3>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xl font-bold text-white">
                                        {selectedWordInfo.word.word}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs border-gray-500 text-gray-300"
                                      >
                                        {selectedWordInfo.word.pos}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {isEditingWord ? (
                                      <>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-white hover:text-green-200"
                                          onClick={saveEditedWord}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-white hover:text-red-200"
                                          onClick={cancelWordEditing}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:text-indigo-200"
                                        onClick={startWordEditing}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {isEditingWord ? (
                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <Input
                                        value={editingWordValues.meaning}
                                        onChange={(event) =>
                                          handleWordFieldChange(
                                            "meaning",
                                            event.target.value
                                          )
                                        }
                                        placeholder="뜻을 입력하세요"
                                        className="bg-gray-800 border-gray-600 text-white"
                                      />
                                      <p className="text-xs text-gray-300">
                                        뜻을 수정해서 저장할 수 있습니다.
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <Textarea
                                        value={editingWordValues.others}
                                        onChange={(event) =>
                                          handleWordFieldChange(
                                            "others",
                                            event.target.value
                                          )
                                        }
                                        placeholder="성조나 추가 정보를 입력하세요"
                                        className="bg-gray-800 border-gray-600 text-white"
                                        rows={3}
                                      />
                                      <p className="text-xs text-gray-300">
                                        발음, 성조 등 추가 정보를 입력하세요.
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-gray-300">
                                      {selectedWordInfo.word.meaning}
                                    </p>
                                    <p className="text-xs text-gray-200 whitespace-pre-line">
                                      {selectedWordInfo.word.others || ""}
                                    </p>
                                  </>
                                )}
                              </div>

                              <div className="pt-4 border-t border-gray-600">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedWordInfo.word.isSelected}
                                    onCheckedChange={() =>
                                      toggleWordSelection(
                                        selectedWordInfo.sentenceId,
                                        selectedWordInfo.wordId
                                      )
                                    }
                                  />
                                  <span className="text-sm text-gray-400">
                                    단어장에 추가
                                  </span>
                                </div>
                              </div>

                              {selectedWordInfo.word.isKnown && (
                                <div className="p-3 bg-green-900/30 rounded border-l-4 border-green-500">
                                  <p className="text-xs text-green-300 font-medium mb-1">
                                    이전에 학습한 단어입니다
                                  </p>
                                </div>
                              )}

                              {/* 과거 맥락 섹션 */}
                              {wordContext &&
                                wordContext.sentences.length > 0 && (
                                  <div className="pt-4 border-t border-gray-600">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-sm font-medium text-gray-300">
                                        과거 맥락 (
                                        {wordContext.sentences.length}개)
                                      </h4>
                                      {isLoadingContext && (
                                        <div className="animate-spin w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
                                      )}
                                    </div>

                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                      {wordContext.sentences.map(
                                        (item, index) => (
                                          <div
                                            key={item.sentence.id}
                                            className="p-3 bg-yellow-900/20 rounded border-l-4 border-yellow-500"
                                          >
                                            <div className="space-y-2">
                                              <p className="text-sm text-gray-300 leading-relaxed">
                                                "{item.sentence.text}"
                                              </p>
                                              <p className="text-xs text-yellow-400">
                                                → {item.sentence.meaning}
                                              </p>
                                              <div className="flex items-center justify-between">
                                                <p className="text-xs text-yellow-300 font-medium">
                                                  이 맥락에서: "{item.meaning}"
                                                </p>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs text-gray-500">
                                                    복습{" "}
                                                    {item.sentence.review_count}
                                                    회
                                                  </span>
                                                  {item.sentence
                                                    .is_last_review_successful ? (
                                                    <span className="text-xs text-green-400">
                                                      ✓
                                                    </span>
                                                  ) : (
                                                    <span className="text-xs text-red-400">
                                                      ✗
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* 로딩 상태 */}
                              {isLoadingContext && !wordContext && (
                                <div className="pt-4 border-t border-gray-600">
                                  <div className="flex items-center gap-2 text-gray-400">
                                    <div className="animate-spin w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
                                    <span className="text-sm">
                                      과거 맥락 로딩 중...
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                ))}

                {/* Save Button */}
                <div className="text-center pt-4">
                  <Button
                    onClick={saveSelectedWords}
                    disabled={getSelectedWordsCount() === 0}
                    size="lg"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-8 text-white"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    단어장에 저장하기 ({getSelectedWordsCount()}개 단어)
                  </Button>
                </div>
              </div>

              {/* 선택된 단어 정보 - 큰 화면에서만 사이드바로 표시 */}
              <div className="lg:col-span-1 hidden lg:block">
                <div className="sticky top-6">
                  <Card className="border-2 border-gray-700 bg-gray-700 focus-visible:ring-0 focus-visible:ring-offset-0">
                    <CardHeader>
                      <h3 className="font-medium text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        단어 정보
                      </h3>
                    </CardHeader>
                    <CardContent>
                      {selectedWordInfo ? (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xl font-bold text-white">
                                    {selectedWordInfo.word.word}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-gray-500 text-gray-300"
                                  >
                                    {selectedWordInfo.word.pos}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {isEditingWord ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-white hover:text-green-200"
                                      onClick={saveEditedWord}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-white hover:text-red-200"
                                      onClick={cancelWordEditing}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white hover:text-indigo-200"
                                    onClick={startWordEditing}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {isEditingWord ? (
                              <div className="space-y-3">
                                <Input
                                  value={editingWordValues.meaning}
                                  onChange={(event) =>
                                    handleWordFieldChange(
                                      "meaning",
                                      event.target.value
                                    )
                                  }
                                  placeholder="뜻을 입력하세요"
                                  className="bg-gray-800 border-gray-600 text-white"
                                />
                                <Textarea
                                  value={editingWordValues.others}
                                  onChange={(event) =>
                                    handleWordFieldChange(
                                      "others",
                                      event.target.value
                                    )
                                  }
                                  placeholder="성조나 추가 정보를 입력하세요"
                                  className="bg-gray-800 border-gray-600 text-white"
                                  rows={4}
                                />
                              </div>
                            ) : (
                              <>
                                <p className="text-gray-300">
                                  {selectedWordInfo.word.meaning}
                                </p>
                                <p className="text-xs text-gray-200 whitespace-pre-line">
                                  {selectedWordInfo.word.others || ""}
                                </p>
                              </>
                            )}
                          </div>

                          <div className="pt-4 border-t border-gray-600">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedWordInfo.word.isSelected}
                                onCheckedChange={() =>
                                  toggleWordSelection(
                                    selectedWordInfo.sentenceId,
                                    selectedWordInfo.wordId
                                  )
                                }
                              />
                              <span className="text-sm text-gray-400">
                                단어장에 추가
                              </span>
                            </div>
                          </div>

                          {selectedWordInfo.word.isKnown && (
                            <div className="p-3 bg-green-900/30 rounded border-l-4 border-green-500">
                              <p className="text-xs text-green-300 font-medium mb-1">
                                이전에 학습한 단어입니다
                              </p>
                            </div>
                          )}

                          {selectedWordInfo.word.previousContexts &&
                            selectedWordInfo.word.previousContexts.length >
                              0 && (
                              <div className="p-3 bg-yellow-900/30 rounded border-l-4 border-yellow-500">
                                <p className="text-xs text-yellow-300 font-medium mb-1">
                                  이전 문맥
                                </p>
                                <p className="text-xs text-yellow-400">
                                  "{selectedWordInfo.word.previousContexts[0]}"
                                </p>
                              </div>
                            )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          문장을 분석한 후<br />
                          단어를 클릭해보세요
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

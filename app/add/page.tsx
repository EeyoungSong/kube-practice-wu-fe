"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Camera,
  FileText,
  Upload,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import Header from "@/components/Header";
import { useCategories } from "@/hooks/use-categories";
import { useLanguage } from "@/hooks/use-language";
import { extractTextFromImage, splitSentences } from "@/services";
import { ocrService, OCRProgress } from "@/services/ocr.service";
import { languages } from "@/types/word";

// 백업용 로컬 문장 분리 함수
const splitIntoSentencesLocal = (text: string): string[] => {
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  return sentences;
};

export default function CreateNotePage() {
  const router = useRouter();

  // 전역 언어 상태 관리
  const { selectedLanguage, setSelectedLanguage, isLoaded } = useLanguage();
  const [selectedInputType, setSelectedInputType] = useState("");
  const [noteName, setNoteName] = useState("");
  const [category, setCategory] = useState("");
  const [textContent, setTextContent] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [showTextSentenceSelector, setShowTextSentenceSelector] =
    useState(false);
  const [extractedSentences, setExtractedSentences] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [isTextProcessing, setIsTextProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputTypes = [
    {
      value: "image",
      label: "이미지 업로드",
      icon: Camera,
      description: "사진이나 스크린샷에서 텍스트를 추출합니다",
    },
    {
      value: "text",
      label: "텍스트 입력",
      icon: FileText,
      description: "직접 텍스트를 입력하여 단어를 학습합니다",
    },
  ];

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories(selectedLanguage);

  // 컴포넌트 언마운트 시 OCR 워커 정리
  useEffect(() => {
    return () => {
      ocrService.terminate().catch(console.error);
    };
  }, []);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedImage(file);
    setIsOCRProcessing(true);
    setOcrProgress(null);

    try {
      await handleClientOCR(file);
    } catch (error) {
      console.error("OCR 처리 중 오류:", error);
      alert(
        `이미지 텍스트 추출에 실패했습니다: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`
      );
      setIsOCRProcessing(false);
      setUploadedImage(null);
      setOcrProgress(null);
    }
  };

  const handleClientOCR = async (file: File) => {
    try {
      // OCR 언어 설정 (선택된 언어에 따라)
      const ocrLanguage = getOCRLanguage(selectedLanguage);

      // OCR 워커 초기화
      setOcrProgress({ status: "OCR 초기화 중...", progress: 0 });
      await ocrService.initialize(ocrLanguage);

      // 텍스트 추출
      const result = await ocrService.extractText(file, (progress) => {
        setOcrProgress(progress);
      });

      // 결과 처리
      if (result.sentences.length > 0) {
        handleAnalyzeWithWords(result.sentences);
      } else {
        throw new Error("추출된 텍스트가 없습니다.");
      }
    } finally {
      setIsOCRProcessing(false);
      setOcrProgress(null);
    }
  };

  const handleServerOCR = async (file: File) => {
    try {
      const data = await extractTextFromImage(file);
      handleAnalyzeWithWords(data.sentences);
    } finally {
      setIsOCRProcessing(false);
    }
  };

  // 언어에 따른 OCR 언어 코드 매핑
  const getOCRLanguage = (language: string): string => {
    const languageMap: { [key: string]: string } = {
      en: "eng",
      ko: "kor",
      ja: "jpn",
      zh: "chi_sim",
      fr: "fra",
      de: "deu",
      es: "spa",
      ru: "rus",
    };

    // 기본적으로 영어+한국어 조합 사용
    return languageMap[language] ? `${languageMap[language]}+eng` : "eng+kor";
  };

  const handleTextAnalyze = async () => {
    if (!textContent.trim()) return;

    setIsTextProcessing(true);

    try {
      // 서버 API 시도, 실패 시 로컬 함수 사용
      let sentences: string[];
      // try {
      //   sentences = await splitSentences(textContent);
      // } catch (serverError) {
      //   console.warn("서버 API 실패, 로컬 분리 함수 사용:", serverError);
      //   sentences = splitIntoSentencesLocal(textContent);
      // }
      sentences = splitIntoSentencesLocal(textContent);
      handleAnalyzeWithWords(sentences);
      // setExtractedSentences(sentences);
      // setShowTextSentenceSelector(true);
      // setIsTextProcessing(false);
    } catch (error) {
      console.error("문장 분리 중 오류:", error);
      alert(
        `문장 분리에 실패했습니다: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`
      );
      setIsTextProcessing(false);
    }
  };

  const handleSentencesSelected = (sentences: string[]) => {
    setSelectedWords(sentences);
    setShowTextSentenceSelector(false);
    // 선택된 문장들로 바로 분석 페이지로 이동
    handleAnalyzeWithWords(sentences);
  };

  const handleSentenceSelectorCancel = () => {
    setShowTextSentenceSelector(false);
    setExtractedSentences([]);
    setSelectedWords([]);
    setUploadedImage(null);
  };

  const handleAnalyzeWithWords = (sentences: string[]) => {
    // 문장 데이터를 sessionStorage에 저장 (페이지 이동 중에만 유지)
    const analysisId = Date.now().toString();
    const analysisData = {
      sentences,
      lang: selectedLanguage,
      type: selectedInputType,
      name: noteName,
      category: category || "일반",
      timestamp: analysisId,
    };

    sessionStorage.setItem(
      `analysis_${analysisId}`,
      JSON.stringify(analysisData)
    );

    // 간단한 파라미터만 URL로 전달
    const params = new URLSearchParams({
      id: analysisId,
    });

    router.push(`/analyze?${params.toString()}`);
  };

  const handleInputTypeSelect = (value: string) => {
    if (selectedInputType === value) {
      setSelectedInputType("");
    } else {
      setSelectedInputType(value);
      // Reset content when switching types
      setTextContent("");
      setUploadedImage(null);
      setShowTextSentenceSelector(false);
      setExtractedSentences([]);
      setSelectedWords([]);
      setIsOCRProcessing(false);
      setIsTextProcessing(false);
    }
  };

  const isReadyToAnalyze = () => {
    if (!noteName || !selectedInputType) return false;

    switch (selectedInputType) {
      case "text":
        return !!textContent;
      case "image":
        return true; // 이미지는 업로드 후 바로 처리
      default:
        return false;
    }
  };

  // 언어 로딩이 완료될 때까지 로딩 화면 표시
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">언어 설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        languages={languages}
      />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-5">
            <h3 className="text-lg font-bold text-white"></h3>
          </div>

          {/* Sentence Selector (텍스트와 OCR 공통) */}
          {/* {showTextSentenceSelector && <SentenceSelector />} */}

          {/* Input Type Selection */}
          {!showTextSentenceSelector && (
            <Card className="mb-8 bg-transparent border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Camera className="w-5 h-5 text-primary" />
                  입력 방식 선택
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {inputTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedInputType === type.value;
                  const ChevronIcon = isSelected ? ChevronUp : ChevronDown;

                  return (
                    <div
                      key={type.value}
                      className="border border-gray-600 rounded-lg overflow-hidden"
                    >
                      <div
                        className={`p-4 cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-gray-700/50"
                            : "border-gray-600 hover:border-primary hover:bg-gray-700/50"
                        }`}
                        onClick={() => handleInputTypeSelect(type.value)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Icon
                              className={`w-5 h-5 mt-0.5 ${
                                isSelected ? "text-primary" : "text-gray-400"
                              }`}
                            />
                            <div>
                              <div
                                className={`font-medium ${
                                  isSelected
                                    ? "text-primary-foreground"
                                    : "text-white"
                                }`}
                              >
                                {type.label}
                              </div>
                              <div className="text-sm text-gray-400 mt-1">
                                {type.description}
                              </div>
                            </div>
                          </div>
                          <ChevronIcon
                            className={`w-5 h-5 ${
                              isSelected ? "text-primary" : "text-gray-500"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isSelected && (
                        <div className="border-t border-gray-600 bg-gray-800 p-6 space-y-6">
                          {/* Note Information */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="noteName"
                                className="text-gray-300"
                              >
                                단어장 이름
                              </Label>
                              <Input
                                id="noteName"
                                placeholder="예: 영어 뉴스 기사"
                                value={noteName}
                                onChange={(e) => setNoteName(e.target.value)}
                                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="category"
                                className="text-gray-300"
                              >
                                카테고리
                              </Label>
                              <div className="relative">
                                <Input
                                  id="category"
                                  list="categories"
                                  placeholder="카테고리 선택 또는 직접 입력"
                                  value={category}
                                  onChange={(e) => setCategory(e.target.value)}
                                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                                />
                                <datalist id="categories">
                                  {(categoriesData as any[])?.map(
                                    (cat: any) => (
                                      <option key={cat.id} value={cat.name} />
                                    )
                                  ) || []}
                                </datalist>
                              </div>
                            </div>
                          </div>

                          {/* Content Input based on type */}
                          {type.value === "text" && (
                            <div className="space-y-2">
                              <Label
                                htmlFor="textContent"
                                className="text-gray-300"
                              >
                                텍스트 내용
                              </Label>
                              <Textarea
                                id="textContent"
                                placeholder="학습할 텍스트를 입력하세요..."
                                className="min-h-[200px] bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                              />
                            </div>
                          )}

                          {type.value === "image" && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label className="text-gray-300">
                                  이미지 업로드
                                </Label>
                                <div
                                  className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary-hover transition-colors"
                                  onClick={() =>
                                    !isOCRProcessing &&
                                    fileInputRef.current?.click()
                                  }
                                >
                                  {isOCRProcessing ? (
                                    <div>
                                      <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
                                      <p className="text-sm font-medium text-primary-foreground">
                                        {ocrProgress?.status ||
                                          "이미지에서 텍스트를 추출하고 있습니다..."}
                                      </p>
                                      {ocrProgress && (
                                        <div className="mt-2">
                                          <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div
                                              className="bg-primary h-2 rounded-full transition-all duration-300"
                                              style={{
                                                width: `${
                                                  ocrProgress.progress * 100
                                                }%`,
                                              }}
                                            />
                                          </div>
                                          <p className="text-xs text-gray-400 mt-1">
                                            {Math.round(
                                              ocrProgress.progress * 100
                                            )}
                                            % 완료
                                          </p>
                                        </div>
                                      )}
                                      <p className="text-xs text-gray-400 mt-1">
                                        브라우저에서 처리 중...
                                      </p>
                                    </div>
                                  ) : uploadedImage ? (
                                    <div>
                                      <Upload className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                      <p className="text-sm font-medium text-green-300">
                                        {uploadedImage.name}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        클릭하여 다른 이미지 선택
                                      </p>
                                    </div>
                                  ) : (
                                    <div>
                                      <Camera className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                      <p className="text-sm text-gray-300">
                                        클릭하여 이미지를 업로드하세요
                                      </p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        JPG, PNG, GIF 파일 지원
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  className="hidden"
                                />
                              </div>
                            </div>
                          )}

                          {/* Action Button */}
                          <Button
                            onClick={
                              type.value === "text"
                                ? handleTextAnalyze
                                : () => fileInputRef.current?.click()
                            }
                            disabled={
                              !isReadyToAnalyze() ||
                              isOCRProcessing ||
                              isTextProcessing
                            }
                            className="w-full bg-primary hover:bg-primary-hover text-white"
                            size="lg"
                          >
                            {(type.value === "image" && isOCRProcessing) ||
                            (type.value === "text" && isTextProcessing) ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                처리 중...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                {type.value === "text"
                                  ? "문장 분석하기"
                                  : "이미지 업로드"}
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

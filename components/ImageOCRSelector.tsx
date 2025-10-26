"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, X } from "lucide-react";

interface WordBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface OCRWord {
  text: string;
  box: WordBox;
}

interface OCRResponse {
  words: OCRWord[];
}

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

interface ImageOCRSelectorProps {
  imageFile: File;
  onWordsSelected: (words: string[]) => void;
  onCancel: () => void;
  onSaveToNote?: (data: {
    sentences: Array<{
      text: string;
      meaning: string;
      words: Array<{
        text: string;
        meaning: string;
      }>;
    }>;
  }) => void;
}

export default function ImageOCRSelector({
  imageFile,
  onWordsSelected,
  onCancel,
  onSaveToNote,
}: ImageOCRSelectorProps) {
  const router = useRouter();
  const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null);
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [displayDimensions, setDisplayDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
  const [draggedWords, setDraggedWords] = useState<Set<number>>(new Set());
  const [hasMoved, setHasMoved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedSentences, setAnalyzedSentences] = useState<
    AnalyzedSentence[]
  >([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 이미지 URL 생성
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);

    // OCR API 호출
    performOCR();

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const performOCR = async () => {
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      // 토큰 가져오기
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // const response = await fetch(
      //   "http://localhost:8000/api/v1/extract/ocr/",
      //   {
      //     method: "POST",
      //     headers,
      //     body: formData,
      //   }
      // );

      const response = await fetch(
        "http://localhost:8000/api/v1/extract/ocr/",
        {
          method: "POST",
          headers,
          body: formData,
        }
      );
      if (!response.ok) {
        throw new Error("OCR 처리에 실패했습니다.");
      }

      const result = await response.json();
      setOcrResult(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "OCR 처리 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      const displayWidth = imageRef.current.offsetWidth;
      const displayHeight = imageRef.current.offsetHeight;

      setImageDimensions({ width: naturalWidth, height: naturalHeight });
      setDisplayDimensions({ width: displayWidth, height: displayHeight });
    }
  };

  const getScaledPosition = (box: WordBox) => {
    const scaleX = displayDimensions.width / imageDimensions.width;
    const scaleY = displayDimensions.height / imageDimensions.height;

    return {
      left: box.left * scaleX,
      top: box.top * scaleY,
      width: box.width * scaleX,
      height: box.height * scaleY,
    };
  };

  const toggleOCRWordSelection = (index: number) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedWords(newSelected);
  };

  const groupWordsIntoSentences = (wordIndices: number[]) => {
    if (!ocrResult) return [];

    const selectedWordData = wordIndices.map((index) => ({
      index,
      text: ocrResult.words[index].text,
      box: ocrResult.words[index].box,
      centerY:
        ocrResult.words[index].box.top + ocrResult.words[index].box.height / 2,
      centerX:
        ocrResult.words[index].box.left + ocrResult.words[index].box.width / 2,
    }));

    // Y좌표로 정렬 (위에서 아래로)
    selectedWordData.sort((a, b) => a.centerY - b.centerY);

    const sentences: string[] = [];
    let currentSentence: typeof selectedWordData = [];

    // 문장 부호 정의
    const sentenceEnders = /[.!?;:。！？；：]/;

    const finalizeSentence = (sentence: typeof selectedWordData) => {
      if (sentence.length > 0) {
        // X좌표로 정렬 (왼쪽에서 오른쪽으로)
        sentence.sort((a, b) => a.centerX - b.centerX);
        sentences.push(sentence.map((w) => w.text).join(" "));
      }
    };

    selectedWordData.forEach((word, index) => {
      if (currentSentence.length === 0) {
        currentSentence = [word];
      } else {
        const lastWord = currentSentence[currentSentence.length - 1];
        const yDistance = Math.abs(word.centerY - lastWord.centerY);
        const avgHeight = (word.box.height + lastWord.box.height) / 2;

        // 같은 줄로 간주하는 기준: Y 거리가 평균 높이의 0.7배 이하
        if (yDistance <= avgHeight * 0.7) {
          currentSentence.push(word);

          // 현재 단어가 문장 부호를 포함하는지 확인
          if (sentenceEnders.test(word.text)) {
            finalizeSentence(currentSentence);
            currentSentence = [];
          }
        } else {
          // 줄이 바뀌면 현재 문장을 완성하고 새로운 문장 시작
          finalizeSentence(currentSentence);
          currentSentence = [word];
        }
      }

      // 마지막 단어일 때 문장 부호 체크
      if (index === selectedWordData.length - 1 && currentSentence.length > 0) {
        if (sentenceEnders.test(word.text)) {
          finalizeSentence(currentSentence);
          currentSentence = [];
        }
      }
    });

    // 마지막 문장 처리
    finalizeSentence(currentSentence);

    return sentences;
  };

  const performAIAnalysis = async (sentences: string[]) => {
    setIsAnalyzing(true);

    try {
      // 토큰 가져오기
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        "http://localhost:8000/api/v1/extract/sentences/",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ sentences }),
        }
      );

      if (!response.ok) {
        throw new Error("문장 분석에 실패했습니다.");
      }

      const result = await response.json();

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
      setError("AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = () => {
    if (!ocrResult) return;

    const selectedWordIndices = Array.from(selectedWords);
    const sentences = groupWordsIntoSentences(selectedWordIndices);
    performAIAnalysis(sentences);
  };

  const selectAll = () => {
    if (!ocrResult) return;
    setSelectedWords(new Set(ocrResult.words.map((_, index) => index)));
  };

  const clearSelection = () => {
    setSelectedWords(new Set());
  };

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

  const getSelectedWordsCount = () => {
    return analyzedSentences.reduce(
      (total, sentence) =>
        total + sentence.words.filter((word) => word.isSelected).length,
      0
    );
  };

  const handleSaveToNote = async () => {
    // 선택된 단어가 포함된 문장들만 필터링
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

    // 데이터를 부모 컴포넌트로 전달
    if (onSaveToNote) {
      const dataToSave = {
        sentences: sentencesWithSelectedWords.map((sentence) => ({
          text: sentence.original,
          meaning: sentence.translation,
          words: sentence.words.map((word) => ({
            text: word.word,
            meaning: word.meaning,
          })),
        })),
      };
      onSaveToNote(dataToSave);
    }
  };

  const getRelativePosition = (event: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };

    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const isWordInDragArea = (
    wordBox: WordBox,
    dragArea: { left: number; top: number; width: number; height: number }
  ) => {
    const scaledBox = getScaledPosition(wordBox);

    // 드래그 영역과 단어 영역이 겹치는지 확인
    return !(
      scaledBox.left > dragArea.left + dragArea.width ||
      scaledBox.left + scaledBox.width < dragArea.left ||
      scaledBox.top > dragArea.top + dragArea.height ||
      scaledBox.top + scaledBox.height < dragArea.top
    );
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    const pos = getRelativePosition(event);
    setDragStart(pos);
    setDragEnd(pos);
    setIsDragging(true);
    setDraggedWords(new Set());
    setHasMoved(false);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !ocrResult) return;

    const pos = getRelativePosition(event);
    setDragEnd(pos);

    // 마우스가 움직였는지 확인 (5px 이상 움직이면 드래그로 간주)
    const moveDistance =
      Math.abs(pos.x - dragStart.x) + Math.abs(pos.y - dragStart.y);
    if (moveDistance > 5) {
      setHasMoved(true);
    }

    // 실제로 움직임이 감지된 경우에만 드래그로 처리
    if (hasMoved) {
      const dragArea = {
        left: Math.min(dragStart.x, pos.x),
        top: Math.min(dragStart.y, pos.y),
        width: Math.abs(pos.x - dragStart.x),
        height: Math.abs(pos.y - dragStart.y),
      };

      const newSelected = new Set(selectedWords);
      const newDraggedWords = new Set(draggedWords);

      ocrResult.words.forEach((word, index) => {
        if (isWordInDragArea(word.box, dragArea)) {
          if (!newDraggedWords.has(index)) {
            // 처음 드래그되는 단어는 현재 상태에 따라 토글
            if (selectedWords.has(index)) {
              newSelected.delete(index);
            } else {
              newSelected.add(index);
            }
            newDraggedWords.add(index);
          }
        }
      });

      setSelectedWords(newSelected);
      setDraggedWords(newDraggedWords);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    // 움직임이 거의 없었다면 클릭으로 처리
    if (!hasMoved && ocrResult) {
      const clickArea = {
        left: dragStart.x - 5,
        top: dragStart.y - 5,
        width: 10,
        height: 10,
      };

      // 클릭된 위치의 단어 찾기
      const clickedWordIndex = ocrResult.words.findIndex((word) =>
        isWordInDragArea(word.box, clickArea)
      );

      if (clickedWordIndex !== -1) {
        toggleOCRWordSelection(clickedWordIndex);
      }
    }

    setIsDragging(false);
    setHasMoved(false);
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            이미지에서 텍스트를 추출하고 있습니다
          </h3>
          <p className="text-sm text-gray-400">잠시만 기다려주세요...</p>
        </CardContent>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card className="bg-gray-800 border-gray-700">
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
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <X className="w-8 h-8 mx-auto mb-2" />
            <h3 className="text-lg font-semibold mb-2">오류가 발생했습니다</h3>
            <p className="text-sm">{error}</p>
          </div>
          <Button
            onClick={onCancel}
            variant="outline"
            className="bg-gray-700 border-gray-600 text-white"
          >
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 분석 완료 후 화면
  if (analysisComplete) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">AI 분석 결과</CardTitle>
            <p className="text-sm text-gray-400 mt-2">
              학습하고 싶은 단어를 선택하세요. 이미 알고 있는 단어는 건너뛸 수
              있습니다.
            </p>
            <Badge
              variant="secondary"
              className="bg-indigo-900 text-indigo-200 border-indigo-800"
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

        {/* 저장 버튼 */}
        <div className="flex gap-3">
          <Button
            onClick={handleSaveToNote}
            disabled={getSelectedWordsCount() === 0}
            className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary-hover hover:to-secondary-hover text-white"
          >
            단어장에 저장하기 ({getSelectedWordsCount()}개 단어)
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            취소
          </Button>
        </div>
      </div>
    );
  }

  // OCR 선택 화면
  return (
    <div className="space-y-6">
      <Card className="bg-transparent border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">
            이미지에서 학습할 단어를 선택하세요
          </CardTitle>
          <p className="text-sm text-gray-400 mt-2">
            클릭하여 개별 단어를 선택하거나 드래그하여 영역을 선택하세요
            {isDragging && (
              <span className="ml-2 text-indigo-300">
                {hasMoved ? "드래그 중..." : "클릭 대기..."}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Badge
              variant="secondary"
              className="bg-indigo-900 text-indigo-200"
            >
              {selectedWords.size}개 선택됨
            </Badge>
            <Button
              size="sm"
              onClick={selectAll}
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
          <div
            className="relative inline-block min-h-[200px] w-full"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              userSelect: "none",
              cursor: isDragging
                ? hasMoved
                  ? "crosshair"
                  : "pointer"
                : "default",
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="OCR 이미지"
              className="max-w-full h-auto border border-gray-600 rounded select-none"
              onLoad={handleImageLoad}
              style={{ userSelect: "none" }}
            />

            {/* 단어 오버레이 */}
            {ocrResult &&
              imageDimensions.width > 0 &&
              displayDimensions.width > 0 && (
                <div className="absolute inset-0">
                  {ocrResult.words.map((word, index) => {
                    const scaledBox = getScaledPosition(word.box);
                    const isSelected = selectedWords.has(index);

                    return (
                      <div
                        key={index}
                        className={`word-overlay absolute cursor-pointer transition-all duration-200 rounded ${
                          isSelected
                            ? "bg-indigo-500/30 shadow-lg"
                            : `bg-gray-500/30 ${
                                !isDragging ? "hover:bg-indigo-500/20" : ""
                              }`
                        }`}
                        style={{
                          left: `${scaledBox.left}px`,
                          top: `${scaledBox.top}px`,
                          width: `${scaledBox.width}px`,
                          height: `${scaledBox.height}px`,
                        }}
                        title={word.text}
                      ></div>
                    );
                  })}
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 단어 목록 */}
      {selectedWords.size > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">선택된 내용</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 구성된 문장들 미리보기 */}
              <div className="space-y-2">
                {groupWordsIntoSentences(Array.from(selectedWords)).map(
                  (sentence, index) => (
                    <div key={index} className="p-3 bg-gray-700 rounded-lg">
                      <p className="text-white mt-1">{sentence}</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button
          onClick={handleConfirm}
          disabled={selectedWords.size === 0}
          className="flex-1 bg-primary-hover hover:bg-primary text-white"
        >
          선택된 문장 AI 분석하기 (
          {groupWordsIntoSentences(Array.from(selectedWords)).length}개 문장)
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
        >
          취소
        </Button>
      </div>
    </div>
  );
}

import { createWorker, Worker } from "tesseract.js";

export interface OCRProgress {
  status: string;
  progress: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  sentences: string[];
}

class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;

  /**
   * OCR 워커를 초기화합니다
   * @param language 인식할 언어 (기본값: 'eng+kor')
   */
  async initialize(language: string = "eng+kor"): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      this.worker = await createWorker(language, 1, {
        logger: (m) => {
          // 진행상황 로깅 (선택사항)
          console.log("OCR Progress:", m);
        },
      });

      this.isInitialized = true;
    } catch (error) {
      console.error("OCR 워커 초기화 실패:", error);
      throw new Error("OCR 초기화에 실패했습니다.");
    }
  }

  /**
   * 이미지에서 텍스트를 추출합니다
   * @param imageFile 처리할 이미지 파일
   * @param onProgress 진행상황 콜백 함수
   * @returns OCR 결과
   */
  async extractText(
    imageFile: File,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    if (!this.worker || !this.isInitialized) {
      throw new Error(
        "OCR 워커가 초기화되지 않았습니다. initialize()를 먼저 호출하세요."
      );
    }

    try {
      // 진행상황 추적을 위한 로거 설정
      if (onProgress) {
        this.worker.setParameters({
          logger: (m) => {
            onProgress({
              status: m.status,
              progress: m.progress || 0,
            });
          },
        });
      }

      // OCR 실행
      const { data } = await this.worker.recognize(imageFile);

      // 텍스트를 문장으로 분리
      const sentences = this.splitIntoSentences(data.text);

      return {
        text: data.text,
        confidence: data.confidence,
        sentences,
      };
    } catch (error) {
      console.error("OCR 처리 중 오류:", error);
      throw new Error("이미지 텍스트 추출에 실패했습니다.");
    }
  }

  /**
   * 텍스트를 문장으로 분리합니다
   * @param text 분리할 텍스트
   * @returns 문장 배열
   */
  private splitIntoSentences(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // 문장 분리 정규식 (영어, 한국어 고려)
    const sentences = text
      .split(/[.!?]+|\n+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0)
      .filter((sentence) => sentence.length > 2); // 너무 짧은 문장 제외

    return sentences;
  }

  /**
   * OCR 워커를 종료합니다
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * 지원되는 언어 목록을 반환합니다
   */
  getSupportedLanguages(): { [key: string]: string } {
    return {
      eng: "영어",
      kor: "한국어",
      "eng+kor": "영어+한국어",
      jpn: "일본어",
      chi_sim: "중국어(간체)",
      chi_tra: "중국어(번체)",
      fra: "프랑스어",
      deu: "독일어",
      spa: "스페인어",
      rus: "러시아어",
    };
  }
}

// 싱글톤 인스턴스 생성
export const ocrService = new OCRService();

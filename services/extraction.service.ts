import { apiClient } from "./api-client";
import {
  ExtractTextResponse,
  SentenceSplitRequest,
  AnalyzeSentencesRequest,
  AnalyzeSentencesResponse,
} from "@/types/api";

class ExtractionService {
  async extractTextFromImage(imageFile: File): Promise<ExtractTextResponse> {
    const formData = new FormData();
    formData.append("image", imageFile);

    const response = await apiClient.upload<ExtractTextResponse>(
      "/extract/ocr/sentence/",
      formData,
      { requireAuth: true }
    );

    // 서버에서 반환된 문장들을 검증
    if (!response.sentences || !Array.isArray(response.sentences)) {
      throw new Error("서버 응답 형식이 올바르지 않습니다.");
    }

    return response;
  }

  async splitSentences(text: string): Promise<string[]> {
    const response = await apiClient.post<ExtractTextResponse>(
      "/extract/sentence/split/",
      { text } as SentenceSplitRequest
    );

    // 서버에서 반환된 문장들을 검증하고 배열만 반환
    if (!response.sentences || !Array.isArray(response.sentences)) {
      throw new Error("문장 분리 결과가 올바르지 않습니다.");
    }

    return response.sentences;
  }

  async analyzeSentences(
    sentences: string[],
    language: string
  ): Promise<AnalyzeSentencesResponse> {
    const response = await apiClient.post<AnalyzeSentencesResponse>(
      "/extract/sentences/",
      { sentences, language } as AnalyzeSentencesRequest,
      { requireAuth: true }
    );

    // 서버에서 반환된 분석 결과를 검증
    if (!response.selected || !Array.isArray(response.selected)) {
      throw new Error("문장 분석 결과가 올바르지 않습니다.");
    }

    return response;
  }
}

export const extractionService = new ExtractionService();

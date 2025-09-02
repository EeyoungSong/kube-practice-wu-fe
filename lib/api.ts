/**
 * @deprecated This file is deprecated. Please use the new modular services instead.
 *
 * Migration Guide:
 * - Import services from '@/services' instead of '@/lib/api'
 * - Use authService, wordbookService, extractionService, etc.
 * - See docs/API_MIGRATION_GUIDE.md for detailed migration instructions
 *
 * Examples:
 * - OLD: import { fetchCategories } from '@/lib/api'
 * - NEW: import { categoryService } from '@/services'
 *
 * - OLD: await fetchCategories()
 * - NEW: await categoryService.getCategories()
 */

const API_BASE_URL = "https://13.209.16.7/api/v1";

interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  requireAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", headers = {}, body, requireAuth = false } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  // 인증이 필요한 경우 토큰 추가
  if (requireAuth) {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  // body가 있는 경우 추가
  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  const responseText = await response.text();

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      if (responseText && responseText.trim()) {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.detail || errorMessage;
      }
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    throw new Error(errorMessage);
  }

  if (!responseText || !responseText.trim()) {
    throw new Error("서버에서 응답을 받지 못했습니다.");
  }

  return JSON.parse(responseText);
}

// OCR 이미지 업로드 API 요청
export async function extractTextFromImage(
  imageFile: File
): Promise<{ sentences: string[] }> {
  const formData = new FormData();
  formData.append("image", imageFile);

  const config: RequestInit = {
    method: "POST",
    body: formData,
    // FormData 사용 시 Content-Type 헤더를 설정하지 않으면
    // 브라우저가 자동으로 multipart/form-data로 설정
  };

  // 인증이 필요한 경우 토큰 추가 (필요시)
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  // TODO: 환경변수 설정 필요
  const response = await fetch(`${API_BASE_URL}/extract/ocr/sentence/`, config);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `OCR 처리 실패: ${response.status}`;

    try {
      if (errorText && errorText.trim()) {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.detail || errorMessage;
      }
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();

  // 서버에서 반환된 문장들을 검증
  if (!data.sentences || !Array.isArray(data.sentences)) {
    throw new Error("서버 응답 형식이 올바르지 않습니다.");
  }

  return data;
}

export async function sentenceSplit(text: string): Promise<string[]> {
  const response = await apiRequest<{ sentences: string[] }>(
    "/extract/sentence/split/",
    {
      method: "POST",
      body: { text },
    }
  );

  // 서버에서 반환된 문장들을 검증하고 배열만 반환
  if (!response.sentences || !Array.isArray(response.sentences)) {
    throw new Error("문장 분리 결과가 올바르지 않습니다.");
  }

  return response.sentences;
}

// 문장 분석 API 요청
export async function analyzeSentences(
  sentences: string[],
  language: string
): Promise<{
  selected: Array<{
    text: string;
    meaning: string;
    words: Array<{
      text: string;
      original_text: string;
      meaning: string;
    }>;
  }>;
}> {
  type AnalyzeResponse = {
    selected: Array<{
      text: string;
      meaning: string;
      words: Array<{
        original_text: string;
        text: string;
        meaning: string;
      }>;
    }>;
  };

  const response = await apiRequest<AnalyzeResponse>("/extract/sentences/", {
    method: "POST",
    body: {
      sentences,
      language,
    },
    requireAuth: true, // 분석은 인증이 필요할 수 있음
  });

  // 서버에서 반환된 분석 결과를 검증
  if (!response.selected || !Array.isArray(response.selected)) {
    throw new Error("문장 분석 결과가 올바르지 않습니다.");
  }

  return response;
}

// 카테고리 API 요청
export async function fetchCategories() {
  return apiRequest("/categories/", { requireAuth: true });
}

// 단어장 API 요청
export async function fetchWordbooks() {
  return apiRequest("/wordbooks/", { requireAuth: true });
}

// 단어장 상세 조회 API 요청
export async function fetchWordbooksDetail(id: number) {
  return apiRequest(`/wordbooks/${id}/`, { requireAuth: true });
}

// 인증이 필요하지 않은 API 요청 예시
export async function authRequest(endpoint: string, body: any) {
  return apiRequest(endpoint, {
    method: "POST",
    body,
    requireAuth: false,
  });
}

// 단어장 저장 API 요청
export async function saveWordbook(data: any) {
  return apiRequest("/wordbooks/save/", {
    method: "POST",
    body: data,
    requireAuth: true,
  });
}

// 단어장 삭제 API 요청
export async function deleteWordbook(id: string) {
  return apiRequest(`/wordbooks/${id}/`, {
    method: "DELETE",
    requireAuth: true,
  });
}

// 단어의 과거 맥락 정보 가져오기
export const getWordHistory = async (wordId: string) => {
  try {
    const response = await fetch(`/api/ocr/words/${wordId}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("단어 과거 맥락 가져오기 실패:", error);
    throw error;
  }
};

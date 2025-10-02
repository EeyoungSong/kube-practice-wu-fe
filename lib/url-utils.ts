// URL 관련 유틸리티 함수들

/**
 * 현재 언어를 URL에 쿼리 파라미터로 추가하는 함수
 */
export function addLanguageToUrl(
  baseUrl: string,
  language: string,
  additionalParams: Record<string, string> = {}
): string {
  const url = new URL(baseUrl, window.location.origin);

  // 현재 언어가 'all'이 아닌 경우에만 쿼리 파라미터에 추가
  if (language && language !== "all") {
    url.searchParams.set("lang", language);
  }

  // 추가 파라미터들도 설정
  Object.entries(additionalParams).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.pathname + url.search;
}

/**
 * URL에서 언어 파라미터를 읽어오는 함수
 */
export function getLanguageFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("lang");
}

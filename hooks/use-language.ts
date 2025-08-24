import { useState, useEffect } from "react";

const LANGUAGE_STORAGE_KEY = "word-universe-language";
const DEFAULT_LANGUAGE = "all";

export function useLanguage() {
  const [selectedLanguage, setSelectedLanguageState] =
    useState<string>(DEFAULT_LANGUAGE);
  const [isLoaded, setIsLoaded] = useState(false);

  // 컴포넌트 마운트 시 localStorage에서 언어 설정 로드
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage) {
      setSelectedLanguageState(savedLanguage);
    }
    setIsLoaded(true);
  }, []);

  // 언어 변경 함수
  const setSelectedLanguage = (language: string) => {
    setSelectedLanguageState(language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  };

  return {
    selectedLanguage,
    setSelectedLanguage,
    isLoaded, // 초기 로딩 완료 여부
  };
}

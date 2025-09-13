import { useQuery } from "@tanstack/react-query";
import { wordbookService } from "@/services";
import type { Wordbook, WordbookResponse, Sentence, Word } from "@/types/word";

export const useWordbooks = () => {
  return useQuery({
    queryKey: ["wordbooks"],
    queryFn: () => wordbookService.getWordbooks(),
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    retry: 2, // 실패시 2번 재시도
    refetchOnWindowFocus: false, // 윈도우 포커스시 재가져오기 비활성화
  });
};

export type { Wordbook, WordbookResponse, Sentence, Word };

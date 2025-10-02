import { useQuery } from "@tanstack/react-query";
import { categoryService } from "@/services";
import type { Category } from "@/types/category";
import { languages } from "@/types/word";

export const useCategories = (language: string) => {
  return useQuery({
    queryKey: ["categories", language],
    queryFn: () => categoryService.getCategories(language),
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    retry: 2, // 실패시 2번 재시도
    refetchOnWindowFocus: false, // 윈도우 포커스시 재가져오기 비활성화
  });
};

export type { Category };

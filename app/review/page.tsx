"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import ReviewComponent from "@/components/ReviewComponent";
import { Suspense } from "react";

export default function CategoryReviewPage() {
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useSearchParams();
  const language = searchParams.get("language") || "english";
  const categoryId = searchParams.get("categoryId") || null;
  const wordCount = searchParams.get("wordCount")
    ? parseInt(searchParams.get("wordCount")!)
    : undefined;

  useEffect(() => {
    // 페이지 초기화 완료
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-500" />
            <h3 className="text-lg font-medium text-white mb-2">
              페이지를 준비하는 중...
            </h3>
            <p className="text-gray-400">잠시만 기다려주세요.</p>
          </div>
        </div>
      </Suspense>
    );
  }

  if (categoryId === null) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-400 mb-2">
              카테고리 ID가 필요합니다
            </h3>
            <p className="text-gray-400">올바른 URL로 접근해주세요.</p>
          </div>
        </div>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewComponent
        categoryId={parseInt(categoryId)}
        language={language}
        wordCount={wordCount}
      />
    </Suspense>
  );
}

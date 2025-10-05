"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { wordbookService } from "@/services";
import ReviewComponent from "@/components/ReviewComponent";
import type { Wordbook } from "@/types/word";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const [wordbookId, setWordbookId] = useState<number | null>(null);
  const [wordbookName, setWordbookName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializePage = async () => {
      try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);
        setWordbookId(id);

        // 단어장 정보 가져오기
        const wordbook: Wordbook = await wordbookService.getWordbook(id);
        setWordbookName(wordbook.name);
      } catch (error) {
        console.error("Failed to initialize review page:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, [params]);

  if (isLoading || wordbookId === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-500" />
          <h3 className="text-lg font-medium text-white mb-2">
            페이지를 준비하는 중...
          </h3>
          <p className="text-gray-400">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <ReviewComponent wordbookId={wordbookId} wordbookName={wordbookName} />
  );
}

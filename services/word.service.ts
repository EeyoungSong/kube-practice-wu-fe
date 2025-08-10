import { apiClient } from "./api-client";
import { WordHistory } from "@/types/api";

class WordService {
  async getWordHistory(wordId: string): Promise<WordHistory> {
    // Note: This endpoint seems to be using a different base URL pattern
    // You might need to adjust this based on your actual API structure
    return apiClient.get<WordHistory>(`/ocr/words/${wordId}/`, {
      requireAuth: true,
    });
  }

  async searchWords(query: string): Promise<any> {
    return apiClient.get<any>("/words/search/", {
      requireAuth: true,
      // You can add query params handling in the apiClient if needed
    });
  }
}

export const wordService = new WordService();

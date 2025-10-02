import { apiClient } from "./api-client";
import {
  Wordbook,
  WordbookResponse,
  SaveWordbookRequest,
  ReviewData,
  ReviewSubmission,
  ReviewResponse,
} from "@/types/word";

class WordbookService {
  async getWordbooks(): Promise<WordbookResponse> {
    return apiClient.get<WordbookResponse>("/wordbooks/", {
      requireAuth: true,
    });
  }

  async getWordbook(id: number): Promise<Wordbook> {
    return apiClient.get<Wordbook>(`/wordbooks/${id}/`, {
      requireAuth: true,
    });
  }

  async saveWordbook(data: SaveWordbookRequest): Promise<Wordbook> {
    return apiClient.post<Wordbook>("/wordbooks/save/", data, {
      requireAuth: true,
    });
  }

  async deleteWordbook(id: string): Promise<void> {
    return apiClient.delete<void>(`/wordbooks/${id}/`, {
      requireAuth: true,
    });
  }

  async updateWordbook(
    id: number,
    data: Partial<SaveWordbookRequest>
  ): Promise<Wordbook> {
    return apiClient.put<Wordbook>(`/wordbooks/${id}/`, data, {
      requireAuth: true,
    });
  }

  // Review related methods
  async getReviewData(id: number): Promise<ReviewData> {
    return apiClient.get<ReviewData>(`/wordbooks/${id}/review/`, {
      requireAuth: true,
    });
  }

  async getReviewDataByCategory(
    language: string,
    category: number
  ): Promise<ReviewData> {
    return apiClient.get<ReviewData>(`/wordbooks/review/`, {
      requireAuth: true,
      queryParams: {
        language: language,
        category: category,
      },
    });
  }

  async submitReview(data: ReviewSubmission): Promise<ReviewResponse> {
    return apiClient.post<ReviewResponse>(
      `/wordbooks/${data.wordbook_id}/review/submit/`,
      data,
      {
        requireAuth: true,
      }
    );
  }
}

export const wordbookService = new WordbookService();

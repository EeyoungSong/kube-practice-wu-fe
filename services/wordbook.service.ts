import { apiClient } from "./api-client";
import { Wordbook, WordbookResponse, SaveWordbookRequest } from "@/types/api";

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
}

export const wordbookService = new WordbookService();

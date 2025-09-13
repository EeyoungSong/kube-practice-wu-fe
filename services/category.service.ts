import { apiClient } from "./api-client";
import { Category, CategoriesResponse } from "@/types/category";

class CategoryService {
  async getCategories(): Promise<Category[]> {
    return apiClient.get<Category[]>("/categories/", {
      requireAuth: true,
    });
  }

  async getCategory(id: number): Promise<Category> {
    return apiClient.get<Category>(`/categories/${id}/`, {
      requireAuth: true,
    });
  }

  async createCategory(data: Omit<Category, "id">): Promise<Category> {
    return apiClient.post<Category>("/categories/", data, {
      requireAuth: true,
    });
  }

  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    return apiClient.put<Category>(`/categories/${id}/`, data, {
      requireAuth: true,
    });
  }

  async deleteCategory(id: number): Promise<void> {
    return apiClient.delete<void>(`/categories/${id}/`, {
      requireAuth: true,
    });
  }
}

export const categoryService = new CategoryService();

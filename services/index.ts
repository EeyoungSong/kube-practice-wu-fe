// Import extraction functions first
import {
  extractTextFromImage,
  splitSentences,
  analyzeSentences,
} from "./extraction.service";

// Export all services
export { authService } from "./auth.service";
export { wordbookService } from "./wordbook.service";
export {
  extractTextFromImage,
  splitSentences,
  analyzeSentences,
} from "./extraction.service";
export { categoryService } from "./category.service";
export { wordService } from "./word.service";

// Create extractionService object for convenience
export const extractionService = {
  extractTextFromImage,
  splitSentences,
  analyzeSentences,
};

// Export API client and error class
export { apiClient, APIError } from "./api-client";

// Re-export types for convenience
export * from "@/types/auth";
export * from "@/types/category";
export * from "@/types/common";
export * from "@/types/extraction";
export * from "@/types/word";

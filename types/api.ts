// Common API types
export interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  requireAuth?: boolean;
}

export interface ApiError {
  message: string;
  status?: number;
  detail?: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user_id: number;
  username: string;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
  refresh?: string; // Some APIs return a new refresh token
}

export interface User {
  id: number;
  email: string;
  username: string;
  user_id: number;
}

// Word and Sentence types
export interface Word {
  id?: number;
  text: string;
  original_text?: string;
  meaning: string;
}

export interface Sentence {
  id?: number;
  text: string;
  meaning: string;
  words: Word[];
  last_reviewed_at?: string | null;
  review_count?: number;
  is_last_review_successful?: boolean;
}

// Wordbook types
export interface Wordbook {
  id: number;
  name: string;
  category: number | null;
  category_name: string;
  language: string;
  input_type: "image" | "text";
  created_at: string;
  sentences: Sentence[];
}

export interface WordbookResponse {
  wordbooks: Wordbook[];
  total_count: number;
  category?: {
    id: number;
    name: string;
  };
}

export interface SaveWordbookRequest {
  wordbook_name: string;
  wordbook_category: string;
  wordbook_language: string;
  input_type: "image" | "text";
  selected: Array<{
    text: string;
    meaning: string;
    words: Array<{
      text: string;
      meaning: string;
    }>;
  }>;
}

// Category types
export interface Category {
  id: number;
  name: string;
  value: string;
  color: string;
}

export interface CategoriesResponse {
  success: boolean;
  data: Category[];
  message: string;
}

// Extraction types
export interface ExtractTextResponse {
  sentences: string[];
}

export interface SentenceSplitRequest {
  text: string;
}

export interface AnalyzeSentencesRequest {
  sentences: string[];
  language: string;
}

export interface AnalyzedWord {
  text: string;
  original_text: string;
  meaning: string;
}

export interface AnalyzedSentence {
  text: string;
  meaning: string;
  words: AnalyzedWord[];
}

export interface AnalyzeSentencesResponse {
  selected: AnalyzedSentence[];
}

// Word History types
export interface WordHistory {
  word_id: string;
  contexts: Array<{
    sentence: string;
    timestamp: string;
  }>;
}

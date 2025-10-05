// Word and Sentence types
export const languages = [
  { value: "all", label: "전체 언어" },
  { value: "english", label: "🇬🇧 영어" },
  { value: "chinese", label: "🇨🇳 중국어" },
  { value: "spanish", label: "🇪🇸 스페인어" },
];

export interface Word {
  id?: number;
  text: string;
  original_text?: string;
  meaning: string;
  pos: string;
  others?: string;
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
  category: number;
  category_name: string;
  language: string;
  input_type: "image" | "text";
  created_at: string;
  sentences: Sentence[];
  words_with_sentences?: WordWithSentences[];
}

export interface WordbookInfo {
  id: number;
  name: string;
  category_name: string;
}

export interface WordWithSentences {
  id: number;
  text: string;
  others: string;
  sentences: SentenceWithWordbook[];
}

export interface SentenceWithWordbook extends Sentence {
  word_meaning_in_context: string;
  word_pos_in_context: string;
  word_memo_in_context: string;
  is_current_wordbook: boolean;
  wordbook_info: WordbookInfo;
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
  name: string;
  category: string;
  language: string;
  input_type: "image" | "text";
  sentences: Array<{
    text: string;
    meaning: string;
    words: Array<{
      text: string;
      meaning: string;
      others: string;
    }>;
  }>;
}

export interface UpdateWordbookRequest {
  name: string;
  category: string;
}

// Word History types
export interface WordHistory {
  word_id: string;
  contexts: Array<{
    sentence: string;
    timestamp: string;
  }>;
}

// Review types
export interface ReviewWord {
  id: string;
  word: string;
  meaning: string;
  context: string;
}

// Category review types (different structure)
export interface CategoryReviewMeaning {
  id: string;
  meaning: string;
  others: string;
  pos: string;
  context: string;
}

export interface CategoryReviewWord {
  word: string;
  meanings: CategoryReviewMeaning[];
}

export interface ReviewData {
  words: (ReviewWord | CategoryReviewWord)[];
  total_count: number;
}

export interface ReviewResult {
  word_id: string;
  is_known: boolean; // 사용자가 '알고 있음'/'모름'을 선택
}

export interface ReviewSubmission {
  wordbook_id: number;
  results: ReviewResult[];
}

export interface ReviewResponse {
  success: boolean;
  message: string;
  total_score: number;
  known_count: number;
  total_count: number;
}

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
  others: string;
}

export interface AnalyzedSentence {
  text: string;
  meaning: string;
  words: AnalyzedWord[];
}

export interface AnalyzeSentencesResponse {
  selected: AnalyzedSentence[];
}

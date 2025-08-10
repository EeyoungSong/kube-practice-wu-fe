# API Migration Guide

This guide helps you migrate from the old monolithic `lib/api.ts` to the new modular service architecture.

## Overview

The API layer has been restructured from a single file (`lib/api.ts`) into organized service modules:

```
services/
├── api-client.ts      # Base API client with common functionality
├── auth.service.ts    # Authentication related APIs
├── category.service.ts # Category management APIs
├── extraction.service.ts # Text extraction and analysis APIs
├── wordbook.service.ts # Wordbook CRUD operations
├── word.service.ts    # Word-specific operations
└── index.ts          # Barrel export file
```

## Key Changes

### 1. Environment Variables
- API base URL is now configured via environment variable
- Add `NEXT_PUBLIC_API_BASE_URL` to your `.env.local` file

### 2. Centralized Error Handling
- New `APIError` class provides better error information
- Includes status codes and detailed error messages

### 3. Type Safety
- All types are now in `types/api.ts`
- Better TypeScript support with proper interfaces

## Migration Steps

### Step 1: Update Imports

#### Old Way:
```typescript
import { fetchCategories, fetchWordbooks, analyzeSentences } from "@/lib/api";
```

#### New Way:
```typescript
import { categoryService, wordbookService, extractionService } from "@/services";
```

### Step 2: Update Function Calls

#### Authentication
```typescript
// Old
await authRequest("/accounts/login/", { email, password });

// New
await authService.login(email, password);
```

#### Categories
```typescript
// Old
await fetchCategories();

// New
await categoryService.getCategories();
```

#### Wordbooks
```typescript
// Old
await fetchWordbooks();
await fetchWordbooksDetail(id);
await saveWordbook(data);
await deleteWordbook(id);

// New
await wordbookService.getWordbooks();
await wordbookService.getWordbook(id);
await wordbookService.saveWordbook(data);
await wordbookService.deleteWordbook(id);
```

#### Text Extraction
```typescript
// Old
await extractTextFromImage(file);
await sentenceSplit(text);
await analyzeSentences(sentences, language);

// New
await extractionService.extractTextFromImage(file);
await extractionService.splitSentences(text);
await extractionService.analyzeSentences(sentences, language);
```

### Step 3: Update Error Handling

```typescript
// Old
try {
  const data = await fetchCategories();
} catch (error) {
  console.error(error.message);
}

// New
import { APIError } from "@/services";

try {
  const data = await categoryService.getCategories();
} catch (error) {
  if (error instanceof APIError) {
    console.error(`Error ${error.status}: ${error.message}`);
  }
}
```

### Step 4: Update React Query Hooks

```typescript
// Old
import { fetchWordbooks } from "@/lib/api";

export const useWordbooks = () => {
  return useQuery({
    queryKey: ["wordbooks"],
    queryFn: fetchWordbooks,
  });
};

// New
import { wordbookService } from "@/services";

export const useWordbooks = () => {
  return useQuery({
    queryKey: ["wordbooks"],
    queryFn: () => wordbookService.getWordbooks(),
  });
};
```

## Type Updates

### Import Types Separately
```typescript
// Old (types were inline in components)
interface Category {
  id: number;
  name: string;
  // ...
}

// New
import type { Category, Wordbook, User } from "@/types/api";
```

### Updated SaveWordbook Payload
```typescript
// Old
{
  wordbook_name: string;
  wordbook_category: string;
  wordbook_language: string;
  input_type: string;
  selected: Array<...>;
}

// New
{
  name: string;
  category?: number;
  language: string;
  input_type: "image" | "text";
  sentences: Array<...>;
}
```

## Benefits of the New Architecture

1. **Better Organization**: Each service handles a specific domain
2. **Improved Maintainability**: Easier to find and update specific APIs
3. **Enhanced Type Safety**: Centralized types prevent duplication
4. **Consistent Error Handling**: APIError class provides better debugging
5. **Environment Configuration**: Easy to switch between dev/staging/prod
6. **Cleaner Imports**: Import only what you need

## Deprecation Notice

The old `lib/api.ts` file is now deprecated. Please migrate to the new service modules as soon as possible.
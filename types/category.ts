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

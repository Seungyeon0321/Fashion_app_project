export interface RegisterClosetItemDto {
  clothingItemId: number;
  category: string;
  subCategory: string;
  brand?: string;
  colors?: string[];
  memo?: string;
}

export interface UpdateClosetItemDto {
  subCategory?: string;
  category?: string;
  brand?: string;
  colors?: string[];
  memo?: string;
  isFavorite?: boolean;
}

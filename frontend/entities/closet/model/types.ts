export interface ClosetItem {
  id: number;
  userId: number;
  clothingItemId: number | null;
  cropS3Key: string | null;
  category: string;
  subCategory: string;
  brand: string | null;
  colors: string[];
  memo: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  isWashing: boolean;
  wearCount: number;
  createdAt: string;
  updatedAt: string;
}

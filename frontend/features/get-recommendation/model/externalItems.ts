// features/get-recommendation/model/externalItems.ts
//
// MVP: mock 데이터
// 실제 연동 시 getExternalItemsByIntent() 함수만 교체
// → 네이버 쇼핑 API: GET https://openapi.naver.com/v1/search/shop.json?query={intent}

export type ExternalItem = {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  purchaseUrl: string;  // 나중에 affiliate 파라미터 추가 위치
  category: string;
  intent: 'formal' | 'casual' | 'sports';
};

const MOCK_EXTERNAL_ITEMS: ExternalItem[] = [
  {
    id: 'ext_001',
    name: 'Slim Wool Blazer',
    brand: 'Musinsa Standard',
    price: 89000,
    imageUrl: 'https://via.placeholder.com/300x400/1a1a1a/ffffff?text=Blazer',
    purchaseUrl: 'https://www.musinsa.com/search/goods?q=slim+wool+blazer',
    category: 'OUTER',
    intent: 'formal',
  },
  {
    id: 'ext_002',
    name: 'Tapered Dress Pants',
    brand: 'Weekday',
    price: 65000,
    imageUrl: 'https://via.placeholder.com/300x400/2a2a2a/ffffff?text=Pants',
    purchaseUrl: 'https://www.musinsa.com/search/goods?q=tapered+dress+pants',
    category: 'BOTTOMS',
    intent: 'formal',
  },
  {
    id: 'ext_003',
    name: 'Relaxed Linen Shirt',
    brand: 'COS',
    price: 72000,
    imageUrl: 'https://via.placeholder.com/300x400/d4c5b0/1a1a1a?text=Linen',
    purchaseUrl: 'https://www.musinsa.com/search/goods?q=relaxed+linen+shirt',
    category: 'TOP',
    intent: 'casual',
  },
  {
    id: 'ext_004',
    name: 'Wide Chino Pants',
    brand: 'Dickies',
    price: 58000,
    imageUrl: 'https://via.placeholder.com/300x400/b5a898/1a1a1a?text=Chino',
    purchaseUrl: 'https://www.musinsa.com/search/goods?q=wide+chino',
    category: 'BOTTOMS',
    intent: 'casual',
  },
  {
    id: 'ext_005',
    name: 'Performance Running Jacket',
    brand: 'Nike',
    price: 119000,
    imageUrl: 'https://via.placeholder.com/300x400/1a1a1a/ffffff?text=Jacket',
    purchaseUrl: 'https://www.musinsa.com/search/goods?q=running+jacket',
    category: 'OUTER',
    intent: 'sports',
  },
  {
    id: 'ext_006',
    name: 'Compression Shorts',
    brand: 'Under Armour',
    price: 39000,
    imageUrl: 'https://via.placeholder.com/300x400/2a2a2a/ffffff?text=Shorts',
    purchaseUrl: 'https://www.musinsa.com/search/goods?q=compression+shorts',
    category: 'BOTTOMS',
    intent: 'sports',
  },
];

export function getExternalItemsByIntent(intent: string): ExternalItem[] {
  return MOCK_EXTERNAL_ITEMS.filter((item) => item.intent === intent);
}
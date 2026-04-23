export enum Category {
    TOP = 'TOP',
    BOTTOM = 'BOTTOM',
    OUTER = 'OUTER',
    DRESS = 'DRESS',
    SHOES = 'SHOES',
    BAG = 'BAG',
    ACC = 'ACC',
  }
  
  export enum SubCategory {
    T_SHIRT_SHORT = 'T_SHIRT_SHORT',
    T_SHIRT_LONG = 'T_SHIRT_LONG',
    SHIRT = 'SHIRT',
    KNIT = 'KNIT',
    SWEATSHIRT = 'SWEATSHIRT',
    HOODIE = 'HOODIE',
    VEST = 'VEST',
    CARDIGAN = 'CARDIGAN',
    WINDBREAKER = 'WINDBREAKER',
    JACKET = 'JACKET',
    COAT = 'COAT',
    PADDED_LIGHT = 'PADDED_LIGHT',
    PADDED_HEAVY = 'PADDED_HEAVY',
    DENIM = 'DENIM',
    SLACKS = 'SLACKS',
    COTTON_PANTS = 'COTTON_PANTS',
    SWEATPANTS = 'SWEATPANTS',
    SHORTS = 'SHORTS',
    SKIRT = 'SKIRT',
  }
  
  export const SUBCATEGORY_BY_CATEGORY: Record<Category, SubCategory[]> = {
    [Category.TOP]: [
      SubCategory.T_SHIRT_SHORT, SubCategory.T_SHIRT_LONG,
      SubCategory.SHIRT, SubCategory.KNIT,
      SubCategory.SWEATSHIRT, SubCategory.HOODIE, SubCategory.VEST,
    ],
    [Category.OUTER]: [
      SubCategory.CARDIGAN, SubCategory.WINDBREAKER, SubCategory.JACKET,
      SubCategory.COAT, SubCategory.PADDED_LIGHT, SubCategory.PADDED_HEAVY,
    ],
    [Category.BOTTOM]: [
      SubCategory.DENIM, SubCategory.SLACKS, SubCategory.COTTON_PANTS,
      SubCategory.SWEATPANTS, SubCategory.SHORTS, SubCategory.SKIRT,
    ],
    [Category.DRESS]: [],
    [Category.SHOES]: [],
    [Category.BAG]: [],
    [Category.ACC]: [],
  }
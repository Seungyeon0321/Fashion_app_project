// app/(tabs)/index.tsx
import { useState } from 'react';
import { HomePage } from '@/pages/home/ui/HomePage';

export default function HomeTab() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  return (
    <HomePage
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
    />
  );
}

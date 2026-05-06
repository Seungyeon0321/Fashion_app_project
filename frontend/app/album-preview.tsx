// app/album-preview.tsx
import { useLocalSearchParams } from 'expo-router';
import { AlbumPreviewPage

 } from '@/pages/album-preview/ui/AlbumPreviewPage';
export default function AlbumPreviewRoute() {
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  return <AlbumPreviewPage imageUri={imageUri} />;
}
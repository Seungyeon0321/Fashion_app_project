// features/select-registration-method/model/registrationMethods.ts

export type RegistrationMethodId = 'camera' | 'library' | 'purchase';

export interface RegistrationMethod {
  id: RegistrationMethodId;
  title: string;
  subtitle: string;
  icon: string; // Expo vector icon name
  image: any; // require() image or URL
  enabled: boolean;
  badge?: string;
}

export const REGISTRATION_METHODS: RegistrationMethod[] = [
  {
    id: 'camera',
    title: 'TAKE PHOTO',
    subtitle: 'Capture a new item in real-time',
    icon: 'camera',
    image: "https://my-fashion-app-media.s3.ca-central-1.amazonaws.com/takePhoto.png", // 카메라 이미지 (삼각대 위 카메라)
    enabled: true,
  },
  {
    id: 'library',
    title: 'CHOOSE FROM LIBRARY',
    subtitle: 'Pick from your existing gallery',
    icon: 'image',
    image: "https://my-fashion-app-media.s3.ca-central-1.amazonaws.com/library.png", // 옷장 이미지
    enabled: true,
  },
  {
    id: 'purchase',
    title: 'IMPORT FROM PURCHASE',
    subtitle: 'Sync your online order history',
    icon: 'shopping-bag',
    image: null, // 쇼핑백 이미지
    enabled: false,
    badge: 'COMING SOON',
  },
];

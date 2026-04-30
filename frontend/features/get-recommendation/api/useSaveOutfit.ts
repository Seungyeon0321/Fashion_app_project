import { useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

interface OutfitItemPayload {
    closetItemId: number;
}

interface CreateOutfitPayload {
    items: OutfitItemPayload[];
    recordedTemp?: number;
    recordedWeather?: string;
}

export const useSaveOutfit = () => {
    return useMutation<void, Error, CreateOutfitPayload>({
        mutationFn: (payload: CreateOutfitPayload) =>
            api.post('/outfits', payload),
    });
}
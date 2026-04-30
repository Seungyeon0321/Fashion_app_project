import { useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

export type Intent = 'formal' | 'casual' | 'sports';

export type RecommendationResponse = {
  intent: string;
  weather: string;
  calendar_events: string[];
  ranked_items: {
    id: number;
    imageUrl: string;
    category: string;
    style: string;
    season: string;
  }[];
  final_response: string;
};

export function useRecommendation() {
  return useMutation<RecommendationResponse, Error, Intent>({
    mutationFn: (intent: Intent) =>
      api.post('/style/recommend', {
        user_message: intent,
        intent,
        excluded_items: [],
      }).then(r => r.data),
  });
}
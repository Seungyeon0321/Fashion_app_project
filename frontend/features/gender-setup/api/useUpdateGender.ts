// features/gender-setup/api/useUpdateGender.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

type Gender = 'MALE' | 'FEMALE' | 'UNISEX';
type Profile = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  gender: Gender | null;
};

const updateGender = async (gender: Gender): Promise<void> => {
  await api.patch('/users/me/gender', { gender });
};

export function useUpdateGender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateGender,

    // ── CONFIRM 클릭 즉시 캐시 업데이트 ──────────────────────
    onMutate: async (gender) => {
      // 진행 중인 profile 요청 취소 (덮어쓰기 방지)
      await queryClient.cancelQueries({ queryKey: ['profile'] });

      // 현재 캐시 백업 (실패 시 rollback용)
      const previous = queryClient.getQueryData<Profile>(['profile']);

      // 즉시 캐시 업데이트
      queryClient.setQueryData<Profile>(['profile'], (old) =>
        old ? { ...old, gender } : old
      );

      return { previous };
    },

    // ── 실패 시 rollback ──────────────────────────────────────
    onError: (_err, _gender, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['profile'], context.previous);
      }
    },

    // ── 성공/실패 모두 서버 데이터로 최종 동기화 ──────────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
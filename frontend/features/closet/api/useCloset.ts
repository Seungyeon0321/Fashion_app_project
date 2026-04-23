// features/closet/api/useCloset.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClosetItem } from '@/entities/closet/model/types';
import { api } from '@/shared/lib/api';
import { RegisterClosetItemDto, UpdateClosetItemDto } from './types';

// ── Query Keys ─────────────────────────────────────────────
// 한 곳에서 관리 — 나중에 invalidate할 때 일관성 유지
export const closetKeys = {
  all:    ['closet']              as const,
  lists:  ['closet', 'list']      as const,
  detail: (id: number) => ['closet', 'detail', id] as const,
};

// ── GET /closet ─────────────────────────────────────────────
export function useClosetItems() {
  return useQuery({
    queryKey: closetKeys.lists,
    queryFn: async () => {
      const res = await api.get<ClosetItem[]>('/closet');
      return res.data;
    },
  });
}

// ── POST /closet/register ───────────────────────────────────
export function useRegisterClosetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: RegisterClosetItemDto) => {
      const res = await api.post<ClosetItem>('/closet/register', dto);
      return res.data;
    },
    // 등록 성공 시 목록 캐시 무효화 → 자동 리패치
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closetKeys.lists });
    },
  });
}

// ── PATCH /closet/:id ───────────────────────────────────────
export function useUpdateClosetItem(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateClosetItemDto) => {
      const res = await api.patch<ClosetItem>(`/closet/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closetKeys.lists });
    },
  });
}

// ── PATCH /closet/:id/archive ───────────────────────────────
export function useArchiveClosetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch<ClosetItem>(`/closet/${id}/archive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closetKeys.lists });
    },
  });
}

// ── DELETE /closet/:id ──────────────────────────────────────
export function useDeleteClosetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/closet/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closetKeys.lists });
    },
  });
}

// ── PATCH /closet/:id/favorite ───────────────────────────────
export function useToggleFavorite(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    // mutate 호출 시 newValue를 변수로 받음
    mutationFn: async (newValue: boolean) => {
      const res = await api.patch<ClosetItem>(`/closet/${id}`, {
        isFavorite: newValue,
      });
      return res.data;
    },

    onMutate: async (newValue: boolean) => {
      await queryClient.cancelQueries({ queryKey: closetKeys.lists });

      const previousItems = queryClient.getQueryData<ClosetItem[]>(closetKeys.lists);

      queryClient.setQueryData<ClosetItem[]>(closetKeys.lists, (old) =>
        old?.map((item) =>
          item.id === id ? { ...item, isFavorite: newValue } : item
        )
      );

      return { previousItems };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(closetKeys.lists, context.previousItems);
      }
    },
  });
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as storage from '../services/storageService';

export function useUserData() {
  const queryClient = useQueryClient();

  const { data: userData, isLoading } = useQuery({
    queryKey: ['userData'],
    queryFn: storage.fetchUserData,
  });

  // Listen for storage changes and invalidate query
  useEffect(() => {
    const handleStorageChange = () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

  const updateProfileMutation = useMutation({
    mutationFn: storage.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: storage.updateRequirementProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
  });

  const batchUpdateProgressMutation = useMutation({
    mutationFn: storage.batchUpdateRequirementProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
  });

  const updateAIPlanMutation = useMutation({
    mutationFn: ({ plan, chatHistory }: { plan: string; chatHistory: any[] }) =>
      storage.updateAIPlan(plan, chatHistory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
  });

  const addChatMessageMutation = useMutation({
    mutationFn: storage.addChatMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
  });

  const clearChatHistoryMutation = useMutation({
    mutationFn: storage.clearChatHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
  });

  return {
    userData,
    isLoading,
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    updateProgress: updateProgressMutation.mutate,
    batchUpdateProgress: batchUpdateProgressMutation.mutate,
    updateAIPlan: (plan: string, chatHistory: any[]) =>
      updateAIPlanMutation.mutateAsync({ plan, chatHistory }),
    addChatMessage: (message: any) => addChatMessageMutation.mutateAsync(message),
    clearChatHistory: () => clearChatHistoryMutation.mutateAsync(),
    isUpdatingProfile: updateProfileMutation.isPending,
    isUpdatingProgress: updateProgressMutation.isPending,
  };
}

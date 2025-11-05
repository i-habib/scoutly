import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as storage from '../services/storageService';

export function useUserData() {
  const queryClient = useQueryClient();

  const { data: userData, isLoading } = useQuery({
    queryKey: ['userData'],
    queryFn: storage.fetchUserData,
  });

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

  return {
    userData,
    isLoading,
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    updateProgress: updateProgressMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,
    isUpdatingProgress: updateProgressMutation.isPending,
  };
}

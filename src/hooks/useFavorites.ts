import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFavorites, toggleFavorite } from "@/lib/tauri";
import { toast } from "sonner";

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: getFavorites,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articleId: string) => toggleFavorite(articleId),
    onSuccess: (isNowFavorite, articleId) => {
      // Optimistically update every cached article list that contains this id
      queryClient.setQueriesData<{ id: string; is_favorite: boolean }[]>(
        { predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "articles" },
        (old) =>
          old?.map((a) =>
            a.id === articleId ? { ...a, is_favorite: isNowFavorite } : a
          )
      );
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(isNowFavorite ? "Added to favorites" : "Removed from favorites");
    },
    onError: (err: Error) => {
      toast.error(`Failed: ${err.message}`);
    },
  });
}

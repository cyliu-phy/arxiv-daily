import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFeed,
  getArticles,
  searchArticles,
  type Article,
  type ArticleTab,
} from "@/lib/tauri";
import type { UITab } from "@/store/useAppStore";
import { toast } from "sonner";

/** Only fires for "recent" | "all" — caller must skip when tab === "bookmarks". */
export function useArticles(category: string | null, tab: UITab) {
  const backendTab: ArticleTab = tab === "bookmarks" ? "all" : tab;
  return useQuery<Article[]>({
    queryKey: ["articles", category, backendTab],
    queryFn: () => getArticles(category!, backendTab),
    enabled: !!category && tab !== "bookmarks",
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchArticles(query: string) {
  return useQuery<Article[]>({
    queryKey: ["search", query],
    queryFn: () => searchArticles(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useFetchFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category: string) => fetchFeed(category),
    onSuccess: (_, category) => {
      queryClient.invalidateQueries({ queryKey: ["articles", category] });
      toast.success(`Synced ${category}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Sync failed: ${msg}`);
    },
  });
}

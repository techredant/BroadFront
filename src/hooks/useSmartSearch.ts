import { useCallback, useState } from "react";
import { aiSearch, AISearchResult } from "@/services/aiSearchApi";

export function useSmartSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AISearchResult[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);

  const search = useCallback(async (input: {
    q: string;
    type?: string;
    county?: string;
    userId?: string;
    mode?: "results" | "answer";
  }) => {
    setLoading(true);
    try {
      const data = await aiSearch(input);
      setResults(data.results);
      setAnswer(data.answer || null);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { answer, loading, results, search };
}

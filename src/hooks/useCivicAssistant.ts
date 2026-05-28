import { useCallback, useState } from "react";
import { askCivicAssistant, CivicAnswer } from "@/services/aiApi";

export function useCivicAssistant() {
  const [loading, setLoading] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<CivicAnswer | null>(null);

  const ask = useCallback(async (input: {
    question: string;
    userId?: string;
    county?: string;
    language?: string;
  }) => {
    setLoading(true);
    try {
      const answer = await askCivicAssistant(input);
      setLastAnswer(answer);
      return answer;
    } finally {
      setLoading(false);
    }
  }, []);

  return { ask, lastAnswer, loading };
}

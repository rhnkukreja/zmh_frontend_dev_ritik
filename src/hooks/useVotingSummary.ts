import { useEffect, useState, useRef, useCallback } from "react";
import { dashboardService } from "@/services/dashboard";
import { baseURL } from "@/constant";

export default function useVotingSummary(ticker?: string, year?: string) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const inFlightRef = useRef<string | null>(null);

  const fetch = useCallback(async (t?: string, y?: string) => {
    if (!t) return;
    const key = `${t}:${y || ""}`;
    if (inFlightRef.current === key) return;
    inFlightRef.current = key;
    setLoading(true);
    setError(null);

    try {
      const url = `${baseURL}/voting_report_8k/?ticker=${t}${y ? `&year=${y}` : ""}`;
      const res = await dashboardService.fetchAGMSummaryDashboard(url);
      setData(res?.results ?? null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
      inFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (ticker) fetch(ticker, year);
  }, [ticker, year, fetch]);

  return { data, loading, error, refetch: fetch };
}

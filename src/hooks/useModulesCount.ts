import { useEffect, useState, useRef } from "react";
import { dashboardService } from "@/services/dashboard";

export default function useModulesCount(companyName?: string) {
  const [modulesData, setModulesData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const inFlightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!companyName) {
      setModulesData(null);
      return;
    }

    const key = String(companyName);
    if (inFlightRef.current === key) return; // avoid duplicate

    let mounted = true;
    inFlightRef.current = key;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await dashboardService.getModulesCount({
          global_search: companyName,
        });
        if (!mounted) return;
        setModulesData(res?.result ?? null);
      } catch (e) {
        if (!mounted) return;
        setError(e);
      } finally {
        if (!mounted) return;
        setLoading(false);
        inFlightRef.current = null;
      }
    })();

    return () => {
      mounted = false;
    };
  }, [companyName]);

  return { modulesData, loading, error };
}

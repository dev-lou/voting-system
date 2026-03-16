import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

/**
 * Monitors network connectivity with two layers:
 * 1. Browser's navigator.onLine + online/offline events (instant)
 * 2. Periodic Supabase health ping (catches silent drops)
 *
 * Returns { isOnline, lastChecked }
 */
export function useNetworkStatus(pingIntervalMs = 15_000) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkSupabase = useCallback(async () => {
    try {
      // Lightweight query — just checks if Supabase responds
      const { error } = await supabase
        .from("elections")
        .select("id")
        .limit(1)
        .maybeSingle();
      setIsOnline(error === null || error === undefined ? navigator.onLine : false);
    } catch {
      setIsOnline(false);
    }
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChecked(new Date());
    };
    const handleOffline = () => {
      setIsOnline(false);
      setLastChecked(new Date());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Start periodic pings
    checkSupabase();
    intervalRef.current = setInterval(checkSupabase, pingIntervalMs);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkSupabase, pingIntervalMs]);

  return { isOnline, lastChecked };
}

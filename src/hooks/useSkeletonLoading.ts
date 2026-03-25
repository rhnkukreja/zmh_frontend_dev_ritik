import { useState, useCallback } from "react";

interface UseSkeletonLoadingReturn {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  startLoading: () => void;
  stopLoading: () => void;
  toggle: () => void;
}

/**
 * Hook to manage skeleton loading state
 * Useful for controlling when to show skeleton vs actual content
 *
 * @param initialState - Initial loading state (default: true)
 * @returns Object with loading state and controls
 *
 * @example
 * const { isLoading, setIsLoading, startLoading, stopLoading } = useSkeletonLoading();
 *
 * useEffect(() => {
 *   fetchData().then(() => stopLoading());
 * }, []);
 *
 * return isLoading ? <SkeletonTable /> : <ActualTable />;
 */
export const useSkeletonLoading = (
  initialState: boolean = true
): UseSkeletonLoadingReturn => {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);
  const toggle = useCallback(() => setIsLoading((prev) => !prev), []);

  return {
    isLoading,
    setIsLoading,
    startLoading,
    stopLoading,
    toggle,
  };
};

export default useSkeletonLoading;

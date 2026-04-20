import { useNavigate, useLocation } from "react-router-dom";

/**
 * Custom hook to handle back navigation using location.state.from
 * to prevent recursive history loops.
 */
export const useNavigationHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = (fallbackRoute: string = "/investor-profile") => {
    if (location.state?.from) {
      // Restore the previous state (fromState) when going back
      navigate(location.state.from, { 
        state: location.state.fromState 
      });
    } else {
      navigate(fallbackRoute);
    }
  };

  return { handleBack, location };
};

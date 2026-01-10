import { useEffect } from "react";
import { useAppSelector } from "@/stores/hooks";

const HelpWidget = () => {
  const { user } = useAppSelector((state) => state.authentiction);

  useEffect(() => {
    // Only load the script if user is authenticated
    if (user?.token) {
      const scriptId = "help-ai-widget";
      
      // Check if script already exists
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://www.noupe.com/embed/019ad97d8b3772e19e79c9c10c3ec77371a9.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    // Cleanup function to remove the script when user logs out
    return () => {
      const script = document.getElementById("help-ai-widget");
      if (script) {
        script.remove();
      }
      // Also remove any widget elements that the script might have created
      const widgetElements = document.querySelectorAll('[id*="noupe"], [class*="noupe"]');
      widgetElements.forEach((el) => el.remove());
    };
  }, [user?.token]);

  return null;
};

export default HelpWidget;

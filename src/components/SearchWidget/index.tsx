import React, { useEffect } from "react";

const SearchWidget = () => {
  useEffect(() => {
    // Remove any existing Google AI script
    const existingGoogleScript = document.querySelector('script[src="https://cloud.google.com/ai/gen-app-builder/client?hl=en_US"]');
    if (existingGoogleScript) {
      existingGoogleScript.remove();
    }

    // Add the new script
    if (!document.querySelector('script[src="https://www.noupe.com/embed/019ad97d8b3772e19e79c9c10c3ec77371a9.js"]')) {
      const script = document.createElement("script");
      script.src = "https://www.noupe.com/embed/019ad97d8b3772e19e79c9c10c3ec77371a9.js";
      script.async = true;
      script.onload = () => {
        console.log('New embed script loaded successfully');
      };
      script.onerror = () => {
        console.error('Failed to load new embed script');
      };
      document.head.appendChild(script);
    }

    return () => {
      // Clean up script on unmount
      const script = document.querySelector('script[src="https://www.noupe.com/embed/019ad97d8b3772e19e79c9c10c3ec77371a9.js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-96 overflow-hidden">
      {/* The new embed will be injected by the script */}
    </div>
  );
};

export default SearchWidget;
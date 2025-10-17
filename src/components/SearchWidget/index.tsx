import React, { useEffect } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gen-search-widget': {
        configid?: string;
        location?: string;
        triggerid?: string;
        alwaysOpened?: boolean;
        children?: React.ReactNode;
      };
    }
  }
}

const SearchWidget = () => {
  useEffect(() => {
    if (!document.querySelector('script[src="https://cloud.google.com/ai/gen-app-builder/client?hl=en_US"]')) {
      const script = document.createElement("script");
      script.src = "https://cloud.google.com/ai/gen-app-builder/client?hl=en_US";
      script.async = true;
      script.onload = () => {
        console.log('Google AI Search Widget script loaded successfully');
      };
      script.onerror = () => {
        console.error('Failed to load Google AI Search Widget script');
      };
      document.head.appendChild(script);
    }

    // Add CSS to force the widget to stay within modal bounds
    const style = document.createElement('style');
    style.textContent = `
      /* Create a new stacking context for the modal */
      [role="dialog"] {
        isolation: isolate;
        position: relative;
        z-index: 50;
      }
      
      /* Force the search widget to be contained within the modal */
      gen-search-widget,
      .gen-search-widget,
      [data-testid="gen-search-widget"] {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        max-height: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
        z-index: 1 !important;
      }

      /* Contain any overlay within the modal */
      .gen-search-widget-overlay,
      .gen-search-overlay {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 1 !important;
      }

      /* Make sure the widget content is scrollable within bounds */
      .gen-search-widget iframe,
      .gen-search-widget [class*="content"] {
        max-height: 100% !important;
        overflow-y: auto !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-96 overflow-hidden">
      <gen-search-widget
        configid="d0779b69-98b9-4532-a6c9-d1b1f1b8a2d9"
        location="us"
        alwaysOpened>
      </gen-search-widget>
    </div>
  );
};

export default SearchWidget;
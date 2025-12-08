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

const SearchWidgetIframe = () => {
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

    // Add comprehensive CSS to contain the widget within modal bounds
    const style = document.createElement('style');
    style.textContent = `
      /* Prevent modal takeover by containing all widget content */
      .gen-search-widget-container {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
        isolation: isolate !important;
      }
      
      /* Force the search widget to be absolutely contained */
      .gen-search-widget-container gen-search-widget,
      .gen-search-widget-container .gen-search-widget,
      .gen-search-widget-container [data-testid="gen-search-widget"] {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
        z-index: 1 !important;
        contain: layout style paint !important;
      }

      /* Override any fixed/absolute positioning within the widget */
      .gen-search-widget-container * {
        position: relative !important;
        z-index: auto !important;
      }

      /* Specifically target any modal/overlay elements */
      .gen-search-widget-container [role="dialog"],
      .gen-search-widget-container [class*="modal"],
      .gen-search-widget-container [class*="overlay"],
      .gen-search-widget-container [style*="position: fixed"],
      .gen-search-widget-container [style*="position:fixed"] {
        position: absolute !important;
        max-height: 100% !important;
        max-width: 100% !important;
      }

      /* Ensure all content is scrollable within bounds */
      .gen-search-widget-container iframe,
      .gen-search-widget-container [class*="content"],
      .gen-search-widget-container [class*="dialog"],
      .gen-search-widget-container [class*="panel"] {
        max-height: 100% !important;
        overflow-y: auto !important;
        position: relative !important;
      }

      /* Hide reCAPTCHA badge */
      .grecaptcha-badge {
        display: none !important;
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
    <div className="gen-search-widget-container relative w-full h-full overflow-hidden bg-white">
      <gen-search-widget
        configid="d0779b69-98b9-4532-a6c9-d1b1f1b8a2d9"
        location="us"
        alwaysOpened>
      </gen-search-widget>
    </div>
  );
};

export default SearchWidgetIframe;
import React, { useEffect } from "react";

// TypeScript declarations for Google AI Search Widget already exist in Echo theme

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
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="mb-4">
      <div className="text-left mb-2">
        <h3 className="text-lg font-medium">Search with Google AI</h3>
        <p className="text-sm text-gray-600">Use Google's advanced search capabilities</p>
      </div>
      
      <input
        id="searchWidgetTrigger"
        placeholder="Search here with Google AI..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      <gen-search-widget
        configId="d0779b69-98b9-4532-a6c9-d1b1f1b8a2d9"
        location="us"
        triggerId="searchWidgetTrigger"
      />
    </div>
  );
};

export default SearchWidget;
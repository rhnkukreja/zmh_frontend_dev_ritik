import React from "react";
import SearchWidget from "../../components/SearchWidget";

const AISearchOnly: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto p-4">
        <SearchWidget />
      </div>
    </div>
  );
};

export default AISearchOnly;
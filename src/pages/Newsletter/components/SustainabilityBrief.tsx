import React from "react";
import NewsletterSection from "./NewsletterSection";

const SustainabilityBrief: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger }) => {
  return (
    <NewsletterSection 
      category="The Sustainability Brief" 
      title="The Sustainability Brief" 
      refreshTrigger={refreshTrigger} 
    />
  );
};

export default SustainabilityBrief;

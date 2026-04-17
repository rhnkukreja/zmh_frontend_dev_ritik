import React from "react";
import NewsletterSection from "./NewsletterSection";

const ProposalBrief: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger }) => {
  return (
    <NewsletterSection 
      category="Shareholder Proposal Brief" 
      title="Shareholder Proposal Brief" 
      refreshTrigger={refreshTrigger} 
    />
  );
};

export default ProposalBrief;

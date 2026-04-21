import React from "react";
import NewsletterSection from "./NewsletterSection";

const MonthlyActivismOverview: React.FC<{ refreshTrigger?: number }> = ({
  refreshTrigger,
}) => {
  return (
    <NewsletterSection
      category="Monthly Activism Overview"
      title="Monthly Activism Overview"
      refreshTrigger={refreshTrigger}
    />
  );
};

export default MonthlyActivismOverview;

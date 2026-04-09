import React from "react";
import BriefCard, { Brief } from "./BriefCard";

const activismBriefs: Brief[] = [
  {
    title: "Shareholder Activism Overview",
    date: "January 2026",
    url: "https://www.zmhadvisors.com/_files/ugd/e335a3_0e6ea89a0c5946449353c620e678ff29.pdf",
  },
  {
    title: "Shareholder Activism Overview",
    date: "February 2026",
    url: "https://www.zmhadvisors.com/_files/ugd/e335a3_de1ab97bfc314cdd9178cc2a6a688510.pdf",
  },
];

const ActivismOverview: React.FC = () => {
  return (
    <div className="flex flex-col gap-12 pb-12 bg-white dark:bg-darkmode-600 border border-gray-200 dark:border-darkmode-400 rounded-xl shadow-sm overflow-hidden p-7">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 py-1 leading-none">
            Monthly Activism Overview
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {activismBriefs.map((brief, idx) => (
            <BriefCard key={idx} brief={brief} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivismOverview;

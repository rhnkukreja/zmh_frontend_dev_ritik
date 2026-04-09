import React from "react";
import BriefCard, { Brief } from "./BriefCard";

const sustainabilityBriefs: Brief[] = [
  {
    title: "The Sustainability Brief",
    date: "January 2026",
    url: "https://www.zmhadvisors.com/_files/ugd/e335a3_ed7707f87bbd4467aef9273e4bfce7d3.pdf",
  },
  {
    title: "The Sustainability Brief",
    date: "February 2026",
    url: "https://www.zmhadvisors.com/_files/ugd/e335a3_5e8a3ef526be46e3a09a5a843f6cb7a1.pdf",
  },
  {
    title: "The Sustainability Brief",
    date: "March 2026",
    url: "https://www.zmhadvisors.com/_files/ugd/e335a3_d1c570a7677d43cbb54d99ed9819be08.pdf",
  },
];

const SustainabilityBrief: React.FC = () => {
  return (
    <div className="flex flex-col gap-12 pb-12 bg-white dark:bg-darkmode-600 border border-gray-200 dark:border-darkmode-400 rounded-xl shadow-sm overflow-hidden p-7">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 py-1 leading-none">
            The Sustainability Brief
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {sustainabilityBriefs.map((brief, idx) => (
            <BriefCard key={idx} brief={brief} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SustainabilityBrief;

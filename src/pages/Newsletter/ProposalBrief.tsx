import React from "react";
import BriefCard, { Brief } from "./BriefCard";

const proposalBriefs: Brief[] = [
  {
    title: "Shareholder Proposal Brief",
    date: "February 2026",
    url: "https://www.zmhadvisors.com/_files/ugd/e335a3_3bd318feffc5472290692fb7abd14128.pdf",
  },
  {
    title: "Shareholder Proposal Brief",
    date: "March 2026",
    url: "https://www.zmhadvisors.com/_files/ugd/e335a3_7f73386282b642e683c1fb9871a2c0d0.pdf",
  },
];

const ProposalBrief: React.FC = () => {
  return (
    <div className="flex flex-col gap-12 pb-12 bg-white dark:bg-darkmode-600 border border-gray-200 dark:border-darkmode-400 rounded-xl shadow-sm overflow-hidden p-7">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 py-1 leading-none">
            Shareholder Proposal Brief
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {proposalBriefs.map((brief, idx) => (
            <BriefCard key={idx} brief={brief} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProposalBrief;

import React from "react";
import Lucide from "@/components/Base/Lucide";

export interface Brief {
  title: string;
  date: string;
  url: string;
}

const BriefCard: React.FC<{ brief: Brief }> = ({ brief }) => {
  return (
    <div
      className="flex flex-col gap-4 group/brief cursor-pointer"
      onClick={() => window.open(brief.url, "_blank")}
    >
      <div className="text-base font-bold text-slate-800 dark:text-slate-300 ml-1">
        {brief.date}
      </div>
      <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-darkmode-400 bg-white dark:bg-darkmode-600 shadow-sm transition-all duration-300 group-hover/brief:shadow-xl group-hover/brief:-translate-y-2 aspect-[1.4/1]">
        {/* Document Cover Simulation */}
        <div className="absolute inset-0 flex flex-col p-6 border-l-[6px] border-primary">
          <div className="flex justify-between items-start">
            <div className="text-[10px] font-bold text-primary tracking-widest uppercase">
              ZMH Advisors
            </div>
            <Lucide icon="FileText" className="w-5 h-5 text-slate-300" />
          </div>
          <div className="flex-1 flex flex-col justify-center py-4">
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
              {brief.title}
            </h3>
            <div className="mt-2 h-0.5 w-12 bg-primary/40 rounded-full"></div>
            <p className="text-[14px] text-slate-500 mt-4 leading-relaxed line-clamp-3">
              Powered by ZMH's Proprietary Investor Intelligence Dashboard.
              Data-driven insights for the modern investor.
            </p>
          </div>
          <div className="mt-auto flex items-center justify-between text-[12px] text-slate-600 border-t border-slate-100 dark:border-darkmode-400 pt-3">
            <span>Data as of {brief.date}</span>
            <span className="text-primary font-bold group-hover/brief:underline">
              Read Brief →
            </span>
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/brief:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white dark:bg-darkmode-600 px-6 py-2.5 rounded-full shadow-lg text-primary font-bold text-sm transform translate-y-4 group-hover/brief:translate-y-0 transition-transform duration-300 border border-primary/20">
            View PDF
          </div>
        </div>
      </div>
    </div>
  );
};

export default BriefCard;

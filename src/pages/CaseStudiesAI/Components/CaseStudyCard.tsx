import React from "react";
import clsx from "clsx";
import { FaListUl } from "react-icons/fa";

interface CaseStudyCardProps {
  item: any;
  onClick: () => void;
}

const CaseStudyCard: React.FC<CaseStudyCardProps> = ({ item, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-lg flex flex-col h-full"
    >
      <div className="p-4 border-b flex justify-between items-start gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-slate-800 line-clamp-1">
            {item?.company_name || item?.caspio_company_name}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
            {item?.institution_name}
          </p>
        </div>
        <span className="shrink-0 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
          {item?.esg_themes?.split(",")?.[0] || "Uncategorized"}
        </span>
      </div>

      <div className="p-4 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-primary">
            <FaListUl size={12} />
          </span>
          <span className="text-md font-semibold text-slate-700 line-clamp-1">
            {item?.resolution_engagement_topic || "No Topic"}
          </span>
        </div>
        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
          {item?.voting_details || "No engagement details available."}
        </p>
      </div>

      <div className="p-3 bg-slate-50/50 flex items-center justify-between border-t mt-auto">
        <div
          className={clsx(
            "px-2.5 py-1 rounded-full text-[11px] font-bold",
            item?.vote?.toLowerCase()?.includes("for")
              ? "bg-success/10 text-success"
              : item?.vote?.toLowerCase()?.includes("against")
              ? "bg-danger/10 text-danger"
              : "bg-warning/10 text-warning"
          )}
        >
          {item?.vote || "Pending"}
        </div>
        <span className="text-xs font-mono text-slate-600">{item?.year}</span>
      </div>
    </div>
  );
};

export default CaseStudyCard;

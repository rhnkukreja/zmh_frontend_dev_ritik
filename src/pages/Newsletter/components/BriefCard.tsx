import React from "react";
import Lucide from "@/components/Base/Lucide";

export interface Brief {
  id?: number | string;
  title: string;
  date: string;
  url: string;
  month?: string;
  year?: string;
  category?: string;
}

interface BriefCardProps {
  brief: Brief;
  onEdit?: (brief: Brief) => void;
  onDelete?: (id: number | string) => void;
  onView?: (brief: Brief) => void;
}

const BriefCard: React.FC<BriefCardProps> = ({ brief, onEdit, onDelete, onView }) => {
  const canEdit = typeof onEdit === "function";
  const canDelete = typeof onDelete === "function";

  return (
    <div className="flex flex-col gap-4 group/brief relative">
      {/* Main Card Body */}
      <div 
        className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-darkmode-400 bg-white dark:bg-darkmode-600 shadow-sm transition-all duration-300 group-hover/brief:shadow-xl group-hover/brief:-translate-y-2 aspect-[1.4/1] cursor-pointer"
        onClick={() => onView && onView(brief)}
      >
        
        {/* Document Content */}
        <div 
          className="absolute inset-0 z-0 flex flex-col p-6 border-l-[6px] border-primary"
        >
          <div className="flex justify-between items-start">
            <div className="text-[10px] font-bold text-primary tracking-widest uppercase">
              ZMH Advisors
            </div>
            <Lucide icon="FileText" className="w-5 h-5 text-slate-300" />
          </div>
          
          <div className="flex-1 flex flex-col justify-center py-4">
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
              {brief.date} 
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
              View Report →
            </span>
          </div>
        </div>

        {/* Hover Overlay Visual (Optional) */}
        <div 
          className="absolute inset-0 bg-primary/5 opacity-0 group-hover/brief:opacity-100 transition-opacity duration-300 pointer-events-none"
        />

        {/* Action Buttons (Highest Z-Index) */}
        {(canEdit || canDelete) && (
          <div className="absolute top-4 right-6 flex items-center gap-2 z-[100]">
            {canEdit && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit && onEdit(brief);
                }}
                className="p-2 rounded-lg bg-white dark:bg-darkmode-600 text-slate-500 hover:text-primary transition-all opacity-0 group-hover/brief:opacity-100 shadow-md border border-slate-200 dark:border-darkmode-400 hover:scale-110 active:scale-95 cursor-pointer"
                title="Edit"
              >
                <Lucide icon="Pencil" className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (brief.id) onDelete && onDelete(brief.id);
                }}
                className="p-2 rounded-lg bg-white dark:bg-darkmode-600 text-slate-500 hover:text-danger transition-all opacity-0 group-hover/brief:opacity-100 shadow-md border border-slate-200 dark:border-darkmode-400 hover:scale-110 active:scale-95 cursor-pointer"
                title="Delete"
              >
                <Lucide icon="Trash2" className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BriefCard;

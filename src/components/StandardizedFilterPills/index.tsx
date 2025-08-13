import React from "react";
import { FaTimes } from "react-icons/fa";

interface FilterPill {
  key: string;
  value: string | number;
  label: string;
}

interface StandardizedFilterPillsProps {
  filters: FilterPill[];
  onRemove: (key: string, value: string | number) => void;
  className?: string;
}

const StandardizedFilterPills: React.FC<StandardizedFilterPillsProps> = ({ 
  filters, 
  onRemove, 
  className = "" 
}) => {
  if (!filters.length) return null;

  return (
    <div className={`mb-4 flex flex-wrap gap-2 ${className}`}>
      {filters.map((filter, idx) => (
        <span 
          key={idx} 
          className="flex items-center bg-primary/10 text-primary font-medium px-3 py-1 rounded-full shadow-sm transition-all hover:bg-primary/20"
        >
          {filter.label}
          <button
            type="button"
            className="ml-2 text-primary hover:text-red-600 transition-colors"
            onClick={() => onRemove(filter.key, filter.value)}
          >
            <FaTimes className="text-xs" />
          </button>
        </span>
      ))}
    </div>
  );
};

export default StandardizedFilterPills;
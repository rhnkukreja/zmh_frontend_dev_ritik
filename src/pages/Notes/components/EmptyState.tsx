import React from "react";
import Lucide from "@/components/Base/Lucide";

interface EmptyStateProps {
  icon: string;
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({  message }) => {
  return (
    <div className={`flex items-center justify-center h-full flex-col w-full`}>
       <Lucide
                  icon="NotebookPen"
                  className="text-gray-200 stroke-[1.3] w-[20%] h-[20%] ml-2 cursor-pointer"
                />
      
      <p className={`text-gray-400 text-xl`}>{message}</p>
    </div>
  );
};

export default EmptyState;

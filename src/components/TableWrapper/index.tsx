import React from "react";
import LoadingIcon from "@/components/Base/LoadingIcon";

interface TableWrapperProps {
  isLoading?: boolean;
  children: React.ReactNode;
}

const TableWrapper: React.FC<TableWrapperProps> = ({ isLoading, children }) => {
  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-35 flex justify-center items-center z-10">
          <div className="flex flex-col items-center justify-end">
            <LoadingIcon icon="tail-spin" className="w-8 h-8" />
            <div className="mt-2 text-xs text-center text-gray-700 font-semibold">
              Loading...
            </div>
          </div>
        </div>
      )}
      <div className="overflow-auto  relative z-0">{children}</div>
    </div>
  );
};

export default TableWrapper;

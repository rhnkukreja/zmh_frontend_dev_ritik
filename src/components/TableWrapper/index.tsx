import React from "react";
import { SkeletonTable } from "@/components/Base/Skeletons";

interface TableWrapperProps {
  isLoading?: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  rows?: number;
  columns?: number;
}

const TableWrapper: React.FC<TableWrapperProps> = ({
  isLoading,
  children,
  skeleton,
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="relative">
      {isLoading ? (
        skeleton || (
          <div className="p-5 bg-white">
            <SkeletonTable rows={rows} columns={columns} />
          </div>
        )
      ) : (
        <div className="overflow-auto relative z-0">{children}</div>
      )}
    </div>
  );
};

export default TableWrapper;

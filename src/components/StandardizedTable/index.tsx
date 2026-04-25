import React from "react";
import Table from "@/components/Base/Table";
import clsx from "clsx";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';

interface StandardizedTableProps {
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  skeletonRows?: number;
  skeletonCols?: number;
}

interface StandardizedTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface StandardizedTableRowProps {
  children: React.ReactNode;
  className?: string;
  isZebraStriped?: boolean;
  index?: number;
  customStyle?: React.CSSProperties;
}

interface StandardizedTableCellProps {
  children: React.ReactNode;
  className?: string;
  width?: string;
  isHeader?: boolean;
  colSpan?: number;
}

const StandardizedTable: React.FC<StandardizedTableProps> & {
  Header: React.FC<StandardizedTableHeaderProps>;
  Row: React.FC<StandardizedTableRowProps>;
  Cell: React.FC<StandardizedTableCellProps>;
  LoadingSkeleton: React.FC<{ rows?: number; cols?: number }>;
} = ({
  isLoading = false,
  children,
  className = "",
  maxHeight = "60vh",
  skeletonRows = 8,
  skeletonCols = 6,
}) => {
  // Extract header component to display it even during loading
  const header = React.Children.toArray(children).find(
    (child) =>
      React.isValidElement(child) &&
      (child.type === StandardizedTableHeader ||
        (child.type as any).displayName === "StandardizedTableHeader")
  );

  return (
    <div
      className={clsx(
        "overflow-x-auto overflow-y-scroll bg-white rounded-md border border-slate-200 shadow-sm",
        className
      )}
      style={{ maxHeight }}
    >
      <Table className="w-full border-collapse">
        {isLoading ? (
          <>
            {header}
            <StandardizedTable.LoadingSkeleton
              rows={skeletonRows}
              cols={skeletonCols}
            />
          </>
        ) : (
          children
        )}
      </Table>
    </div>
  );
};

const StandardizedTableHeader: React.FC<StandardizedTableHeaderProps> = ({
  children,
  className = "",
}) => {
  return (
    <Table.Thead>
      <Table.Tr
        className={clsx("bg-primary text-white text-sm sticky top-0 z-10", className)}
      >
        {children}
      </Table.Tr>
    </Table.Thead>
  );
};
StandardizedTableHeader.displayName = "StandardizedTableHeader";

const StandardizedTableRow: React.FC<StandardizedTableRowProps> = ({
  children,
  className = "",
  isZebraStriped = true,
  index = 0,
  customStyle = {}
}) => {
  const zebraClass = isZebraStriped
    ? (index % 2 === 0 ? "bg-white" : "bg-slate-50/70")
    : "";

  return (
    <Table.Tr
      className={clsx(
        "border-b border-slate-200 dark:border-slate-600 transition-all hover:bg-primary/5 cursor-pointer",
        zebraClass,
        className
      )}
      style={customStyle}
    >
      {children}
    </Table.Tr>
  );
};

const StandardizedTableCell: React.FC<StandardizedTableCellProps> = ({
  children,
  className = "",
  width,
  isHeader = false,
  colSpan,
}) => {
  const baseClasses = isHeader
    ? "py-2 px-3 font-medium text-white h-[40px]"
    : "py-2 px-3 text-gray-700";

  const fontStyle = { fontSize: "14px" };

  const style = width ? { width, ...fontStyle } : fontStyle;

  return (
    <Table.Td className={clsx(baseClasses, className)} style={style} colSpan={colSpan}>
      {children}
    </Table.Td>
  );
};

const LoadingSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 8,
  cols = 6,
}) => {
  return (
    <Table.Tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <Table.Tr
          key={i}
          className={clsx(
            "border-b border-slate-100",
            i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
          )}
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Table.Td key={j} className="py-4 px-3">
              <div
                className="h-4 bg-gray-200 rounded animate-pulse"
                style={{
                  width: `${60 + (Math.sin(i + j) * 20 + 20)}%`, // Varied widths for realistic look
                  opacity: 0.5,
                }}
              />
            </Table.Td>
          ))}
        </Table.Tr>
      ))}
    </Table.Tbody>
  );
};

StandardizedTable.Header = StandardizedTableHeader;
StandardizedTable.Row = StandardizedTableRow;
StandardizedTable.Cell = StandardizedTableCell;
StandardizedTable.LoadingSkeleton = LoadingSkeleton;

export default StandardizedTable;
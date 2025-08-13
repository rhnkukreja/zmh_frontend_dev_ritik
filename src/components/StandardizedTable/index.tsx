import React from "react";
import Table from "@/components/Base/Table";
import TableWrapper from "@/components/TableWrapper";
import clsx from "clsx";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';

interface StandardizedTableProps {
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
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
}

const StandardizedTable: React.FC<StandardizedTableProps> & {
  Header: React.FC<StandardizedTableHeaderProps>;
  Row: React.FC<StandardizedTableRowProps>;
  Cell: React.FC<StandardizedTableCellProps>;
  LoadingSkeleton: React.FC<{ rows?: number; cols?: number }>;
} = ({ isLoading = false, children, className = "", maxHeight = "60vh" }) => {
  return (
    <TableWrapper isLoading={isLoading}>
      <div className={clsx("overflow-x-auto overflow-y-scroll bg-white rounded-md", `max-h-[${maxHeight}]`)}>
        <Table className={clsx("w-full", className)}>
          {children}
        </Table>
      </div>
    </TableWrapper>
  );
};

const StandardizedTableHeader: React.FC<StandardizedTableHeaderProps> = ({
  children,
  className = ""
}) => {
  return (
    <Table.Thead>
      <Table.Tr className={clsx(
        "bg-primary text-white text-sm",
        className
      )}>
        {children}
      </Table.Tr>
    </Table.Thead>
  );
};

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
        "[&_td]:last:border-b-0 transition-all hover:bg-primary/5 cursor-pointer",
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
  isHeader = false
}) => {
  const baseClasses = isHeader
    ? "py-2 font-medium text-white h-[40px]"
    : "py-2 text-gray-700";

  const style = width ? { width } : {};

  return (
    <Table.Td
      className={clsx(baseClasses, className)}
      style={style}
    >
      {children}
    </Table.Td>
  );
};

const LoadingSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 8,
  cols = 6
}) => {
  return (
    <Table.Tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <Table.Tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <Table.Td key={j}>
              <Skeleton height={24} />
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
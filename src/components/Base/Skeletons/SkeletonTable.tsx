import React from "react";

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
  headerHeight?: string;
  cellHeight?: string;
}

/**
 * Skeleton loading component for table content
 * Shows table structure with header and rows with shimmer effect
 */
const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  className = "",
  headerHeight = "h-12",
  cellHeight = "h-7",
}) => {
  const shimmerStyle: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
    backgroundSize: "200% 100%",
    backgroundRepeat: "no-repeat",
    animation: "shimmer 1.5s infinite",
  };

  const headerWidths = [90, 72, 84, 66, 78, 70, 82, 99];
  const cellWidths = [86, 68, 80, 62, 74, 90, 58, 76, 70, 84];

  const getHeaderWidth = (colIdx: number) => {
    return `${headerWidths[colIdx % headerWidths.length]}%`;
  };

  const getCellWidth = (rowIdx: number, colIdx: number) => {
    const index = (rowIdx + colIdx) % cellWidths.length;
    return `${cellWidths[index]}%`;
  };

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <th key={colIdx} className="p-4 text-left">
                <div
                  className={`${headerHeight} bg-gray-200 dark:bg-gray-700 rounded animate-shimmer`}
                  style={{ ...shimmerStyle, width: getHeaderWidth(colIdx) }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-gray-100 dark:border-gray-700"
            >
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="p-4">
                  <div
                    className={`${cellHeight} bg-gray-200 dark:bg-gray-700 rounded animate-shimmer`}
                    style={{ ...shimmerStyle, width: getCellWidth(rowIdx, colIdx) }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SkeletonTable;

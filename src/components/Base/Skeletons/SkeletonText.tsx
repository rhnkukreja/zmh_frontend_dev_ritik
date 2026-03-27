import React from "react";

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  height?: string;
  gap?: string;
}

/**
 * Skeleton loading component for text content
 * Shows multiple lines with shimmer effect
 */
const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className = "",
  height = "h-4",
  gap = "gap-2",
}) => {
  const shimmerStyle: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
    backgroundSize: "200% 100%",
    backgroundRepeat: "no-repeat",
    animation: "shimmer 1.5s infinite",
  };

  return (
    <div className={`space-y-${gap.split("-")[1] || "2"} ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gray-200 dark:bg-gray-700 rounded animate-shimmer`}
          style={shimmerStyle}
        />
      ))}
    </div>
  );
};

export default SkeletonText;

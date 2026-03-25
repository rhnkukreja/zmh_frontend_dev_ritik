import React from "react";

interface SkeletonCardProps {
  className?: string;
  hasImage?: boolean;
  hasAvatar?: boolean;
  lines?: number;
}

/**
 * Skeleton loading component for card content
 * Shows header, image/avatar, and content lines with shimmer effect
 */
const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className = "",
  hasImage = true,
  hasAvatar = false,
  lines = 3,
}) => {
  const shimmerStyle: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
    backgroundSize: "200% 100%",
    backgroundRepeat: "no-repeat",
    animation: "shimmer 1.5s infinite",
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4 ${className}`}
    >
      {/* Header with optional avatar */}
      <div className="flex items-center space-x-3">
        {hasAvatar && (
          <div
            className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer"
            style={shimmerStyle}
          />
        )}
        <div className="flex-1 space-y-2">
          <div
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-shimmer"
            style={shimmerStyle}
          />
          <div
            className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-shimmer"
            style={shimmerStyle}
          />
        </div>
      </div>

      {/* Image */}
      {hasImage && (
        <div
          className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
          style={shimmerStyle}
        />
      )}

      {/* Content lines */}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer ${
              i === lines - 1 ? "w-3/4" : "w-full"
            }`}
            style={shimmerStyle}
          />
        ))}
      </div>

      {/* Footer action buttons */}
      <div className="flex space-x-2 pt-2">
        <div
          className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
          style={shimmerStyle}
        />
        <div
          className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
          style={shimmerStyle}
        />
      </div>
    </div>
  );
};

export default SkeletonCard;

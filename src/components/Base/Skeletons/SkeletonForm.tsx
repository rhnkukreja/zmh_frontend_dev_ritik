import React from "react";

interface SkeletonFormProps {
  fields?: number;
  className?: string;
  hasButton?: boolean;
}

/**
 * Skeleton loading component for form content
 * Shows form fields with labels and button with shimmer effect
 */
const SkeletonForm: React.FC<SkeletonFormProps> = ({
  fields = 4,
  className = "",
  hasButton = true,
}) => {
  const shimmerStyle: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
    backgroundSize: "200% 100%",
    backgroundRepeat: "no-repeat",
    animation: "shimmer 1.5s infinite",
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {Array.from({ length: fields }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          {/* Label */}
          <div
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-shimmer"
            style={shimmerStyle}
          />
          {/* Input field */}
          <div
            className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
            style={shimmerStyle}
          />
        </div>
      ))}

      {hasButton && (
        <div className="flex space-x-3 pt-4">
          <div
            className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
            style={shimmerStyle}
          />
          <div
            className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
            style={shimmerStyle}
          />
        </div>
      )}
    </div>
  );
};

export default SkeletonForm;

import React from "react";

interface SkeletonImageProps {
  width?: string;
  height?: string;
  className?: string;
  variant?: "square" | "circle" | "rounded";
}

/**
 * Skeleton loading component for images
 * Shows image placeholder with shimmer effect
 */
const SkeletonImage: React.FC<SkeletonImageProps> = ({
  width = "w-full",
  height = "h-48",
  className = "",
  variant = "rounded",
}) => {
  const shimmerStyle: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
    backgroundSize: "200% 100%",
    backgroundRepeat: "no-repeat",
    animation: "shimmer 1.5s infinite",
  };

  const variantClass = {
    square: "rounded-none",
    circle: "rounded-full",
    rounded: "rounded-lg",
  };

  return (
    <div
      className={`${width} ${height} ${variantClass[variant]} bg-gray-200 dark:bg-gray-700 animate-shimmer ${className}`}
      style={shimmerStyle}
    />
  );
};

export default SkeletonImage;

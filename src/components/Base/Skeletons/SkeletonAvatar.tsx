import React from "react";

interface SkeletonAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  count?: number;
  layout?: "horizontal" | "vertical";
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

/**
 * Skeleton loading component for avatars
 * Shows circular skeleton with shimmer effect
 */
const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = "md",
  className = "",
  count = 1,
  layout = "horizontal",
}) => {
  const containerClass =
    layout === "vertical" ? "flex flex-col space-y-3" : "flex space-x-3";

  const shimmerStyle: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
    backgroundSize: "200% 100%",
    backgroundRepeat: "no-repeat",
    animation: "shimmer 1.5s infinite",
  };

  return (
    <div className={`${containerClass} ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`${sizeMap[size]} bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer`}
          style={shimmerStyle}
        />
      ))}
    </div>
  );
};

export default SkeletonAvatar;

import React, { ReactNode } from "react";

interface SkeletonWrapperProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
  fallback?: ReactNode;
}

/**
 * Wrapper component to easily toggle between skeleton and actual content
 * Automatically handles the loading state transition with optional delay
 *
 * @param isLoading - Whether to show skeleton or content
 * @param skeleton - Skeleton component to show during loading
 * @param children - Actual content to show when loaded
 * @param delay - Optional delay (ms) before showing content (for smooth transition)
 * @param className - Optional CSS classes for wrapper
 * @param fallback - Optional fallback content if both skeleton and content are missing
 *
 * @example
 * <SkeletonWrapper
 *   isLoading={loading}
 *   skeleton={<SkeletonTable rows={5} columns={4} />}
 *   delay={300}
 * >
 *   <ActualTable data={data} />
 * </SkeletonWrapper>
 */
const SkeletonWrapper: React.FC<SkeletonWrapperProps> = ({
  isLoading,
  skeleton,
  children,
  delay = 0,
  className = "",
  fallback = null,
}) => {
  const [showContent, setShowContent] = React.useState(!isLoading);

  React.useEffect(() => {
    if (!isLoading) {
      if (delay > 0) {
        const timer = setTimeout(() => {
          setShowContent(true);
        }, delay);
        return () => clearTimeout(timer);
      }
      setShowContent(true);
    } else {
      setShowContent(false);
    }
  }, [isLoading, delay]);

  return (
    <div className={className}>
      {isLoading || !showContent ? (
        <div className="animate-fade-in">{skeleton}</div>
      ) : (
        <div className="animate-fade-in">{children || fallback}</div>
      )}
    </div>
  );
};

export default SkeletonWrapper;

import React from "react";

interface SkeletonChartProps {
  className?: string;
  legendItems?: number;
}

const shimmerStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
  backgroundSize: "200% 100%",
  backgroundRepeat: "no-repeat",
  animation: "shimmer 1.5s infinite",
};

const SkeletonChart: React.FC<SkeletonChartProps> = ({
  className = "",
  legendItems = 3,
}) => {
  return (
    <div
      className={`rounded-2xl shadow-lg bg-white p-4 border border-gray-100 ${className}`}
    >
      <div className="w-full min-h-[320px] flex items-center justify-center gap-4">
        <div className="relative h-[17rem] w-[17rem] rounded-full bg-gray-200" style={shimmerStyle}>
          <div className="absolute inset-[24%] rounded-full bg-white" />
        </div>

        {/* <div className="flex-1 space-y-3">
          {Array.from({ length: legendItems }).map((_, idx) => (
            <div
              key={idx}
              className="h-4 rounded bg-gray-200"
              style={{
                ...shimmerStyle,
                width: `${80 - idx * 12}%`,
              }}
            />
          ))}
        </div> */}
      </div>
    </div>
  );
};

export default SkeletonChart;
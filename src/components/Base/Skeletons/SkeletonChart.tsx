import React from "react";

interface SkeletonChartProps {
  className?: string;
  legendItems?: number;
  type?: "pie" | "bar";
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
  type = "pie",
}) => {
  return (
    <div
      className={`rounded-2xl shadow-lg bg-white p-4 border border-gray-100 ${className}`}
    >
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        {type === "pie" ? (
          <div className="flex items-center justify-center gap-4 w-full h-full">
            <div
              className="relative h-44 w-44 md:h-52 md:w-52 rounded-full bg-gray-200"
              style={shimmerStyle}
            >
              <div className="absolute inset-[24%] rounded-full bg-white" />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col justify-end gap-2 pt-4 min-h-[300px]">
            <div className="flex items-end justify-around w-full h-48 gap-2 mb-4">
              {[40, 70, 45, 90, 65, 80].map((height, idx) => (
                <div
                  key={idx}
                  className="w-full bg-gray-200 rounded-t-sm"
                  style={{
                    ...shimmerStyle,
                    height: `${height}%`,
                    maxWidth: "40px",
                  }}
                />
              ))}
            </div>
            <div className="flex justify-around w-full mt-2">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="h-2 w-10 bg-gray-100 rounded"
                  style={shimmerStyle}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkeletonChart;
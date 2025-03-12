import React, { useEffect, useRef, memo, useState } from "react";

interface TradingViewWidgetProps {
  symbol?: string;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ symbol }) => {
  const container = useRef<HTMLDivElement | null>(null);
  const [selectedRange, setSelectedRange] = useState<string>("12M"); // Default to 12 months

  useEffect(() => {
    if (!container.current) return;

    // Clear previous widget before adding a new one
    container.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "autosize": false,
        "symbol": "${symbol}",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "2",
        "locale": "en",
        "range": "${selectedRange}",
        "allow_symbol_change": true,
        "compareSymbols": [
          {
            "symbol": "NASDAQ:NDX",
            "position": "SameScale"
          },
          {
            "symbol": "VANTAGE:SP500",
            "position": "SameScale"
          }
        ],
        "calendar": false,
        "hide_volume": true,
        "support_host": "https://www.tradingview.com"
      }`;

    container.current.appendChild(script);
  }, [symbol, selectedRange]); // Re-run effect when symbol or range changes

  return (
    <div className="tradingview-widget-container" style={{ height: "%", width: "100%" }}>
      {/* Time Range Selection Buttons */}
      <div className="flex justify-center gap-4 mb-2">
        {["12M", "36M", "60M"].map((range) => (
          <button
            key={range}
            className={`px-4 py-1 text-sm font-semibold rounded-md ${
              selectedRange === range ? "bg-[#800000] text-white" : "bg-gray-200 text-gray-600"
            }`}
            onClick={() => setSelectedRange(range)}
          >
            {range}
          </button>
        ))}
      </div>

      {/* TradingView Widget */}
      <div ref={container} style={{ height: "100%", width: "100%" }}>
        <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
        <div className="tradingview-widget-copyright">
          <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
            <span className="blue-text">Track all markets on TradingView</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default memo(TradingViewWidget);

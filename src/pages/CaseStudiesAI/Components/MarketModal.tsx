import React, { useState, useEffect } from "react";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import clsx from "clsx";

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketSearch: string;
  setMarketSearch: (val: string) => void;
  selectedAiMarkets: string[];
  setSelectedAiMarkets: (markets: string[]) => void;
  aiFiltersData: any;
}

const MarketModal: React.FC<MarketModalProps> = ({
  isOpen,
  onClose,
  marketSearch,
  setMarketSearch,
  selectedAiMarkets,
  setSelectedAiMarkets,
  aiFiltersData,
}) => {
  const [tempSelectedMarkets, setTempSelectedMarkets] = useState<string[]>([]);

  // Initialize local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedMarkets([...selectedAiMarkets]);
    }
  }, [isOpen, selectedAiMarkets]);

  if (!isOpen) return null;

  const handleToggle = (marketName: string) => {
    // Single selection only - replace instead of toggle
    setTempSelectedMarkets((prev) =>
      prev.includes(marketName) ? [] : [marketName]
    );
  };

  const handleApply = () => {
    setSelectedAiMarkets(tempSelectedMarkets);
    onClose();
  };

  const isSelected = (marketName: string) => tempSelectedMarkets.includes(marketName);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative z-[121] bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Lucide icon="Globe" className="w-5 h-5 text-primary" />
            All Markets
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b">
          <input
            type="text"
            value={marketSearch}
            onChange={(e) => setMarketSearch(e.target.value)}
            placeholder="Search market..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-700"
            autoFocus
          />
        </div>

        {/* Selected market name */}
        {tempSelectedMarkets.length > 0 && (
          <div className="px-6 py-2 bg-primary/5 border-b flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">
              {tempSelectedMarkets[0]}
            </span>
            <button
              onClick={() => setTempSelectedMarkets([])}
              className="text-xs text-slate-500 hover:text-primary"
            >
              Clear
            </button>
          </div>
        )}

        {/* Market list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1">
          {(aiFiltersData?.markets?.breakdown || [])
            .filter((market: any) =>
              market.name.toLowerCase().includes(marketSearch.toLowerCase())
            )
            .map((market: any, idx: number) => (
              <div
                key={idx}
                onClick={() => handleToggle(market.name)}
                className={clsx(
                  "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border",
                  isSelected(market.name)
                    ? "bg-primary/10 border-primary/30"
                    : "hover:bg-slate-50 border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected(market.name)
                        ? "bg-primary border-primary"
                        : "border-slate-300"
                    )}
                  >
                    {isSelected(market.name) && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className={clsx(
                      "text-sm font-medium",
                      isSelected(market.name)
                        ? "text-primary font-bold"
                        : "text-slate-700"
                    )}
                  >
                    {market.name}
                  </span>
                </div>
                <span
                  className={clsx(
                    "text-xs font-mono px-2 py-0.5 rounded-full border",
                    isSelected(market.name)
                      ? "bg-white text-primary border-primary/20"
                      : "bg-slate-100 text-slate-500 border-transparent"
                  )}
                >
                  {market.count}
                </span>
              </div>
            ))}
          {(aiFiltersData?.markets?.breakdown || []).filter((market: any) =>
            market.name.toLowerCase().includes(marketSearch.toLowerCase())
          ).length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              No markets found
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} className="px-6">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleApply} className="px-6">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MarketModal;

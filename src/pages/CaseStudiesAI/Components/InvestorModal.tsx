import React, { useState, useEffect } from "react";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import clsx from "clsx";

interface InvestorModalProps {
  isOpen: boolean;
  onClose: () => void;
  investorSearch: string;
  setInvestorSearch: (val: string) => void;
  selectedAiInstitutionIds: number[];
  setSelectedAiInstitutionIds: (ids: number[]) => void;
  aiFiltersData: any;
}

const InvestorModal: React.FC<InvestorModalProps> = ({
  isOpen,
  onClose,
  investorSearch,
  setInvestorSearch,
  selectedAiInstitutionIds,
  setSelectedAiInstitutionIds,
  aiFiltersData,
}) => {
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);

  // Initialize local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedIds([...selectedAiInstitutionIds]);
    }
  }, [isOpen, selectedAiInstitutionIds]);

  if (!isOpen) return null;

  const handleToggle = (id: number) => {
    // Single selection only - replace instead of toggle
    setTempSelectedIds((prev) =>
      prev.includes(id) ? [] : [id]
    );
  };

  const handleApply = () => {
    setSelectedAiInstitutionIds(tempSelectedIds);
    onClose();
  };

  const isSelected = (id: number) => tempSelectedIds.includes(id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Lucide icon="Users" className="w-5 h-5 text-primary" />
            All Investors
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
            value={investorSearch}
            onChange={(e) => setInvestorSearch(e.target.value)}
            placeholder="Search investor..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-700"
            autoFocus
          />
        </div>

        {/* Selected investor name */}
        {tempSelectedIds.length > 0 && (
          <div className="px-6 py-2 bg-primary/5 border-b flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">
              {aiFiltersData?.investors?.all?.find((inv: any) => inv.id === tempSelectedIds[0])?.name || 'Selected'}
            </span>
            <button
              onClick={() => setTempSelectedIds([])}
              className="text-xs text-slate-500 hover:text-primary"
            >
              Clear
            </button>
          </div>
        )}

        {/* Investor list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1">
          {(aiFiltersData?.investors?.all || [])
            .filter((inv: any) =>
              inv.name.toLowerCase().includes(investorSearch.toLowerCase())
            )
            .map((inv: any) => (
              <div
                key={inv.id}
                onClick={() => handleToggle(inv.id)}
                className={clsx(
                  "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border",
                  isSelected(inv.id)
                    ? "bg-primary/10 border-primary/30"
                    : "hover:bg-slate-50 border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected(inv.id)
                        ? "bg-primary border-primary"
                        : "border-slate-300"
                    )}
                  >
                    {isSelected(inv.id) && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className={clsx(
                      "text-sm font-medium",
                      isSelected(inv.id)
                        ? "text-primary font-bold"
                        : "text-slate-700"
                    )}
                  >
                    {inv.name}
                  </span>
                </div>
                <span
                  className={clsx(
                    "text-xs font-mono px-2 py-0.5 rounded-full border",
                    isSelected(inv.id)
                      ? "bg-white text-primary border-primary/20"
                      : "bg-slate-100 text-slate-500 border-transparent"
                  )}
                >
                  {inv.count}
                </span>
              </div>
            ))}
          {(aiFiltersData?.investors?.all || []).filter((inv: any) =>
            inv.name.toLowerCase().includes(investorSearch.toLowerCase())
          ).length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              No investors found
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

export default InvestorModal;

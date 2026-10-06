import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import clsx from "clsx";

export interface VoteCategoryTaxonomyChild {
  label: string;
  value: string;
}

export interface VoteCategoryTaxonomyItem {
  parent_category: string;
  parent_value: string;
  has_children: boolean;
  child_count: number;
  child_categories: string[];
  child_paths: string[];
  children: VoteCategoryTaxonomyChild[];
}

interface VoteCategoryTaxonomySelectProps {
  taxonomy: VoteCategoryTaxonomyItem[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  loading?: boolean;
  placeholder?: string;
}

// Renders the vote_category_taxonomy response as a two-level picker:
// - parent rows are always shown and are independently selectable
// - a parent only gets a "+" expand control when has_children is true
// - expanding reveals only that parent's own children (child_paths values)
// - selecting a parent sends only its parent_value; selecting a child sends
//   only that child's exact path value; children are never auto-selected
//   when the parent is selected (and vice versa)
//
// This is a self-contained dropdown (not built on the shared Popover) so the
// panel can be anchored with explicit left-0/right-0, which CSS resolves to
// an exact width match with the trigger's own column — this keeps the panel
// correctly sized whether it sits in a 3-column or 4-column filter grid,
// unlike a plain "w-full" panel whose width depends on an absolutely
// positioned ancestor with no explicit width.
const VoteCategoryTaxonomySelect: React.FC<VoteCategoryTaxonomySelectProps> = ({
  taxonomy,
  selectedValues,
  onChange,
  loading = false,
  placeholder = "Select Category(s)",
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const selectedSet = useMemo(() => new Set(selectedValues || []), [selectedValues]);

  const toggleExpanded = (parentValue: string) => {
    setExpanded((prev) => ({ ...prev, [parentValue]: !prev[parentValue] }));
  };

  const toggleValue = (value: string) => {
    const next = new Set(selectedSet);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(Array.from(next));
  };

  const selectAllChildren = (item: VoteCategoryTaxonomyItem) => {
    const childValues = (item.children || []).map((child) => child.value);
    const next = new Set(selectedSet);
    const allSelected = childValues.length > 0 && childValues.every((value) => next.has(value));

    if (allSelected) {
      childValues.forEach((value) => next.delete(value));
    } else {
      childValues.forEach((value) => next.add(value));
    }
    onChange(Array.from(next));
  };

  const summaryLabel = useMemo(() => {
    if (!selectedValues || selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) return selectedValues[0];
    return `${selectedValues.length} categories selected`;
  }, [selectedValues, placeholder]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={clsx(
          "flex items-center justify-between w-full min-h-[42px] px-3 py-2 text-sm text-left bg-white border rounded-md shadow-sm",
          isOpen ? "border-[#d1d5db] ring-1 ring-[#d1d5db]" : "border-slate-200"
        )}
      >
        <span className={clsx("truncate", (!selectedValues || selectedValues.length === 0) && "text-slate-400")}>
          {loading ? "Loading..." : summaryLabel}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-[0px_3px_10px_#00000017] max-h-72 overflow-y-auto overflow-x-hidden p-1">
          {loading ? (
            <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
          ) : taxonomy.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No categories available</div>
          ) : (
            taxonomy.map((item) => {
              const isParentSelected = selectedSet.has(item.parent_value);
              const isExpanded = !!expanded[item.parent_value];
              const childValues = (item.children || []).map((child) => child.value);
              const allChildrenSelected = childValues.length > 0 && childValues.every((value) => selectedSet.has(value));

              return (
                <div key={item.parent_value} className="mb-0.5">
                  <div className="flex items-center gap-1 rounded-md hover:bg-slate-50">
                    <button
                      type="button"
                      onClick={() => toggleValue(item.parent_value)}
                      className="flex items-center gap-2 min-w-0 flex-1 px-2 py-2 text-sm text-left"
                    >
                      <span
                        className={clsx(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border",
                          isParentSelected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-transparent"
                        )}
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <span className="text-slate-700 truncate">{item.parent_category}</span>
                    </button>
                    {item.has_children && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.parent_value)}
                        className="flex items-center justify-center w-7 h-7 mr-1 shrink-0 rounded-md text-slate-500 hover:bg-slate-100 hover:text-primary"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {item.has_children && isExpanded && (
                    <div className="ml-6 border-l border-slate-100 pl-2">
                      <div className="flex justify-end px-2 py-1">
                        <button
                          type="button"
                          onClick={() => selectAllChildren(item)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {allChildrenSelected ? "Unselect all" : "Select all"}
                        </button>
                      </div>
                      {item.children.map((child) => {
                        const isChildSelected = selectedSet.has(child.value);
                        return (
                          <button
                            key={child.value}
                            type="button"
                            onClick={() => toggleValue(child.value)}
                            className="flex items-start gap-2 w-full min-w-0 px-2 py-2 text-sm text-left rounded-md hover:bg-slate-50"
                          >
                            <span
                              className={clsx(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border mt-0.5",
                                isChildSelected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-transparent"
                              )}
                            >
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                            <span className="text-slate-700 break-words">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default VoteCategoryTaxonomySelect;

import React, { useEffect, useState } from "react";
import { Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import FormCheck from "@/components/Base/Form/FormCheck";
import FormInput from "@/components/Base/Form/FormInput";
import { toast } from "react-toastify";

export interface WhaleWisdomFiler {
  id: string | number;
  name: string;
  cik: string;
  link: string;
}

interface WhaleWisdomFilerPickerModalProps {
  filers: WhaleWisdomFiler[];
  isOpen: boolean;
  onConfirm: (filer: WhaleWisdomFiler) => void;
  onCancel: () => void;
  // Opt-in checkbox mode: lets the caller check 2+ candidates and generate one
  // combined profile from them. Defaults to false so every other consumer of
  // this modal (e.g. the institution-linking flow) keeps its exact existing
  // single-select radio behavior, unchanged.
  allowMultiple?: boolean;
  // Only invoked when allowMultiple is true AND 2+ candidates are checked.
  // Checking exactly one candidate always calls onConfirm instead, same as
  // single-select mode -- the single-CIK generate flow stays untouched.
  onConfirmMultiple?: (filers: WhaleWisdomFiler[]) => void;
}

const buildFilerUrl = (link: string): string => {
  if (!link) return "";
  if (link.startsWith("http")) return link;
  const separator = link.startsWith("/") ? "" : "/";
  return "https://whalewisdom.com" + separator + link;
};

export const WhaleWisdomFilerPickerModal: React.FC<WhaleWisdomFilerPickerModalProps> = ({
  filers,
  isOpen,
  onConfirm,
  onCancel,
  allowMultiple = false,
  onConfirmMultiple,
}) => {
  const [selectedFilerId, setSelectedFilerId] = useState<string>("");
  const [selectedFilerIds, setSelectedFilerIds] = useState<Set<string>>(new Set());
  const [filerSearchQuery, setFilerSearchQuery] = useState<string>("");

  // A stale selection/search from a previous open (possibly against a
  // different filer list) must not carry over into this one.
  useEffect(() => {
    if (isOpen) {
      setSelectedFilerId("");
      setSelectedFilerIds(new Set());
      setFilerSearchQuery("");
    }
  }, [isOpen, filers]);

  const filteredFilerOptions = filers.filter(
    (filer) =>
      filer.name.toLowerCase().includes(filerSearchQuery.toLowerCase()) ||
      String(filer.id).includes(filerSearchQuery) ||
      String(filer.cik).includes(filerSearchQuery)
  );

  const toggleFilerChecked = (filerId: string) => {
    setSelectedFilerIds((prev) => {
      const next = new Set(prev);
      if (next.has(filerId)) {
        next.delete(filerId);
      } else {
        next.add(filerId);
      }
      return next;
    });
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    // This Dialog renders via a Portal — React still bubbles the click
    // through the React tree (not the DOM tree) up to whatever rendered this
    // modal, which may itself sit inside another overlay with its own
    // click-to-close handler. Stop it here so "Confirm Selection" can't be
    // mistaken for a click on that outer overlay.
    e.stopPropagation();

    if (!allowMultiple) {
      if (!selectedFilerId) {
        toast.error("Please select a Filer ID from the list.");
        return;
      }
      const selectedFiler = filers.find((f) => String(f.id) === selectedFilerId);
      if (selectedFiler) {
        onConfirm(selectedFiler);
      }
      return;
    }

    if (selectedFilerIds.size === 0) {
      toast.error("Please select at least one Filer ID from the list.");
      return;
    }

    const checkedFilers = filers.filter((f) => selectedFilerIds.has(String(f.id)));
    if (checkedFilers.length === 1) {
      // Exactly one checked -- same single-CIK generate flow as non-multi mode.
      onConfirm(checkedFilers[0]);
      return;
    }

    onConfirmMultiple?.(checkedFilers);
  };

  return (
    <Dialog size="xl" open={isOpen} onClose={onCancel}>
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="text-lg font-semibold">Select Whale Wisdom ID</h2>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
          >
            <Lucide icon="X" className="w-8 h-8 text-slate-400" />
          </div>
        </Dialog.Title>

        <div className="px-4 pt-4 pb-2">
          <div className="relative w-full sm:w-1/2">
            <Lucide
              icon="Search"
              className="absolute inset-y-0 left-0 z-10 w-4 h-4 my-auto ml-3 text-slate-500"
            />
            <FormInput
              type="text"
              placeholder="Search by Name, ID, or CIK..."
              className="pl-10"
              value={filerSearchQuery}
              onChange={(e) => setFilerSearchQuery(e.target.value)}
            />
          </div>
          {allowMultiple && (
            <p className="mt-2 text-xs text-slate-500">
              Select one filer to generate its profile, or check 2 or more to generate one combined profile from them.
            </p>
          )}
        </div>

        <Dialog.Description className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-slate-800 border-b">
                <tr>
                  <th className="p-3 font-semibold w-16 text-center">Select</th>
                  <th className="p-3 font-semibold">ID</th>
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">CIK</th>
                  <th className="p-3 font-semibold">WhaleWisdom Page</th>
                </tr>
              </thead>
              <tbody>
                {filteredFilerOptions.length > 0 ? (
                  filteredFilerOptions.map((filer) => {
                    const finalUrl = buildFilerUrl(filer.link);
                    const isSelected = allowMultiple
                      ? selectedFilerIds.has(String(filer.id))
                      : selectedFilerId === String(filer.id);

                    return (
                      <tr
                        key={filer.id}
                        onClick={(e) => e.stopPropagation()}
                        className={
                          "border-b transition-all duration-200 cursor-pointer " +
                          (isSelected
                            ? "bg-red-50 border-l-4 border-l-red-700"
                            : "hover:bg-slate-50")
                        }
                      >
                        <td className="p-3 text-center">
                          {allowMultiple ? (
                            <FormCheck.Input
                              type="checkbox"
                              className="cursor-pointer w-4 h-4"
                              style={{ accentColor: "#9b1b30" }}
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleFilerChecked(String(filer.id))}
                            />
                          ) : (
                            <FormCheck.Input
                              type="radio"
                              name="filerSelectionRadio"
                              className="cursor-pointer w-4 h-4"
                              style={{ accentColor: "#9b1b30" }}
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => setSelectedFilerId(String(filer.id))}
                            />
                          )}
                        </td>
                        <td className="p-3">{filer.id}</td>
                        <td className="p-3 font-medium">{filer.name}</td>
                        <td className="p-3">{filer.cik}</td>
                        <td className="p-3">
                          {filer.link ? (
                            <a
                              href={finalUrl}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                window.open(finalUrl, "_blank", "noopener,noreferrer");
                              }}
                            >
                              View Page
                              <Lucide
                                icon="ExternalLink"
                                className="w-3 h-3 ml-1"
                              />
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">
                      No matches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Dialog.Description>

        <Dialog.Footer className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline-secondary"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
          >
            {allowMultiple && selectedFilerIds.size > 1
              ? `Confirm Selection (${selectedFilerIds.size})`
              : "Confirm Selection"}
          </Button>
        </Dialog.Footer>
      </Dialog.Panel>
    </Dialog>
  );
};

export default WhaleWisdomFilerPickerModal;

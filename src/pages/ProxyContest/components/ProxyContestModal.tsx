import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import LoadingIcon from "@/components/Base/LoadingIcon";
import TomSelect from "@/components/Base/TomSelect";
import CompanySelect from "@/components/ReactSelectAsync";
import { FormCheck, FormInput } from "@/components/Base/Form";
import { proxyContextService } from "@/services/proxyContext";
import { toast } from "react-toastify";

interface CompanyOption {
  id: number;
  name: string;
}

interface ProxyContextModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ExtraDocumentUI {
  id: number;
  year: string;
  keyword: string;
  documentName: string;
  documentFile: File | null;
}

interface DocumentFieldsSectionProps {
  years: string[];
  keywords: string[];
  year: string;
  keyword: string;
  documentName: string;
  documentFile: File | null;
  onYearChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onDocumentNameChange: (value: string) => void;
  onDocumentFileChange: (file: File | null) => void;
  onScrollToNote: () => void;
  onRemove?: () => void;
  title?: string;
}

const DocumentFieldsSection = ({
  years,
  keywords,
  year,
  keyword,
  documentName,
  documentFile,
  onYearChange,
  onKeywordChange,
  onDocumentNameChange,
  onDocumentFileChange,
  onScrollToNote,
  onRemove,
  title,
}: DocumentFieldsSectionProps) => {
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{title || "Document"}</p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <Lucide icon="Trash2" className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Year <span className="text-rose-600">*</span>
          </label>
          <TomSelect
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            className="mt-1 w-full"
            options={{
              placeholder: "Dropdown",
            }}
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </TomSelect>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Keyword <span className="text-rose-600">*</span>
          </label>
          <TomSelect
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="mt-1 w-full"
            options={{
              placeholder: "Dropdown",
            }}
          >
            {keywords.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </TomSelect>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Document Name <span className="text-rose-600">*</span>
            <button
              type="button"
              onClick={onScrollToNote}
              className="align-super ml-1 text-[11px] text-primary hover:underline"
              aria-label="View document name format note"
            >
              [1]
            </button>
          </label>
          <FormInput
            value={documentName}
            onChange={(e) => onDocumentNameChange(e.target.value)}
            placeholder="Enter Document Name"
            required
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Upload Doc <span className="text-rose-600">*</span>
          </label>
          <div className="mt-1 rounded-lg border border-dashed border-slate-300 bg-white p-3">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (!file) {
                  onDocumentFileChange(null);
                  return;
                }

                const isPdf =
                  file.type === "application/pdf" ||
                  file.name.toLowerCase().endsWith(".pdf");

                if (!isPdf) {
                  toast.error("Only PDF files are allowed.");
                  e.currentTarget.value = "";
                  onDocumentFileChange(null);
                  return;
                }

                onDocumentFileChange(file);
              }}
              required
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:px-3 file:py-1.5 hover:file:bg-primary/20"
            />
            <p className="text-xs text-slate-500 mt-2">
              Required: Upload PDF document only.
            </p>
            {documentFile && (
              <p className="text-xs text-emerald-700 mt-1 font-medium">
                Selected: {documentFile.name}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProxyContestModal = ({ open, onClose, onSuccess }: ProxyContextModalProps) => {
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [years, setYears] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);

  const [companySelectValue, setCompanySelectValue] = useState<any>("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);

  const [year, setYear] = useState("");
  const [keyword, setKeyword] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [extraDocuments, setExtraDocuments] = useState<ExtraDocumentUI[]>([]);
  const extraDocumentIdRef = useRef(1);

  const [iss, setIss] = useState({
    management: false,
    activist: false,
    split: false,
  });

  const [gl, setGl] = useState({
    management: false,
    activist: false,
    split: false,
  });

  const allDocumentEntries = useMemo(
    () => [
      {
        id: 0,
        year,
        keyword,
        documentName,
        documentFile,
      },
      ...extraDocuments,
    ],
    [year, keyword, documentName, documentFile, extraDocuments]
  );

  const canSubmit = useMemo(() => {
    const hasValidDocuments = allDocumentEntries.every(
      (entry) =>
        entry.year &&
        entry.keyword &&
        entry.documentName.trim() &&
        entry.documentFile
    );

    return Boolean(
      selectedCompany?.id &&
        hasValidDocuments
    );
  }, [selectedCompany, allDocumentEntries]);

  useEffect(() => {
    if (!open) return;

    const init = async () => {
      try {
        setDropdownLoading(true);
        const data = await proxyContextService.getDropdowns();
        setYears(data.years || []);
        setKeywords(data.keywords || []);
        setYear((prev) => prev || data?.years?.[0] || "");
        setKeyword((prev) => prev || data?.keywords?.[0] || "");
      } catch (error) {
        console.error("Error fetching proxy context dropdowns:", error);
      } finally {
        setDropdownLoading(false);
      }
    };

    init();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setCompanySelectValue("");
      setSelectedCompany(null);
      setYear("");
      setKeyword("");
      setDocumentName("");
      setDocumentFile(null);
      setExtraDocuments([]);
      extraDocumentIdRef.current = 1;
      setIss({ management: false, activist: false, split: false });
      setGl({ management: false, activist: false, split: false });
    }
  }, [open]);

  const handleAddMoreDocuments = () => {
    setExtraDocuments((prev) => [
      ...prev,
      {
        id: extraDocumentIdRef.current++,
        year: years[0] || "",
        keyword: keywords[0] || "",
        documentName: "",
        documentFile: null,
      },
    ]);
  };

  const handleRemoveExtraDocument = (id: number) => {
    setExtraDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleExtraDocumentChange = (
    id: number,
    updates: Partial<Omit<ExtraDocumentUI, "id">>
  ) => {
    setExtraDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc))
    );
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    const hasInvalidDocument = allDocumentEntries.some(
      (entry) =>
        !entry.year ||
        !entry.keyword ||
        !entry.documentName.trim() ||
        !entry.documentFile
    );

    if (!selectedCompany?.id || hasInvalidDocument) {
      toast.error("Please fill all required fields including document name and document file.");
      return;
    }

    try {
      setSubmitting(true);

      for (const entry of allDocumentEntries) {
        const pressReleaseFormData = new FormData();
        pressReleaseFormData.append("company_id", String(selectedCompany.id));
        pressReleaseFormData.append("keyword", entry.keyword);
        pressReleaseFormData.append("year", String(Number(entry.year)));
        pressReleaseFormData.append("document_name", entry.documentName.trim());
        pressReleaseFormData.append("document", entry.documentFile as File);

        await proxyContextService.createPressReleasePresentation(pressReleaseFormData);
      }

      const sharedPayload = {
        company_id: selectedCompany.id,
        company_tent: selectedCompany.name,
        year: Number(year),
      };

      await proxyContextService.createProxyAdvisoryRecommendation({
        ...sharedPayload,
        type: "ISS",
        management: iss.management,
        activist: iss.activist,
        split: iss.split,
      });

      await proxyContextService.createProxyAdvisoryRecommendation({
        ...sharedPayload,
        type: "GL",
        management: gl.management,
        activist: gl.activist,
        split: gl.split,
      });

      toast.success("Proxy context added successfully.");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error submitting proxy context:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScrollToDocNameNote = () => {
    const note = document.getElementById("doc-name-format-note");
    note?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Dialog size="xl" open={open} onClose={handleClose}>
      <Dialog.Panel className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl">
        <Dialog.Title className="flex justify-between items-center px-6 py-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Add Proxy Contest</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit document and proxy advisory recommendations in one flow.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 transition-colors p-1.5 rounded-md hover:bg-slate-100"
            disabled={submitting}
          >
            <Lucide icon="X" className="w-5 h-5" />
          </button>
        </Dialog.Title>

        <Dialog.Description className="p-6">
          {dropdownLoading ? (
            <div className="flex items-center justify-center min-h-[280px]">
              <div className="text-center">
                <LoadingIcon icon="three-dots" className="w-10 h-10 mx-auto" />
                <p className="text-xs text-slate-500 mt-2">Loading dropdown options...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                  <h3 className="text-base font-semibold text-slate-800">Press Release / Presentation</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Company <span className="text-rose-600">*</span>
                    </label>
                    <div className="mt-1">
                      <CompanySelect
                        value={companySelectValue || ""}
                        isClearable={true}
                      placeholder="Search Company"
                        onChange={(value: any) => {
                          if (!value) {
                            setCompanySelectValue("");
                            setSelectedCompany(null);
                            return;
                          }

                          const option = Array.isArray(value) ? value[0] : value;
                          if (!option) {
                            setCompanySelectValue("");
                            setSelectedCompany(null);
                            return;
                          }

                          const optionId = Number(option?.value || option?.company?.id);
                          const optionName = option?.label || option?.company?.name || "";

                          setCompanySelectValue(option);
                          if (optionId && optionName) {
                            setSelectedCompany({ id: optionId, name: optionName });
                          } else {
                            setSelectedCompany(null);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <DocumentFieldsSection
                      title="Document 1"
                      years={years}
                      keywords={keywords}
                      year={year}
                      keyword={keyword}
                      documentName={documentName}
                      documentFile={documentFile}
                      onYearChange={setYear}
                      onKeywordChange={setKeyword}
                      onDocumentNameChange={setDocumentName}
                      onDocumentFileChange={setDocumentFile}
                      onScrollToNote={handleScrollToDocNameNote}
                    />

                    {extraDocuments.map((doc, index) => (
                      <DocumentFieldsSection
                        key={doc.id}
                        title={`Document ${index + 2}`}
                        years={years}
                        keywords={keywords}
                        year={doc.year}
                        keyword={doc.keyword}
                        documentName={doc.documentName}
                        documentFile={doc.documentFile}
                        onYearChange={(value) =>
                          handleExtraDocumentChange(doc.id, { year: value })
                        }
                        onKeywordChange={(value) =>
                          handleExtraDocumentChange(doc.id, { keyword: value })
                        }
                        onDocumentNameChange={(value) =>
                          handleExtraDocumentChange(doc.id, { documentName: value })
                        }
                        onDocumentFileChange={(file) =>
                          handleExtraDocumentChange(doc.id, { documentFile: file })
                        }
                        onScrollToNote={handleScrollToDocNameNote}
                        onRemove={() => handleRemoveExtraDocument(doc.id)}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={handleAddMoreDocuments}
                      className="w-full rounded-lg border border-dashed border-slate-400 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Add more documents
                    </button>
                  </div>
                </div>

                <div
                  id="doc-name-format-note"
                  className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3"
                >
                  <p className="text-xs font-semibold text-amber-900">
                    [1] Document Name Format Examples
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    For Press Release: 2025_Cannae Holdings_25 Nov 25_Activist Press Release_GL_Carronade
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    For Presentation: 2025_Cannae Holdings_24 Nov 25_Activist Presentation_Carronade (Rebuttal)
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-800">Proxy Advisory Firm Recommendation (ISS / GL)</h3>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                    <h4 className="font-medium mb-3 text-slate-700">For ISS</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="iss-management"
                            type="checkbox"
                            checked={iss.management}
                            onChange={(e) => setIss((prev) => ({ ...prev, management: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="iss-management" className="text-sm text-slate-700">
                            Management
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="iss-activist"
                            type="checkbox"
                            checked={iss.activist}
                            onChange={(e) => setIss((prev) => ({ ...prev, activist: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="iss-activist" className="text-sm text-slate-700">
                            Activist
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="iss-split"
                            type="checkbox"
                            checked={iss.split}
                            onChange={(e) => setIss((prev) => ({ ...prev, split: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="iss-split" className="text-sm text-slate-700">
                            Split
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                    <h4 className="font-medium mb-3 text-slate-700">For GL</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="gl-management"
                            type="checkbox"
                            checked={gl.management}
                            onChange={(e) => setGl((prev) => ({ ...prev, management: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="gl-management" className="text-sm text-slate-700">
                            Management
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="gl-activist"
                            type="checkbox"
                            checked={gl.activist}
                            onChange={(e) => setGl((prev) => ({ ...prev, activist: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="gl-activist" className="text-sm text-slate-700">
                            Activist
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="gl-split"
                            type="checkbox"
                            checked={gl.split}
                            onChange={(e) => setGl((prev) => ({ ...prev, split: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="gl-split" className="text-sm text-slate-700">
                            Split
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Dialog.Description>

        <Dialog.Footer className="px-6 py-4 border-t border-slate-200/60 bg-slate-50/60 flex justify-end gap-3">
          <Button variant="outline-secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </Dialog.Footer>
      </Dialog.Panel>
    </Dialog>
  );
};

export default ProxyContestModal;

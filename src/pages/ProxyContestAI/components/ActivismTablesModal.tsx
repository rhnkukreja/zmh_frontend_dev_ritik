import React, { useEffect, useState } from "react";
import { Dialog } from "@/components/Base/Headless";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { proxyContestAIService } from "@/services/proxyContestAI";
import Lucide from "@/components/Base/Lucide";
import clsx from "clsx";

interface ActivismTablesModalProps {
  open: boolean;
  onClose: () => void;
  companyName: string;
  year: string;
}

const SECTION_LABELS: Record<string, string> = {
  Activism_Presentation: "Presentations",
  Activism_Press_Release: "Press Releases",
  Activism_ISS_GL: "ISS / GL Recommendations",
};

const ActivismTablesModal: React.FC<ActivismTablesModalProps> = ({
  open,
  onClose,
  companyName,
  year,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    if (!open || !companyName) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await proxyContestAIService.getActivismTables(
          companyName,
          year ? [year] : undefined
        );
        setData(res);
        const first = Object.keys(res || {}).find((k) => res[k]?.length > 0);
        setActiveSection(first || "");
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [open, companyName, year]);

  const sections = data ? Object.keys(data).filter((k) => data[k]?.length > 0) : [];

  return (
    <Dialog open={open} onClose={onClose} size="xl">
      <Dialog.Panel className="max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-none">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{companyName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">Activism Documents · {year}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <Lucide icon="X" className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingIcon icon="oval" className="w-8 h-8 text-primary" />
          </div>
        ) : sections.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Lucide icon="FileText" className="w-12 h-12 mb-3 opacity-40" />
            <p>No activism documents available.</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex gap-1 px-6 pt-4 flex-none border-b border-slate-200">
              {sections.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setActiveSection(sec)}
                  className={clsx(
                    "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all duration-150",
                    activeSection === sec
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  {SECTION_LABELS[sec] || sec}
                  <span className="ml-1.5 bg-slate-100 text-slate-500 text-xs rounded-full px-1.5 py-0.5">
                    {data[sec].length}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-6">
              {activeSection === "Activism_ISS_GL" ? (
                <div className="space-y-3">
                  {data[activeSection].map((item: any) => (
                    <div key={item.id} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-full text-xs font-bold",
                          item.type === "ISS" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                          {item.type}
                        </span>
                        <span className="font-medium text-slate-800">{item.company_tent}</span>
                        <span className="text-slate-400 text-xs">{item.year}</span>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className={clsx("px-2 py-0.5 rounded text-xs font-medium",
                          item.management ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                          Management {item.management ? "✓" : "✗"}
                        </span>
                        <span className={clsx("px-2 py-0.5 rounded text-xs font-medium",
                          item.activist ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>
                          Activist {item.activist ? "✓" : "✗"}
                        </span>
                        <span className={clsx("px-2 py-0.5 rounded text-xs font-medium",
                          item.split ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500")}>
                          Split {item.split ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {data[activeSection]?.map((item: any) => (
                    <div key={item.id} className="flex items-start gap-3 bg-slate-50 rounded-lg p-4 border border-slate-100 hover:border-primary/30 transition-colors">
                      <Lucide icon="FileText" className="w-5 h-5 text-primary flex-none mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-slate-800 leading-snug">{item.document_name}</span>
                          {item.document_url && (
                            <a
                              href={item.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-none text-primary hover:text-primary/80"
                            >
                              <Lucide icon="ExternalLink" className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          {item.document_date && <span>{item.document_date}</span>}
                          {item.activist_name && (
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                              {item.activist_name}
                            </span>
                          )}
                          {item.is_company_activist && (
                            <span className={clsx("px-2 py-0.5 rounded-full font-medium",
                              item.is_company_activist === "activist"
                                ? "bg-red-50 text-red-600"
                                : "bg-blue-50 text-blue-600"
                            )}>
                              {item.is_company_activist}
                            </span>
                          )}
                          {item.keyword && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.keyword}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog.Panel>
    </Dialog>
  );
};

export default ActivismTablesModal;

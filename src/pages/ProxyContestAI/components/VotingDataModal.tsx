import React, { useEffect, useState } from "react";
import { Dialog } from "@/components/Base/Headless";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { proxyContestAIService } from "@/services/proxyContestAI";
import Lucide from "@/components/Base/Lucide";

interface VotingDataModalProps {
  open: boolean;
  onClose: () => void;
  companyId: number | null;
  companyName: string;
  year: string;
  institutionIds: number[];
}

const VOTE_COLORS: Record<string, string> = {
  For: "bg-green-100 text-green-700",
  Against: "bg-red-100 text-red-700",
  Withhold: "bg-red-100 text-red-700",
  Abstain: "bg-yellow-100 text-yellow-700",
  "": "bg-slate-100 text-slate-600",
};

const VotingDataModal: React.FC<VotingDataModalProps> = ({
  open,
  onClose,
  companyId,
  companyName,
  year,
  institutionIds,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !companyId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await proxyContestAIService.getVotingData(
          companyId,
          year,
          institutionIds.length > 0 ? institutionIds : undefined
        );
        setData(res);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [open, companyId, year, institutionIds]);

  return (
    <Dialog open={open} onClose={onClose} size="xl">
      <Dialog.Panel className="max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-none">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{companyName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Voting Data · {year} · Proxy Contest
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <Lucide icon="X" className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingIcon icon="oval" className="w-8 h-8 text-primary" />
            </div>
          ) : !data || data.count === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Lucide icon="Vote" className="w-12 h-12 mb-3 opacity-40" />
              <p>No voting data available for this selection.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <p className="text-xs text-slate-500 mb-3">
                {data.count} record{data.count !== 1 ? "s" : ""}
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary text-white text-left">
                    {["#", "Proposal", "Prop. #", "Vote", "Mgt Rec", "Institution", "Fund", "Category", "Meeting Date"].map(
                      (h) => (
                        <th key={h} className="px-3 py-2.5 font-semibold whitespace-nowrap first:rounded-tl-md last:rounded-tr-md">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((row: any, i: number) => (
                    <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-[260px]">{row.proposal}</td>
                      <td className="px-3 py-2 text-slate-500 text-center">{row.proposal_num}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VOTE_COLORS[row.vote] || VOTE_COLORS[""]}`}>
                          {row.vote}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-center">{row.mgt_rec}</td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{row.institution_name}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs max-w-[140px] truncate">{row.fund_name}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{row.proposal_category}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{row.meeting_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};

export default VotingDataModal;

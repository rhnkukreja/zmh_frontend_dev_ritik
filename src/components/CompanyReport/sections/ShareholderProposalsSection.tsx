import { SPData } from "@/types/companyReport";
import zmhLogo from "@/assets/images/logo/zmh-logo.jpg";
import clsx from "clsx";

interface ShareholderProposalsSectionProps {
  data: SPData[];
}

// Known fields that are not institution names
const NON_INSTITUTION_FIELDS = ['proxy_season', 'proponent', 'outcome_percentage', 'proposal_title', 'mgt_rec', 'major_institutions_vote'];

const ShareholderProposalsSection = ({ data }: ShareholderProposalsSectionProps) => {
  const dataArray = Array.isArray(data) ? data : [];

  // Get the most recent year
  const years = [...new Set(dataArray.map(d => d.proxy_season))].sort((a, b) => parseInt(String(b)) - parseInt(String(a)));
  const recentYear = years[0] || new Date().getFullYear().toString();

  // Extract institution names from the first data item (keys that aren't known fields)
  const institutionNames: string[] = [];
  if (dataArray.length > 0) {
    const firstItem = dataArray[0];
    Object.keys(firstItem).forEach(key => {
      if (!NON_INSTITUTION_FIELDS.includes(key) && typeof firstItem[key] !== 'object') {
        institutionNames.push(key);
      }
    });
  }

  if (dataArray.length === 0) {
    return (
      <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div className="flex items-center gap-3 mb-4">
          <img src={zmhLogo} alt="ZMH Logo" className="h-6 w-auto" />
          <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 flex-1">
            Shareholder Proposals ({recentYear} only)
          </h2>
        </div>
        <div className="bg-gray-50 rounded p-4 text-center">
          <p className="text-gray-500 text-xs">No shareholder proposals data available</p>
        </div>
      </section>
    );
  }

  // Get short names for institutions (first word or abbreviation)
  const getShortName = (name: string): string => {
    if (name.includes('BlackRock')) return 'BlackRock';
    if (name.includes('Vanguard')) return 'Vanguard';
    if (name.includes('State Street')) return 'SSGA';
    if (name.includes('Dimensional')) return 'DFA';
    if (name.includes('T Rowe') || name.includes('T. Rowe')) return 'T. Rowe';
    return name.split(' ')[0];
  };

  return (
    <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div className="flex items-center gap-3 mb-4">
        <img src={zmhLogo} alt="ZMH Logo" className="h-6 w-auto" />
        <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 flex-1">
          Shareholder Proposals ({recentYear} only)
        </h2>
      </div>

      <div className="overflow-visible">
        <table className="w-full text-xs border-collapse table-fixed">
          <thead>
            <tr className="bg-primary text-white">
              <th className="text-left py-2 px-2 font-medium border border-gray-300 w-[60px]">Year</th>
              <th className="text-left py-2 px-2 font-medium border border-gray-300">Proponent</th>
              <th className="text-center py-2 px-2 font-medium border border-gray-300 w-[70px]">Outcome</th>
              {institutionNames.map((inst, idx) => (
                <th key={idx} className="text-center py-2 px-1 font-medium border border-gray-300 w-[65px]">
                  <span className="text-[9px]">{getShortName(inst)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataArray.slice(0, 20).map((proposal, index) => {
              const outcomeStr = proposal.outcome_percentage || '-';
              const outcomeNum = parseFloat(outcomeStr.replace('%', ''));
              const isPercentage = !isNaN(outcomeNum);

              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-2 border border-gray-200">
                    {proposal.proxy_season}
                  </td>
                  <td className="py-2 px-2 border border-gray-200">
                    <span className="text-[11px]">{proposal.proponent}</span>
                  </td>
                  <td className="py-2 px-2 border border-gray-200 text-center">
                    <span className={clsx(
                      "font-medium text-[10px]",
                      isPercentage && outcomeNum >= 50 ? "text-green-600" : "text-gray-700"
                    )}>
                      {outcomeStr}
                    </span>
                  </td>
                  {institutionNames.map((inst, idx) => {
                    const vote = (proposal as any)[inst];
                    return (
                      <td key={idx} className="py-2 px-1 border border-gray-200 text-center">
                        <span className={clsx(
                          "text-[10px] font-medium",
                          vote === 'For' && "text-green-600",
                          vote === 'Against' && "text-red-600",
                          vote === 'Abstain' && "text-amber-600",
                          vote === 'Split Vote' && "text-purple-600",
                          (!vote || vote === null) && "text-gray-400"
                        )}>
                          {vote || '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {dataArray.length > 20 && (
          <p className="text-[10px] text-gray-500 mt-1 text-center">
            Showing 20 of {dataArray.length} proposals
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <span className="text-green-600 font-medium">For</span>
          <span>= Voted For</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-red-600 font-medium">Against</span>
          <span>= Voted Against</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-amber-600 font-medium">Abstain</span>
          <span>= Abstained</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-purple-600 font-medium">Split Vote</span>
          <span>= Split Vote</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">-</span>
          <span>= No Vote</span>
        </div>
      </div>
    </section>
  );
};

export default ShareholderProposalsSection;

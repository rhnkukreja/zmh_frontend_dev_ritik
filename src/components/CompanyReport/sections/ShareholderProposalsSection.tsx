import { SPData } from "@/types/companyReport";
import zmhLogo from "@/assets/images/logo/zmh-logo.jpg";
import clsx from "clsx";

interface ShareholderProposalsSectionProps {
  data: SPData[];
}

const ShareholderProposalsSection = ({ data }: ShareholderProposalsSectionProps) => {
  const dataArray = Array.isArray(data) ? data : [];

  // Get the most recent year
  const years = [...new Set(dataArray.map(d => d.proxy_season))].sort((a, b) => parseInt(b) - parseInt(a));
  const recentYear = years[0] || new Date().getFullYear().toString();

  // Get list of unique institutions for header
  const allInstitutions = new Set<string>();
  dataArray.forEach(proposal => {
    proposal.major_institutions_vote?.forEach(inst => {
      if (inst.institution_name) {
        allInstitutions.add(inst.institution_name);
      }
    });
  });
  const institutionsList = Array.from(allInstitutions).slice(0, 5);

  if (dataArray.length === 0) {
    return (
      <section className="mb-6 page-break-inside-avoid">
        <div className="flex items-center gap-3 mb-3">
          <img src={zmhLogo} alt="ZMH Logo" className="h-5 w-auto" />
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-1 flex-1">
            Shareholder Proposals ({recentYear} only)
          </h2>
        </div>
        <div className="bg-gray-50 rounded p-4 text-center">
          <p className="text-gray-500 text-xs">No shareholder proposals data available</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 page-break-inside-avoid">
      <div className="flex items-center gap-3 mb-3">
        <img src={zmhLogo} alt="ZMH Logo" className="h-5 w-auto" />
        <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-1 flex-1">
          Shareholder Proposals ({recentYear} only)
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-primary text-white">
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300">Proxy Season</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300">The Proponent</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300">Resolution Title</th>
              <th className="text-center py-1.5 px-2 font-medium border border-gray-300">Mgt Rec</th>
              <th className="text-center py-1.5 px-2 font-medium border border-gray-300">Outcome</th>
              {institutionsList.map((inst, idx) => (
                <th key={idx} className="text-center py-1.5 px-1 font-medium border border-gray-300 max-w-[60px]">
                  <span className="truncate block text-[9px]">{inst.split(' ')[0]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataArray.slice(0, 15).map((proposal, index) => {
              // Build a vote lookup for this proposal
              const voteLookup: Record<string, string> = {};
              proposal.major_institutions_vote?.forEach(inst => {
                if (inst.institution_name) {
                  voteLookup[inst.institution_name] = inst.vote || '-';
                }
              });

              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-1.5 px-2 border border-gray-200 whitespace-nowrap">
                    {proposal.proxy_season}
                  </td>
                  <td className="py-1.5 px-2 border border-gray-200 max-w-[100px]">
                    <span className="truncate block">{proposal.proponent}</span>
                  </td>
                  <td className="py-1.5 px-2 border border-gray-200 max-w-[150px]">
                    <span className="line-clamp-2 text-[10px]">{proposal.proposal_title}</span>
                  </td>
                  <td className="py-1.5 px-2 border border-gray-200 text-center">
                    <span className="text-red-600 font-medium">Against</span>
                  </td>
                  <td className="py-1.5 px-2 border border-gray-200 text-center">
                    <span className={clsx(
                      "font-medium",
                      parseFloat(proposal.outcome_percentage?.replace('%', '') || '0') >= 50 
                        ? "text-green-600" 
                        : "text-gray-600"
                    )}>
                      {proposal.outcome_percentage}
                    </span>
                  </td>
                  {institutionsList.map((inst, idx) => {
                    const vote = voteLookup[inst];
                    return (
                      <td key={idx} className="py-1.5 px-1 border border-gray-200 text-center">
                        <span className={clsx(
                          "text-[10px] font-medium",
                          vote === 'For' && "text-green-600",
                          vote === 'Against' && "text-red-600",
                          (!vote || vote === '-') && "text-gray-400"
                        )}>
                          {vote === 'For' ? 'For' : vote === 'Against' ? 'Against' : vote || '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {dataArray.length > 15 && (
          <p className="text-[10px] text-gray-500 mt-1 text-center">
            Showing 15 of {dataArray.length} proposals
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
          <span className="text-gray-400">-</span>
          <span>= No Vote / Abstain</span>
        </div>
      </div>
    </section>
  );
};

export default ShareholderProposalsSection;

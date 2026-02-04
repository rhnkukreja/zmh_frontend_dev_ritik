import { SPData } from "@/types/companyReport";
import clsx from "clsx";

interface ShareholderProposalsSectionProps {
  data: SPData[];
}

// Known fields that are not institution names (exclude these from dynamic columns)
const NON_INSTITUTION_FIELDS = ['proxy_season', 'proponent', 'proposal_name', 'proposal_num', 'outcome_percentage', 'proposal_title', 'mgt_rec', 'major_institutions_vote', 'company', 'year', 'id', 'ticker'];

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
        <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
          Shareholder Proposals ({recentYear} only)
        </h2>
        <div className="bg-gray-50 rounded p-4 text-center">
          <p className="text-gray-500 text-xs">No shareholder proposals data available</p>
        </div>
      </section>
    );
  }

  // Get short names for institutions
  const getShortName = (name: string): string => {
    if (name.includes('BlackRock')) return 'BlackRock';
    if (name.includes('Vanguard')) return 'Vanguard';
    if (name.includes('State Street')) return 'SSGA';
    if (name.includes('Dimensional')) return 'Dimensional';
    if (name.includes('T Rowe') || name.includes('T. Rowe')) return 'T.Rowe';
    return name.split(' ')[0];
  };

  return (
    <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
        Shareholder Proposals ({recentYear} only)
      </h2>

      <div className="overflow-visible">
        <table className="w-full text-xs border-collapse table-fixed">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs w-[120px]">Proponent</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">Proposal</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-600 text-xs w-[70px]">Outcome</th>
              {institutionNames.map((inst, idx) => (
                <th key={idx} className="text-center py-2 px-1 font-semibold text-gray-600 text-xs w-[75px]">
                  {getShortName(inst)}
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
                  <td className="py-2 px-2 border border-gray-200 font-semibold">
                    {proposal.proponent}
                  </td>
                  <td className="py-2 px-2 border border-gray-200">
                    {proposal.proposal_name || proposal.proposal_title || ''}
                  </td>
                  <td className="py-2 px-2 border border-gray-200 text-center">
                    {outcomeStr}
                  </td>
                  {institutionNames.map((inst, idx) => {
                    const vote = (proposal as any)[inst];
                    const isAgainstOrWithhold = vote === 'Against' || vote === 'Withhold';
                    return (
                      <td key={idx} className="py-2 px-1 border border-gray-200 text-center">
                        <span className={clsx(
                          isAgainstOrWithhold ? "text-red-700 font-semibold" : "text-gray-700"
                        )}>
                          {vote || ''}
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

    </section>
  );
};

export default ShareholderProposalsSection;

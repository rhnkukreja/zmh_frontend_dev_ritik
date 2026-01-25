import { ChartsData, ChartDataItem, YearlyVotingData } from "@/types/companyReport";
import zmhLogo from "@/assets/images/logo/zmh-logo.jpg";
import clsx from "clsx";
import { useState } from "react";

interface VotingGovernanceSectionProps {
  data: ChartsData;
}

interface VotingCardProps {
  title: string;
  items: Record<string, YearlyVotingData> | ChartDataItem[] | undefined;
}

// Convert year-keyed object to array format
const normalizeToArray = (data: Record<string, YearlyVotingData> | ChartDataItem[] | undefined): ChartDataItem[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  // Convert year-keyed object to array
  return Object.entries(data)
    .filter(([key]) => /^\d{4}$/.test(key))
    .map(([year, value]) => ({
      year,
      category: '',
      total_for_percentage: value.total_percent ? `${100 - parseFloat(value.total_percent)}%` : '0%',
      total_against_percentage: value.total_percent || '0%',
      voted_for: [],
      voted_against: []
    }))
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));
};

const VotingCard = ({ title, items }: VotingCardProps) => {
  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  // Normalize items to array format
  const itemsArray = normalizeToArray(items);
  
  if (itemsArray.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>
      <div className="p-4">
        {itemsArray.map((item, index) => (
          <div
            key={`${item.year}-${index}`}
            className={clsx(
              "mb-3 last:mb-0",
              index > 0 && "pt-3 border-t border-gray-100"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {item.year}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                  For: {item.total_for_percentage}
                </span>
                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                  Against: {item.total_against_percentage}
                </span>
              </div>
            </div>

            {/* Progress bar visualization */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 h-full"
                style={{
                  width: `${parseFloat(item.total_for_percentage?.replace("%", "") || "0")}%`,
                }}
              />
              <div
                className="bg-red-500 h-full"
                style={{
                  width: `${parseFloat(item.total_against_percentage?.replace("%", "") || "0")}%`,
                }}
              />
            </div>

            {/* Collapsible voter details */}
            <button
              onClick={() =>
                setExpandedYear(expandedYear === item.year ? null : item.year)
              }
              className="text-xs text-primary mt-2 hover:underline exclude-from-pdf"
            >
              {expandedYear === item.year ? "Hide Details" : "Show Voter Details"}
            </button>

            {expandedYear === item.year && (
              <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                {item.voted_for && item.voted_for.length > 0 && (
                  <div>
                    <p className="font-medium text-green-700 mb-1">Voted For:</p>
                    <ul className="space-y-1">
                      {item.voted_for.slice(0, 5).map((voter, idx) => (
                        <li key={idx} className="text-gray-600">
                          • {voter.institution_name}
                          {voter.percentage && ` (${voter.percentage})`}
                        </li>
                      ))}
                      {item.voted_for.length > 5 && (
                        <li className="text-gray-400">
                          +{item.voted_for.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                {item.voted_against && item.voted_against.length > 0 && (
                  <div>
                    <p className="font-medium text-red-700 mb-1">Voted Against:</p>
                    <ul className="space-y-1">
                      {item.voted_against.slice(0, 5).map((voter, idx) => (
                        <li key={idx} className="text-gray-600">
                          • {voter.institution_name}
                          {voter.percentage && ` (${voter.percentage})`}
                        </li>
                      ))}
                      {item.voted_against.length > 5 && (
                        <li className="text-gray-400">
                          +{item.voted_against.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const VotingGovernanceSection = ({ data }: VotingGovernanceSectionProps) => {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <img src={zmhLogo} alt="ZMH Logo" className="h-6 w-auto" />
        <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-1 flex-1">
          Voting & Governance Insights
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VotingCard
          title="Election of Directors"
          items={data.election_of_directors || []}
        />
        <VotingCard
          title="Say on Pay"
          items={data.say_on_pay || []}
        />
        <VotingCard
          title="Shareholder Proposals"
          items={data.shareholder_proposals || []}
        />
        <VotingCard
          title="Ratification of Auditor"
          items={data.ratification_of_auditor || []}
        />
      </div>
    </section>
  );
};

export default VotingGovernanceSection;

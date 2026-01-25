import zmhLogo from "@/assets/images/logo/zmh-logo.jpg";

interface EngagementItem {
  year?: string | number;
  institution__institution?: string;
  company__name?: string;
  env_list?: string;
  soc_list?: string;
  gov_list?: string;
  [key: string]: any;
}

interface EngagementStatsSectionProps {
  data: EngagementItem[] | Record<string, any> | null | undefined;
  exGlobalData?: EngagementItem[] | Record<string, any> | null | undefined;
  companyName?: string;
}

// Parse topic list string into array
const parseTopicList = (topicStr: string | undefined): string[] => {
  if (!topicStr || topicStr.trim() === '') return [];
  return topicStr.split(',').map(t => t.trim()).filter(Boolean);
};

// Topic Badge with E/S/G prefix
const TopicBadge = ({ topic, type }: { topic: string; type: 'E' | 'S' | 'G' }) => {
  const colors = {
    E: 'bg-[#05703E]',
    S: 'bg-[#F5A623]',
    G: 'bg-[#115096]'
  };

  return (
    <span className={`inline-block px-1.5 py-0.5 ${colors[type]} text-white rounded text-[9px] font-medium mr-1 mb-1`}>
      {topic}
    </span>
  );
};

const normalizeToArray = (data: any): EngagementItem[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  if (typeof data === 'object') {
    const possibleArrayKeys = ['data', 'results', 'items', 'engagements', 'records'];
    for (const key of possibleArrayKeys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }
    
    // Check for year-keyed structure
    const keys = Object.keys(data);
    if (keys.length > 0 && keys.every(k => /^\d{4}$/.test(k))) {
      const flattened: EngagementItem[] = [];
      keys.forEach(year => {
        const items = Array.isArray(data[year]) ? data[year] : [];
        items.forEach((item: any) => {
          flattened.push({ ...item, year: item.year || year });
        });
      });
      return flattened;
    }
    
    return [data];
  }
  
  return [];
};

interface CompanyEngagementTableProps {
  title: string;
  subtitle?: string;
  data: EngagementItem[];
}

const CompanyEngagementTable = ({ title, subtitle, data }: CompanyEngagementTableProps) => {
  if (data.length === 0) {
    return (
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-500 mb-2">{subtitle}</p>}
        <div className="bg-gray-50 rounded p-4 text-center">
          <p className="text-gray-500 text-xs">No engagement data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
      {subtitle && <p className="text-[10px] text-gray-500 mb-2">{subtitle}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-primary text-white">
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300 w-16">Year</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300 w-40">Investor</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300">Environmental</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300">Social</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300">Governance</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((item, index) => {
              const envTopics = parseTopicList(item.env_list);
              const socTopics = parseTopicList(item.soc_list);
              const govTopics = parseTopicList(item.gov_list);
              
              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-1.5 px-2 border border-gray-200">{item.year || '-'}</td>
                  <td className="py-1.5 px-2 border border-gray-200 font-medium">{item.institution__institution || '-'}</td>
                  <td className="py-1.5 px-2 border border-gray-200">
                    <div className="flex flex-wrap">
                      {envTopics.length > 0 ? (
                        envTopics.map((topic, idx) => (
                          <TopicBadge key={idx} topic={topic} type="E" />
                        ))
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 border border-gray-200">
                    <div className="flex flex-wrap">
                      {socTopics.length > 0 ? (
                        socTopics.map((topic, idx) => (
                          <TopicBadge key={idx} topic={topic} type="S" />
                        ))
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 border border-gray-200">
                    <div className="flex flex-wrap">
                      {govTopics.length > 0 ? (
                        govTopics.map((topic, idx) => (
                          <TopicBadge key={idx} topic={topic} type="G" />
                        ))
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.length > 15 && (
          <p className="text-[10px] text-gray-500 mt-1 text-center">
            Showing 15 of {data.length} engagements
          </p>
        )}
      </div>
    </div>
  );
};

interface PeerEngagementTableProps {
  title: string;
  subtitle?: string;
  data: EngagementItem[];
}

const PeerEngagementTable = ({ title, subtitle, data }: PeerEngagementTableProps) => {
  if (data.length === 0) {
    return (
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-500 mb-2">{subtitle}</p>}
        <div className="bg-gray-50 rounded p-4 text-center">
          <p className="text-gray-500 text-xs">No peer engagement data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
      {subtitle && <p className="text-[10px] text-gray-500 mb-2">{subtitle}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-primary text-white">
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300 w-14">Year</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300 w-32">Investor</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300 w-32">Company</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300">Environmental</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300">Social</th>
              <th className="text-left py-1.5 px-2 font-medium border border-gray-300">Governance</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((item, index) => {
              const envTopics = parseTopicList(item.env_list);
              const socTopics = parseTopicList(item.soc_list);
              const govTopics = parseTopicList(item.gov_list);
              
              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-1.5 px-2 border border-gray-200">{item.year || '-'}</td>
                  <td className="py-1.5 px-2 border border-gray-200 font-medium truncate max-w-[120px]">{item.institution__institution || '-'}</td>
                  <td className="py-1.5 px-2 border border-gray-200 truncate max-w-[120px]">{item.company__name || '-'}</td>
                  <td className="py-1.5 px-2 border border-gray-200">
                    <div className="flex flex-wrap">
                      {envTopics.length > 0 ? (
                        envTopics.map((topic, idx) => (
                          <TopicBadge key={idx} topic={topic} type="E" />
                        ))
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 border border-gray-200">
                    <div className="flex flex-wrap">
                      {socTopics.length > 0 ? (
                        socTopics.map((topic, idx) => (
                          <TopicBadge key={idx} topic={topic} type="S" />
                        ))
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 border border-gray-200">
                    <div className="flex flex-wrap">
                      {govTopics.length > 0 ? (
                        govTopics.map((topic, idx) => (
                          <TopicBadge key={idx} topic={topic} type="G" />
                        ))
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.length > 15 && (
          <p className="text-[10px] text-gray-500 mt-1 text-center">
            Showing 15 of {data.length} engagements
          </p>
        )}
      </div>
    </div>
  );
};

const EngagementStatsSection = ({ data, exGlobalData, companyName }: EngagementStatsSectionProps) => {
  const companyEngagements = normalizeToArray(data);
  const peerEngagements = normalizeToArray(exGlobalData);

  // Get most recent year for filtering
  const allYears = [...companyEngagements, ...peerEngagements]
    .map(item => String(item.year))
    .filter(Boolean)
    .sort((a, b) => parseInt(b) - parseInt(a));
  
  const recentYear = allYears[0] || new Date().getFullYear().toString();

  return (
    <section className="mb-6 page-break-inside-avoid">
      <div className="flex items-center gap-3 mb-3">
        <img src={zmhLogo} alt="ZMH Logo" className="h-5 w-auto" />
        <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-1 flex-1">
          Engagement Statistics
        </h2>
      </div>

      {/* Company Engagement History */}
      <CompanyEngagementTable 
        title={`${companyName || 'Company'}: Investor disclosed engagement history (${recentYear} only)`}
        data={companyEngagements}
      />

      {/* Peer Engagement */}
      <PeerEngagementTable 
        title={`Engagement topics for peers`}
        subtitle="Shows engagement data for all companies in the same peer grouping"
        data={peerEngagements}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 bg-[#05703E] text-white rounded text-[8px] font-semibold">E</span>
          <span>Environmental</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 bg-[#F5A623] text-white rounded text-[8px] font-semibold">S</span>
          <span>Social</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 bg-[#115096] text-white rounded text-[8px] font-semibold">G</span>
          <span>Governance</span>
        </div>
      </div>
    </section>
  );
};

export default EngagementStatsSection;

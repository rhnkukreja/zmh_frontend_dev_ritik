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

// Format topics as simple comma-separated text
const formatTopics = (topics: string[]): string => {
  if (topics.length === 0) return '-';
  return topics.join(', ');
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
      <div className="overflow-visible">
        <table className="w-full text-xs border-collapse table-fixed">
          <thead>
            <tr className="bg-primary text-white">
              <th className="text-left py-2 px-3 font-medium border border-gray-300 w-[50px]">Year</th>
              <th className="text-left py-2 px-3 font-medium border border-gray-300">Investor</th>
              <th className="text-left py-2 px-3 font-medium border border-gray-300 w-[100px]">Environmental</th>
              <th className="text-left py-2 px-3 font-medium border border-gray-300 w-[80px]">Social</th>
              <th className="text-left py-2 px-3 font-medium border border-gray-300 w-[100px]">Governance</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((item, index) => {
              const envTopics = parseTopicList(item.env_list);
              const socTopics = parseTopicList(item.soc_list);
              const govTopics = parseTopicList(item.gov_list);
              
              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 border border-gray-200">{item.year || '-'}</td>
                  <td className="py-2 px-3 border border-gray-200 font-medium whitespace-nowrap">{item.institution__institution || '-'}</td>
                  <td className="py-2 px-3 border border-gray-200 text-green-700">{formatTopics(envTopics)}</td>
                  <td className="py-2 px-3 border border-gray-200 text-amber-600">{formatTopics(socTopics)}</td>
                  <td className="py-2 px-3 border border-gray-200 text-blue-700">{formatTopics(govTopics)}</td>
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
      <div className="overflow-visible">
        <table className="w-full text-xs border-collapse table-fixed">
          <thead>
            <tr className="bg-primary text-white">
              <th className="text-left py-2 px-3 font-medium border border-gray-300 w-[50px]">Year</th>
              <th className="text-left py-2 px-3 font-medium border border-gray-300 w-[18%]">Investor</th>
              <th className="text-left py-2 px-3 font-medium border border-gray-300 w-[22%]">Company</th>
              <th className="text-left py-2 px-3 font-medium border border-gray-300 w-[100px]">Environmental</th>
              <th className="text-left py-2 px-3 font-medium border border-gray-300 w-[80px]">Social</th>
              <th className="text-left py-2 px-3 font-medium border border-gray-300 w-[100px]">Governance</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((item, index) => {
              const envTopics = parseTopicList(item.env_list);
              const socTopics = parseTopicList(item.soc_list);
              const govTopics = parseTopicList(item.gov_list);
              
              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 border border-gray-200">{item.year || '-'}</td>
                  <td className="py-2 px-3 border border-gray-200 font-medium whitespace-nowrap">{item.institution__institution || '-'}</td>
                  <td className="py-2 px-3 border border-gray-200 whitespace-nowrap">{item.company__name || '-'}</td>
                  <td className="py-2 px-3 border border-gray-200 text-green-700">{formatTopics(envTopics)}</td>
                  <td className="py-2 px-3 border border-gray-200 text-amber-600">{formatTopics(socTopics)}</td>
                  <td className="py-2 px-3 border border-gray-200 text-blue-700">{formatTopics(govTopics)}</td>
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
    <>
      {/* Section for Company Engagement History */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <img src={zmhLogo} alt="ZMH Logo" className="h-6 w-auto" />
          <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 flex-1">
            Engagement Statistics
          </h2>
        </div>
        <CompanyEngagementTable 
          title={`${companyName || 'Company'}: Investor disclosed engagement history (${recentYear} only)`}
          data={companyEngagements}
        />
      </section>

      {/* Separate Section for Peer Engagement */}
      <section className="mb-8">
        <PeerEngagementTable 
          title={`Engagement topics for peers`}
          subtitle="Shows engagement data for all companies in the same peer grouping"
          data={peerEngagements}
        />
      </section>
    </>
  );
};

export default EngagementStatsSection;

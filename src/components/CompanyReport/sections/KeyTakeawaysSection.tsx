import { KeyTakeaway } from "@/types/companyReport";

interface KeyTakeawaysSectionProps {
  data: KeyTakeaway[];
}

const KeyTakeawaysSection = ({ data }: KeyTakeawaysSectionProps) => {
  const takeaways = Array.isArray(data) ? data : [];

  if (takeaways.length === 0) {
    return (
      <section className="mb-8" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
          Key Takeaways
        </h2>
        <div className="bg-gray-50 rounded p-4 text-center">
          <p className="text-gray-500 text-xs">No key takeaways data available</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
        Key Takeaways
      </h2>

      <div className="overflow-visible">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 px-3 font-semibold text-gray-700 w-[200px]">Topic</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-700">Key Takeaway</th>
            </tr>
          </thead>
          <tbody>
            {takeaways.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-3 px-3 font-medium text-gray-800 align-top">
                  {item.topic}
                </td>
                <td className="py-3 px-3 text-gray-700 align-top">
                  <span dangerouslySetInnerHTML={{ 
                    __html: formatActivismLens(item.activism_governance_lens) 
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

// Format activism lens - handle emojis and bold important parts
const formatActivismLens = (text: string): string => {
  if (!text) return '-';
  
  let formatted = text;
  
  // Handle red flag emoji
  if (formatted.includes('🔴')) {
    formatted = formatted.replace('🔴', '<span class="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>');
  }
  
  // Bold "Red flag:" text
  formatted = formatted.replace(/(Red flag:)/gi, '<strong class="text-red-600">$1</strong>');
  
  // Bold important phrases
  formatted = formatted.replace(/(most covered ownership)/gi, '<strong>$1</strong>');
  formatted = formatted.replace(/(Key pressure point)/gi, '<strong>$1</strong>');
  formatted = formatted.replace(/(Opportunity:)/gi, '<strong>$1</strong>');
  
  return formatted;
};

export default KeyTakeawaysSection;

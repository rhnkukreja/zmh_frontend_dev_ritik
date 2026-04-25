import { SharePricePerformanceData, PriceReturnData } from "@/types/companyReport";

interface EntityPerformance {
  "1yr"?: PriceReturnData;
  "3yr"?: PriceReturnData;
  "5yr"?: PriceReturnData;
  "10yr"?: PriceReturnData;
}

interface SharePricePerformanceSectionProps {
  data: SharePricePerformanceData;
  dataAsOf?: string;
  companyName?: string;
}

const SharePricePerformanceSection = ({ data, dataAsOf }: SharePricePerformanceSectionProps) => {
  // Get all entities except data_as_of
  const entities = Object.keys(data).filter(key => key !== 'data_as_of');

  // Find company (first entity that's not Nasdaq or S&P500)
  const companyKey = entities.find(key =>
    !key.toLowerCase().includes('nasdaq') &&
    !key.toLowerCase().includes('s&p') &&
    !key.toLowerCase().includes('sp500')
  );

  const nasdaqKey = entities.find(key => key.toLowerCase().includes('nasdaq'));
  const sp500Key = entities.find(key => key.toLowerCase().includes('s&p') || key.toLowerCase().includes('sp500'));

  const getReturn = (entityKey: string | undefined, period: '1yr' | '3yr' | '5yr' | '10yr'): number | null => {
    if (!entityKey) return null;
    const entityData = data[entityKey] as EntityPerformance;
    if (!entityData || typeof entityData === 'string') return null;
    return entityData[period]?.pct_return ?? null;
  };

  const getReturnClassName = (value: number | null) => {
    if (value === null || value === undefined || isNaN(value)) return "text-gray-700";
    if (value < 0) return "text-red-700 font-semibold";
    return "text-gray-700";
  };

  const formatReturn = (value: number | null) => {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return `${value.toFixed(1)}%`;
  };


  // Get the data_as_of from the data object or use the prop
  const displayDataAsOf = (data.data_as_of as string) || dataAsOf || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const companyReturns = companyKey
    ? {
        r1: getReturn(companyKey, '1yr'),
        r3: getReturn(companyKey, '3yr'),
        r5: getReturn(companyKey, '5yr')
      }
    : null;

  const nasdaqReturns = nasdaqKey
    ? {
        r1: getReturn(nasdaqKey, '1yr'),
        r3: getReturn(nasdaqKey, '3yr'),
        r5: getReturn(nasdaqKey, '5yr')
      }
    : null;

  const sp500Returns = sp500Key
    ? {
        r1: getReturn(sp500Key, '1yr'),
        r3: getReturn(sp500Key, '3yr'),
        r5: getReturn(sp500Key, '5yr')
      }
    : null;

  return (
    <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
        Share Price Performance
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs w-1/3">
                Name
              </th>
              <th className="text-center py-2 px-3 font-semibold text-gray-600 text-xs">
                1-Year
              </th>
              <th className="text-center py-2 px-3 font-semibold text-gray-600 text-xs">
                3-Year
              </th>
              <th className="text-center py-2 px-3 font-semibold text-gray-600 text-xs">
                5-Year
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Company Row */}
            {companyKey && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 text-gray-900 font-medium">
                  {companyKey}
                </td>
                <td className={`text-center py-2 px-3 ${getReturnClassName(companyReturns?.r1 ?? null)}`}>
                  {formatReturn(companyReturns?.r1 ?? null)}
                </td>
                <td className={`text-center py-2 px-3 ${getReturnClassName(companyReturns?.r3 ?? null)}`}>
                  {formatReturn(companyReturns?.r3 ?? null)}
                </td>
                <td className={`text-center py-2 px-3 ${getReturnClassName(companyReturns?.r5 ?? null)}`}>
                  {formatReturn(companyReturns?.r5 ?? null)}
                </td>
              </tr>
            )}
            {/* NASDAQ Composite Row */}
            {nasdaqKey && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 text-gray-900">
                  {nasdaqKey}
                </td>
                <td className={`text-center py-2 px-3 ${getReturnClassName(nasdaqReturns?.r1 ?? null)}`}>
                  {formatReturn(nasdaqReturns?.r1 ?? null)}
                </td>
                <td className={`text-center py-2 px-3 ${getReturnClassName(nasdaqReturns?.r3 ?? null)}`}>
                  {formatReturn(nasdaqReturns?.r3 ?? null)}
                </td>
                <td className={`text-center py-2 px-3 ${getReturnClassName(nasdaqReturns?.r5 ?? null)}`}>
                  {formatReturn(nasdaqReturns?.r5 ?? null)}
                </td>
              </tr>
            )}
            {/* S&P500 Index Row */}
            {sp500Key && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 text-gray-900">
                  {sp500Key}
                </td>
                <td className={`text-center py-2 px-3 ${getReturnClassName(sp500Returns?.r1 ?? null)}`}>
                  {formatReturn(sp500Returns?.r1 ?? null)}
                </td>
                <td className={`text-center py-2 px-3 ${getReturnClassName(sp500Returns?.r3 ?? null)}`}>
                  {formatReturn(sp500Returns?.r3 ?? null)}
                </td>
                <td className={`text-center py-2 px-3 ${getReturnClassName(sp500Returns?.r5 ?? null)}`}>
                  {formatReturn(sp500Returns?.r5 ?? null)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-2 italic">
        Source: Marketstack. Data as of {displayDataAsOf}
      </p>
    </section>
  );
};

export default SharePricePerformanceSection;

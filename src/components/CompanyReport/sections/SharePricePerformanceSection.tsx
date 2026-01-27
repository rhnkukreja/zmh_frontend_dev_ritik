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

  const formatReturn = (value: number | null) => {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return `${value.toFixed(1)}%`;
  };

  // Check if company underperforms both NASDAQ and S&P500 for any period
  const isUnderperforming = (period: '1yr' | '3yr' | '5yr'): boolean => {
    const companyReturn = getReturn(companyKey, period);
    const nasdaqReturn = getReturn(nasdaqKey, period);
    const sp500Return = getReturn(sp500Key, period);

    if (companyReturn === null) return false;

    const underNasdaq = nasdaqReturn !== null && companyReturn < nasdaqReturn;
    const underSP500 = sp500Return !== null && companyReturn < sp500Return;

    return underNasdaq && underSP500;
  };

  // Check if company underperforms in any period
  const hasRedFlag = isUnderperforming('1yr') || isUnderperforming('3yr') || isUnderperforming('5yr');

  // Get the data_as_of from the data object or use the prop
  const displayDataAsOf = (data.data_as_of as string) || dataAsOf || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          Share Price Performance
        </h2>
        {hasRedFlag && (
          <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 px-3 font-medium text-gray-700 w-1/3">
                Name
              </th>
              <th className="text-center py-2 px-3 font-medium text-gray-700">
                1-year
              </th>
              <th className="text-center py-2 px-3 font-medium text-gray-700">
                3-year
              </th>
              <th className="text-center py-2 px-3 font-medium text-gray-700">
                5-year
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
                <td className={`text-center py-2 px-3 ${isUnderperforming('1yr') ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                  {formatReturn(getReturn(companyKey, '1yr'))}
                </td>
                <td className={`text-center py-2 px-3 ${isUnderperforming('3yr') ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                  {formatReturn(getReturn(companyKey, '3yr'))}
                </td>
                <td className={`text-center py-2 px-3 ${isUnderperforming('5yr') ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                  {formatReturn(getReturn(companyKey, '5yr'))}
                </td>
              </tr>
            )}
            {/* NASDAQ Composite Row */}
            {nasdaqKey && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 text-gray-900">
                  {nasdaqKey}
                </td>
                <td className="text-center py-2 px-3 text-gray-700">
                  {formatReturn(getReturn(nasdaqKey, '1yr'))}
                </td>
                <td className="text-center py-2 px-3 text-gray-700">
                  {formatReturn(getReturn(nasdaqKey, '3yr'))}
                </td>
                <td className="text-center py-2 px-3 text-gray-700">
                  {formatReturn(getReturn(nasdaqKey, '5yr'))}
                </td>
              </tr>
            )}
            {/* S&P500 Index Row */}
            {sp500Key && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 text-gray-900">
                  {sp500Key}
                </td>
                <td className="text-center py-2 px-3 text-gray-700">
                  {formatReturn(getReturn(sp500Key, '1yr'))}
                </td>
                <td className="text-center py-2 px-3 text-gray-700">
                  {formatReturn(getReturn(sp500Key, '3yr'))}
                </td>
                <td className="text-center py-2 px-3 text-gray-700">
                  {formatReturn(getReturn(sp500Key, '5yr'))}
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

import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import { useState, useEffect } from "react";
import ReactCountryFlag from "react-country-flag";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import TradingViewWidget from "@/components/TradingViewWidget";
import { axiosInstance } from "@/services";
import LoadingWrapper from "@/components/LoadingWrapper";

const CountryInfoHeader = () => {
  const { finhub , companyGlobalSearchTicker ,companyGlobalSearchName } = useAppSelector((state: RootState) => state.authentiction);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [sharePrice, setSharePrice] = useState<any>(null);

  useEffect(() => {
    const fetchSharePrice = async () => {
      try {
        const symbol = finhub?.ticker || companyGlobalSearchTicker;
        const response = await axiosInstance.get(`/share_price/?symbols=${symbol}`);
        console.log("Share price data:", response.data);
        setSharePrice(response.data);
      } catch (error) {
        console.error("Error fetching share price:", error);
      }
    };

    if (finhub?.ticker || companyGlobalSearchTicker) {
      fetchSharePrice();
    }
  }, [finhub?.ticker, companyGlobalSearchTicker]);

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-4 flex flex-col md:flex-row items-center justify-between">
      <div className="flex items-center gap-4 mb-2 md:mb-0">
        {finhub?.logo && (
          <div className="w-6 h-6 image-fit object-contain">
            <img
              alt={finhub?.name}
              className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)]"
              src={finhub?.logo}
            />
          </div>
        )}
        <div className="flex items-center">
          <span className="font-semibold text-lg">
            {finhub?.name || companyGlobalSearchName} {finhub?.ticker ? `(${finhub?.ticker})` :  `(${companyGlobalSearchTicker})`}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center mb-2 md:mb-0">
        {finhub?.country && (
          <ReactCountryFlag
            countryCode={finhub?.country}
            svg
            style={{ fontSize: "1.5em", lineHeight: "1.5em" }}
          />
        )}
        {finhub?.exchange && (
          <span className="text-gray-600 text-sm ml-2">{finhub?.exchange}</span>
        )}
      </div>

      {finhub?.finnhub_industry ? (
        <div className="flex items-center">
          <div className="flex flex-row items-start gap-2">
            <p className="text-gray-600 font-medium text-sm">Industry:</p>
            <p className="text-gray-500 text-sm">{finhub?.finnhub_industry}</p>
          </div>
        </div>
      ):""}

      <div className="flex items-center gap-2">
        <div
          className="cursor-pointer p-2 bg-red-100 rounded-full hover:bg-red-200 transition-all shadow-md"
          onClick={() => setIsChartOpen(true)}
        >
          <Lucide icon="TrendingUp" className="w-7 h-7 text-[#800000] hover:text-red-800" />
        </div>
        
        <div
          className="cursor-pointer p-2 bg-red-100 rounded-full hover:bg-red-200 transition-all shadow-md"
          onClick={() => setIsTableOpen(true)}
        >
          <Lucide icon="Table" className="w-7 h-7 text-[#800000] hover:text-red-800" />
        </div>
      </div>

      <Dialog size="xl" open={isChartOpen} onClose={() => setIsChartOpen(false)}>
        <Dialog.Panel>
          <Dialog.Title>
            <h2 className="text-xl font-semibold">{finhub?.name || companyGlobalSearchName} Chart</h2>
            <div
              onClick={() => setIsChartOpen(false)}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description>
            <div className="w-full h-[500px]">
              <TradingViewWidget symbol={finhub?.ticker} />
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>

      <Dialog
        open={isTableOpen}
        onClose={() => setIsTableOpen(false)}
        className="relative z-50"
        size="5xl"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-7xl mx-auto bg-white rounded-lg p-8 shadow-xl overflow-hidden">
            <Dialog.Title className="text-xl font-semibold mb-6 text-center">
              {finhub?.name || companyGlobalSearchName} - Share Price Data
            </Dialog.Title>
            <div className="overflow-auto max-h-[calc(90vh-200px)]">
              {sharePrice && Object.keys(sharePrice).length > 0 ? (
                <div className="w-full">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Ticker</th>
                        <th className="border border-gray-300 px-3 py-3 text-center font-semibold" colSpan={3}>1yr</th>
                        <th className="border border-gray-300 px-3 py-3 text-center font-semibold" colSpan={3}>3yr</th>
                        <th className="border border-gray-300 px-3 py-3 text-center font-semibold" colSpan={3}>5yr</th>
                        <th className="border border-gray-300 px-3 py-3 text-center font-semibold" colSpan={3}>10yr</th>
                      </tr>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2"></th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">Start Price</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">End Price</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">Return %</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">Start Price</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">End Price</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">Return %</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">Start Price</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">End Price</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">Return %</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">Start Price</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">End Price</th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium">Return %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(sharePrice).map(([ticker, data]: [string, any]) => {
                        // Skip entries with errors
                        if (data?.error) return null;
                        
                        return (
                          <tr key={ticker} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-3 font-semibold">{ticker}</td>
                            
                            {/* 1-yr data */}
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['1yr']?.start_price ? `$${data['1yr'].start_price}` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['1yr']?.end_price ? `$${data['1yr'].end_price}` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['1yr']?.pct_return ? `${(data['1yr'].pct_return * 100).toFixed(2)}%` : 'N/A'}
                            </td>

                            {/* 3-yr data */}
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['3yr']?.start_price ? `$${data['3yr'].start_price}` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['3yr']?.end_price ? `$${data['3yr'].end_price}` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['3yr']?.pct_return ? `${(data['3yr'].pct_return * 100).toFixed(2)}%` : 'N/A'}
                            </td>

                            {/* 5-yr data */}
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['5yr']?.start_price ? `$${data['5yr'].start_price}` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['5yr']?.end_price ? `$${data['5yr'].end_price}` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['5yr']?.pct_return ? `${(data['5yr'].pct_return * 100).toFixed(2)}%` : 'N/A'}
                            </td>

                            {/* 10-yr data */}
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['10yr']?.start_price ? `$${data['10yr'].start_price}` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['10yr']?.end_price ? `$${data['10yr'].end_price}` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['10yr']?.pct_return ? `${(data['10yr'].pct_return * 100).toFixed(2)}%` : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <LoadingWrapper height={200} />
              )}
            </div>
            <div className="flex justify-center mt-6 pt-4 border-t">
              <button
                onClick={() => setIsTableOpen(false)}
                className="px-8 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default CountryInfoHeader;

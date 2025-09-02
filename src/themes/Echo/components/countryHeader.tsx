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
  const { finhub, companyGlobalSearchTicker, companyGlobalSearchName } = useAppSelector((state: RootState) => state.authentiction);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [sharePrice, setSharePrice] = useState<any>(null);

  const currentDateET = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

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
            {finhub?.name || companyGlobalSearchName} {finhub?.ticker ? `(${finhub?.ticker})` : `(${companyGlobalSearchTicker})`}
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
      ) : ""}

      <div className="flex items-center gap-2 border border-gray-200 rounded-full p-1">
        <button
          className="flex items-center gap-1 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
          onClick={() => setIsChartOpen(true)}
        >
          <Lucide icon="TrendingUp" className="w-5 h-5 text-pink-400" />
          <span className="text-sm font-medium text-gray-700">Chart</span>
        </button>

        <button
          className="relative flex items-center gap-1 pl-3 pr-6 py-1 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={() => setIsTableOpen(true)}
        >
          <Lucide icon="Table" className="w-5 h-5 text-pink-400" />
          <span className="text-sm font-medium text-gray-700">Price Perf.</span>
          <span className="absolute top-0 right-0 -mt-1 mr-1 text-[6px] font-bold text-white bg-orange-500 rounded-full px-0.5 animate-pulse">
            NEW
          </span>
        </button>
      </div>

      <Dialog size="xl" open={isChartOpen} onClose={() => setIsChartOpen(false)}>
        <Dialog.Panel>
          <Dialog.Title>
            <h2 className="text-xl font-semibold">{finhub?.name || companyGlobalSearchName} -  Price Chart</h2>
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
        size="xl"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-7xl mx-auto bg-white rounded-lg p-8 shadow-xl overflow-hidden">
            <Dialog.Title className="text-xl font-semibold mb-6 text-center relative">
              {finhub?.name || companyGlobalSearchName} - Share Price Performance (%)
              <div
                onClick={() => setIsTableOpen(false)}
                className="absolute top-0 right-0 mt-0 mr-0 cursor-pointer"
              >
                <Lucide icon="X" className="w-8 h-8 text-slate-400 hover:text-slate-600" />
              </div>
            </Dialog.Title>
            <div className="overflow-auto max-h-[calc(90vh-200px)]">
              {sharePrice && Object.keys(sharePrice).length > 0 ? (
                <div className="w-full">
                  <table className="w-full border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-300">
                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                        <th className="px-3 py-3 text-center font-semibold">1-year</th>
                        <th className="px-3 py-3 text-center font-semibold">3-year</th>
                        <th className="px-3 py-3 text-center font-semibold">5-year</th>
                        <th className="px-3 py-3 text-center font-semibold">10-year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(sharePrice).map(([ticker, data]: [string, any]) => {
                        if (ticker === "data_as_of") return null; // 🚨 skip this key
                        if (data?.error) return null;

                        return (
                          <tr key={ticker} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-3 font-semibold">{ticker}</td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['1yr']?.pct_return ? `${data['1yr'].pct_return}%` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['3yr']?.pct_return ? `${data['3yr'].pct_return}%` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['5yr']?.pct_return ? `${data['5yr'].pct_return}%` : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['10yr']?.pct_return ? `${data['10yr'].pct_return}%` : 'N/A'}
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
            <div className="mt-4">
              <p className="text-xs text-gray-500 italic">
                <strong>
                  Source: Marketstack. Data as of {sharePrice?.data_as_of || "N/A"}
                </strong>
              </p>
            </div>

          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default CountryInfoHeader;
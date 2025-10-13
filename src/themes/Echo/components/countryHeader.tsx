import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import { useState, useEffect } from "react";
import ReactCountryFlag from "react-country-flag";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import TradingViewWidget from "@/components/TradingViewWidget";
import { axiosInstance } from "@/services";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import ReactSelectAsync from "@/components/ReactSelectAsync";
import Litepicker from "@/components/Base/Litepicker";

const CountryInfoHeader = () => {
  const { finhub, companyGlobalSearchTicker, companyGlobalSearchName } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [sharePriceCache, setSharePriceCache] = useState<Record<string, any>>({});
  const [sharePrice, setSharePrice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Filter state
  const [endDate, setEndDate] = useState<string>("");
  const [selectedCompanies, setSelectedCompanies] = useState<any[]>([]);

  const symbol = finhub?.ticker || companyGlobalSearchTicker;

  const fetchSharePrice = async (symbols?: string, date?: string) => {
    const symbolsToFetch = symbols || symbol;
    if (!symbolsToFetch) return;

    // Create cache key including symbols and date
    const cacheKey = `${symbolsToFetch}_${date || ''}`;
    
    // ✅ Use cached response if available
    if (sharePriceCache[cacheKey]) {
      setSharePrice(sharePriceCache[cacheKey]);
      return;
    }

    try {
      setLoading(true);
      setSharePrice(null);

      let url = `/share_price/?symbols=${symbolsToFetch}`;
      if (date) {
        url += `&end_date=${date}`;
      }

      const response = await axiosInstance.get(url);
      setSharePrice(response.data);

      // ✅ Save in cache
      setSharePriceCache((prev) => ({
        ...prev,
        [cacheKey]: response.data,
      }));
    } catch (error) {
      console.error("Error fetching share price:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const symbolsParam = selectedCompanies.length > 0 
      ? selectedCompanies.map(company => {
          // Extract ticker/symbol from the company object
          return company.symbol || company.company?.symbol || company.company?.ticker || company.value;
        }).filter(Boolean).join(',')
      : symbol;
    fetchSharePrice(symbolsParam, endDate);
  };

  const handleResetFilters = () => {
    setEndDate("");
    setSelectedCompanies([]);
    fetchSharePrice();
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-4 flex flex-col md:flex-row items-center justify-between">
      {/* Company Header */}
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
        <span className="font-semibold text-lg">
          {finhub?.name || companyGlobalSearchName}{" "}
          {symbol ? `(${symbol})` : ""}
        </span>
      </div>

      {/* Country + Exchange */}
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

      {/* Industry */}
      {finhub?.finnhub_industry && (
        <div className="flex items-center">
          <div className="flex flex-row items-start gap-2">
            <p className="text-gray-600 font-medium text-sm">Industry:</p>
            <p className="text-gray-500 text-sm">{finhub?.finnhub_industry}</p>
          </div>
        </div>
      )}

      {/* Buttons */}
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
          onClick={() => {
            setIsTableOpen(true);
            fetchSharePrice(); // ✅ fetch only when opening
          }}
        >
          <Lucide icon="Table" className="w-5 h-5 text-pink-400" />
          <span className="text-sm font-medium text-gray-700">Price Perf.</span>
          <span className="absolute top-0 right-0 -mt-1 mr-1 text-[6px] font-bold text-white bg-orange-500 rounded-full px-0.5 animate-pulse">
            NEW
          </span>
        </button>
      </div>

      {/* Chart Modal */}
      <Dialog size="xl" open={isChartOpen} onClose={() => setIsChartOpen(false)}>
        <Dialog.Panel>
          <Dialog.Title>
            <h2 className="text-xl font-semibold">
              {finhub?.name || companyGlobalSearchName} - Price Chart
            </h2>
            <div
              onClick={() => setIsChartOpen(false)}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description>
            <div className="w-full h-[500px]">
              <TradingViewWidget symbol={symbol} />
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>

      {/* Price Performance Modal */}
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
              {finhub?.name || companyGlobalSearchName} - Share Price Performance
              <div
                onClick={() => setIsTableOpen(false)}
                className="absolute top-0 right-0 mt-0 mr-0 cursor-pointer"
              >
                <Lucide icon="X" className="w-8 h-8 text-slate-400 hover:text-slate-600" />
              </div>
            </Dialog.Title>

            {/* Filter Form */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <div className="relative">
                    <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                      <Lucide icon="Calendar" className="w-4 h-4" />
                    </div>
                    <Litepicker
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="Select end date"
                      options={{
                        autoApply: false,
                        showWeekNumbers: true,
                        dropdowns: {
                          minYear: 2000,
                          maxYear: new Date().getFullYear(),
                          months: true,
                          years: true,
                        },
                        maxDate: new Date().toISOString().split('T')[0],
                      }}
                      className="pl-12"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Companies
                  </label>
                  <ReactSelectAsync
                    value={selectedCompanies}
                    onChange={(selectedOption) => {
                      if (Array.isArray(selectedOption)) {
                        // Limit to maximum 5 companies
                        if (selectedOption.length <= 5) {
                          setSelectedCompanies(selectedOption);
                        }
                      } else if (selectedOption) {
                        // Check if adding this company would exceed the limit
                        if (selectedCompanies.length < 5) {
                          setSelectedCompanies([selectedOption]);
                        }
                      } else {
                        setSelectedCompanies([]);
                      }
                    }}
                    isMulti={true}
                    placeholder="Search and select companies (max 5)..."
                    className="w-full"
                  />
                  {selectedCompanies.length >= 5 && (
                    <p className="mt-1 text-xs text-amber-600">
                      Maximum 5 companies can be selected
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleApplyFilters}
                  className="bg-red-800 hover:bg-red-900 text-white"
                >
                  Apply
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={handleResetFilters}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="overflow-auto max-h-[calc(90vh-400px)] relative">
              {loading ? (
                <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                  <LoadingIcon
                    color="#800000"
                    icon="three-dots"
                    className="w-16 h-16"
                  />
                </div>
              ) : sharePrice && Object.keys(sharePrice).length > 0 ? (
                <div className="w-full">
                  <table className="w-full border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-300">
                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                        <th className="px-3 py-3 text-center font-semibold">1-year</th>
                        <th className="px-3 py-3 text-center font-semibold">3-year</th>
                        <th className="px-3 py-3 text-center font-semibold">5-year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(sharePrice).map(([ticker, data]: [string, any]) => {
                        if (ticker === "data_as_of") return null;
                        if (data?.error) return null;
                        return (
                          <tr key={ticker} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-3 font-semibold">{ticker}</td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['1yr']?.pct_return !== undefined
                                ? `${Number(data['1yr'].pct_return).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['3yr']?.pct_return !== undefined
                                ? `${Number(data['3yr'].pct_return).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center">
                              {data['5yr']?.pct_return !== undefined
                                ? `${Number(data['5yr'].pct_return).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="mt-4">
                    <p className="text-xs text-gray-500 italic">
                      <strong>
                        Source: Marketstack. Data as of {sharePrice?.data_as_of || "N/A"}
                      </strong>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-10">No data available</p>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default CountryInfoHeader;

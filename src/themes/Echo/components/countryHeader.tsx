import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import { useState } from "react";
import ReactCountryFlag from "react-country-flag";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import TradingViewWidget from "@/components/TradingViewWidget";

const CountryInfoHeader = () => {
  const { finhub , companyGlobalSearchTicker ,companyGlobalSearchName } = useAppSelector((state: RootState) => state.authentiction);
  const [isChartOpen, setIsChartOpen] = useState(false);

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

      <div
        className="cursor-pointer ml-4 p-2 bg-red-100 rounded-full hover:bg-red-200 transition-all shadow-md"
        onClick={() => setIsChartOpen(true)}
      >
        <Lucide icon="TrendingUp" className="w-7 h-7 text-[#800000] hover:text-red-800" />
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
    </div>
  );
};

export default CountryInfoHeader;

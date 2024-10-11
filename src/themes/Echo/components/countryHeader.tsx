import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import ReactCountryFlag from "react-country-flag";

const CountryInfoHeader = () => {
  const { finhub } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
      <div className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          {finhub?.logo && (
            <div className="w-6 h-6 image-fit object-contain">
              {/* Direct image rendering without Tippy */}
              <img
                alt={finhub?.name}
                className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)]"
                src={finhub?.logo}
              />
            </div>
          )}
          <div className="font-semibold text-lg">{finhub?.name}</div>
        </div>
        <div className="flex items-center gap-2">
          {finhub?.country && (
            <ReactCountryFlag
              countryCode={finhub?.country}
              svg
              style={{
                fontSize: "1.5em",
                lineHeight: "1.5em",
              }}
            />
          )}
          <span className="text-gray-600 text-sm">{finhub?.exchange}</span>
        </div>
      </div>

      <div className="flex flex-row justify-between items-center pt-2">
        {/* Contact Section */}
        <div className="flex flex-col items-start">
          <p className="text-gray-600 font-medium text-sm">Contact</p>
          <p className="text-gray-500 text-sm">{finhub?.phone}</p>
        </div>

        <div className="flex flex-col items-start">
          <p className="text-gray-600 font-medium text-sm">Ticker</p>
          <p className="text-gray-500 text-sm">{finhub?.ticker}</p>
        </div>

        {/* Industry Section */}
        <div className="flex flex-col items-start">
          <p className="text-gray-600 font-medium text-sm">Industry</p>
          <p className="text-gray-500 text-sm">{finhub?.finnhub_industry}</p>
        </div>
      </div>
    </div>
  );
};

export default CountryInfoHeader;

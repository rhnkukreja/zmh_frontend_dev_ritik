import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import ReactCountryFlag from "react-country-flag";

const CountryInfoHeader = () => {
  const { finhub } = useAppSelector((state: RootState) => state.authentiction);

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-4 flex items-center justify-between">
      {/* Left Section: Logo, Name, Ticker */}
      <div className="flex items-center gap-4">
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
            {finhub?.name} {finhub?.ticker && `(${finhub?.ticker})`}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center">
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
        {finhub?.exchange && (
          <span className="text-gray-600 text-sm ml-2">{finhub?.exchange}</span>
        )}
      </div>

      {finhub?.finnhub_industry && (
        <div className="flex items-center">
          <div className="flex flex-row items-start gap-2">
            <p className="text-gray-600 font-medium text-sm">Industry:</p>

            <p className="text-gray-500 text-sm">{finhub?.finnhub_industry}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryInfoHeader;

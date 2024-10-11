import Tippy from "@/components/Base/Tippy";
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import ReactCountryFlag from "react-country-flag";

const CountryInfoHeader = () => {
  const { finhub } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  console.log({ finhub});

  return (
    <div className="bg-white shadow-sm rounded-lg p-6 mb-6 ">
      <div className="flex flex-row items-center gap-6">
        <div className="p-y-4 mb-1 font-semibold text-xl flex gap-2">
        {finhub?.logo&&  <div className="w-6 h-6 image-fit zoom-in object-contain">
            <Tippy
              as="img"
              alt={finhub?.name}
              className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
              src={finhub?.logo}
              content={finhub?.name || ""}
            />
          </div>}
          {finhub?.name}
        </div>
        <span className="text-gray-600 text-sx">
          {finhub?.country && (
            <ReactCountryFlag
              className="emojiFlag mr-2"
              countryCode={finhub?.country}
              style={{
                fontSize: "1.5em",
                lineHeight: "1.5em",
              }}
              svg
            />
          )}
          {finhub?.exchange}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 pt-2">
        {/* Stock Information */}
        <div className="flex flex-col items-start space-y-1 ">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg">{finhub?.ticker}</span>
            <span className="text-gray-600 text-sm">
              ${finhub?.share_outstanding}
            </span>
            {/* <span className="text-red-500 text-sm">-2.51 (-1.10%)</span> */}
          </div>
          {/* <div className="text-gray-500 text-xs">
            <p>Last Updated Mon Oct 07 1:17 PM EDT</p>
          </div> */}
        </div>

        {/* Next Earnings Date */}
        <div className="flex flex-col items-start space-y-1">
          <p className="text-gray-600 text-sm">Contact</p>
          <p className="text-gray-400 text-xs">{finhub?.phone}</p>
        </div>

        {/* Sectors */}
        {/* <div className="flex flex-col items-start space-y-1">
          <p className="text-gray-600 text-sm">Information Technology</p>
          <p className="text-gray-400 text-xs">Sector</p>
        </div> */}

        <div className="flex flex-col items-start space-y-1">
          <p className="text-gray-600 text-sm">
            Industry
          </p>
          <p className="text-gray-400 text-xs">{finhub?.finnhub_industry}</p>
        </div>
      </div>
    </div>
  );
};

export default CountryInfoHeader;

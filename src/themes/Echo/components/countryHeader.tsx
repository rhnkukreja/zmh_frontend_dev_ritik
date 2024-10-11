import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import ReactCountryFlag from "react-country-flag";

const CountryInfoHeader = () => {
  const { companyGlobalSearchName, user } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  console.log({ user });

  return (
    <div className="bg-white shadow-sm rounded-lg p-6 mb-6 ">
      <div className="flex flex-row items-center gap-6">
        <div className="p-y-4 mb-1 font-semibold text-xl ">
          {companyGlobalSearchName}
        </div>
        <span className="text-gray-600 text-sx">
        {user?.finnhub?.country &&  <ReactCountryFlag
            className="emojiFlag mr-2"
            countryCode={user?.finnhub?.country}
            style={{
              fontSize: "1.5em",
              lineHeight: "1.5em",
            }}
            svg
          />}
          {user?.finnhub?.exchange}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 pt-2">
        {/* Stock Information */}
        <div className="flex flex-col items-start space-y-1 ">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg">{user?.finnhub?.ticker}</span>
            <span className="text-gray-600 text-sm">
              ${user?.finnhub?.share_outstanding}
            </span>
            {/* <span className="text-red-500 text-sm">-2.51 (-1.10%)</span> */}
          </div>
          {/* <div className="text-gray-500 text-xs">
            <p>Last Updated Mon Oct 07 1:17 PM EDT</p>
          </div> */}
        </div>

        {/* Next Earnings Date */}
        <div className="flex flex-col items-start space-y-1">
          <p className="text-gray-600 text-sm">Thu Oct 31st 2024</p>
          <p className="text-gray-400 text-xs">
            Next Earnings Date (During-Market)
          </p>
        </div>

        {/* Sectors */}
        <div className="flex flex-col items-start space-y-1">
          <p className="text-gray-600 text-sm">Information Technology</p>
          <p className="text-gray-400 text-xs">Sector</p>
        </div>

        <div className="flex flex-col items-start space-y-1">
          <p className="text-gray-600 text-sm">
            Technology Hardware, Storage And Peripherals
          </p>
          <p className="text-gray-400 text-xs">Sector</p>
        </div>
      </div>
    </div>
  );
};

export default CountryInfoHeader;

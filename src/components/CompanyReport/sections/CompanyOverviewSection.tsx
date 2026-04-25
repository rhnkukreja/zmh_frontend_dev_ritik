import { FinnhubData } from "@/types/companyReport";

interface CompanyOverviewSectionProps {
  data: FinnhubData;
}

const CompanyOverviewSection = ({ data }: CompanyOverviewSectionProps) => {
  return (
    <section className="mb-8 page-break-inside-avoid">
      <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
        Company Overview
      </h2>

      <div className="bg-gray-50 rounded-lg p-5">
        <div className="flex items-start gap-6">
          {data.logo_url && (
            <div className="flex-shrink-0">
              <img
                src={data.logo_url}
                alt={`${data.company_name} logo`}
                className="h-16 w-16 object-contain rounded-lg border border-gray-200 bg-white p-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {data.company_name}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="info-card">
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  Ticker
                </span>
                <p className="text-sm font-semibold text-gray-900">{data.ticker}</p>
              </div>

              <div className="info-card">
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  Exchange
                </span>
                <p className="text-sm font-semibold text-gray-900">
                  {data.exchange || "-"}
                </p>
              </div>

              <div className="info-card">
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  Industry
                </span>
                <p className="text-sm font-semibold text-gray-900">
                  {data.industry || "-"}
                </p>
              </div>

              {data.country && (
                <div className="info-card">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Country
                  </span>
                  <p className="text-sm font-semibold text-gray-900">
                    {data.country}
                  </p>
                </div>
              )}

              {data.market_cap && (
                <div className="info-card">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Market Cap
                  </span>
                  <p className="text-sm font-semibold text-gray-900">
                    {data.market_cap}
                  </p>
                </div>
              )}

              {data.ipo_date && (
                <div className="info-card">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    IPO Date
                  </span>
                  <p className="text-sm font-semibold text-gray-900">
                    {data.ipo_date}
                  </p>
                </div>
              )}
            </div>

            {data.website && (
              <div className="mt-3">
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  Website
                </span>
                <p className="text-sm text-primary font-medium">{data.website}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyOverviewSection;

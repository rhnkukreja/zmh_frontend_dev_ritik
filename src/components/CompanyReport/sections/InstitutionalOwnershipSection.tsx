import { PercentOwnershipData } from "@/types/companyReport";
import investorIcon from "@/assets/images/zmh-images/investor-icon.png";
import clsx from "clsx";

interface InstitutionalOwnershipSectionProps {
  data: PercentOwnershipData[];
}

const InstitutionalOwnershipSection = ({ data }: InstitutionalOwnershipSectionProps) => {
  // Ensure data is an array
  const dataArray = Array.isArray(data) ? data : [];

  if (dataArray.length === 0) {
    return (
      <section className="mb-8 page-break-inside-avoid">
        <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
          Institutional Ownership
        </h2>
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-500 text-sm">No institutional ownership data available</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 page-break-inside-avoid">
      <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
        Institutional Ownership
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 border-b border-gray-200 w-10">
                #
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 border-b border-gray-200">
                Institution
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 border-b border-gray-200">
                Ownership %
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 border-b border-gray-200">
                Proxy Influence
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 border-b border-gray-200">
                ESG
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 border-b border-gray-200">
                UN PRI
              </th>
            </tr>
          </thead>
          <tbody>
            {dataArray.slice(0, 20).map((institution, index) => (
              <tr
                key={institution.filer_id || index}
                className={clsx(
                  "border-b border-gray-100 hover:bg-gray-50",
                  index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                )}
              >
                <td className="py-3 px-4 text-sm text-gray-500 font-medium">
                  {index + 1}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={institution.institution_logo_url || investorIcon}
                      alt=""
                      className="w-8 h-8 rounded-full object-contain bg-gray-100 p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = investorIcon;
                      }}
                    />
                    <span className="font-medium text-gray-900 text-sm">
                      {institution.institution_name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                    {institution.percent_ownership}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-sm text-gray-600">
                  {institution.proxy_advisor_influence || "-"}
                </td>
                <td className="py-3 px-4 text-center">
                  {institution.esg_integration ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-xs">
                      ✓
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {institution.unpri_signatory ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs">
                      ✓
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 20 && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          Showing top 20 institutions out of {data.length} total
        </p>
      )}

      <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-4 h-4 bg-green-500 text-white rounded-full text-[10px]">
            ✓
          </span>
          <span>ESG Integration</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-500 text-white rounded-full text-[10px]">
            ✓
          </span>
          <span>UN PRI Signatory</span>
        </div>
      </div>
    </section>
  );
};

export default InstitutionalOwnershipSection;

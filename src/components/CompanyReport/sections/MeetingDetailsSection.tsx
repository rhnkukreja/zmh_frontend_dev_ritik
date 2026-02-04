import React from "react";
import clsx from "clsx";

interface MeetingDetailsSectionProps {
  data: Record<string, any> | null | undefined;
}

interface HeaderItem {
  header: string;
  field: string;
}

const MeetingDetailsSection = ({ data }: MeetingDetailsSectionProps) => {
  const details = data && typeof data === "object" && !Array.isArray(data) ? data : null;

  if (!details) {
    return (
      <section className="mb-10" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
        <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
          Shareholder Meeting Summary
        </h2>
        <div className="bg-gray-50 rounded p-4 text-center">
          <p className="text-gray-500 text-xs">No meeting details available</p>
        </div>
      </section>
    );
  }

  // Extract data arrays and headers (same structure as AGMSummaryCard)
  const nominees: Record<string, any>[] = Array.isArray(details.nominees) ? details.nominees : [];
  const nomineesHeaders: HeaderItem[] = Array.isArray(details.nominees_headers) ? details.nominees_headers : [];
  const proposals: Record<string, any>[] = Array.isArray(details.proposals) ? details.proposals : [];
  const proposalsHeaders: HeaderItem[] = Array.isArray(details.proposals_headers) ? details.proposals_headers : [];

  // Extract meeting date from company data if available
  let meetingDate = "";
  if (details.company && Array.isArray(details.company) && details.company.length > 0) {
    const companyObj = details.company[0];
    const companyName = Object.keys(companyObj)[0];
    const meetingInfo = companyObj[companyName];
    if (typeof meetingInfo === "string" && meetingInfo.includes(" - ")) {
      meetingDate = meetingInfo.split(" - ").pop() || "";
    }
  }

  const hasNominees = nominees.length > 0 && nomineesHeaders.length > 0;
  const hasProposals = proposals.length > 0 && proposalsHeaders.length > 0;

  if (!hasNominees && !hasProposals) {
    return (
      <section className="mb-10" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
        <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
          Shareholder Meeting Summary
        </h2>
        <div className="bg-gray-50 rounded p-4 text-center">
          <p className="text-gray-500 text-xs">No meeting details available</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Shareholder Meeting Summary</h2>
        {meetingDate && <p className="text-sm text-gray-600 italic">Meeting Date: {meetingDate}</p>}
      </div>

      {/* Nominees Table */}
      {hasNominees && (
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '35%' }} />
              {nomineesHeaders.slice(1).map((_, idx) => (
                <col key={idx} style={{ width: `${65 / (nomineesHeaders.length - 1)}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                {nomineesHeaders.map((header, idx) => (
                  <th
                    key={idx}
                    className="py-3 px-4 text-xs font-semibold text-gray-600 text-left"
                  >
                    {header.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nominees.map((nominee, rowIdx) => (
                <tr key={rowIdx} className="border-b border-gray-100">
                  {nomineesHeaders.map((header, colIdx) => {
                    const cellValue = nominee[header.field];
                    const isLastCol = colIdx === nomineesHeaders.length - 1;
                    const numericValue = parseFloat(cellValue);
                    const isLowPercentage = isLastCol && !isNaN(numericValue) && numericValue < 85;

                    return (
                      <td
                        key={colIdx}
                        className={clsx(
                          "py-3 px-4 text-left",
                          colIdx === 0 ? "font-semibold text-gray-800" : "text-gray-700",
                          isLowPercentage && "text-red-700 font-semibold"
                        )}
                      >
                        {cellValue ?? ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Proposals Table */}
      {hasProposals && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '35%' }} />
              {proposalsHeaders.slice(1).map((_, idx) => (
                <col key={idx} style={{ width: `${65 / (proposalsHeaders.length - 1)}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                {proposalsHeaders.map((header, idx) => (
                  <th
                    key={idx}
                    className="py-3 px-4 text-xs font-semibold text-gray-600 text-left"
                  >
                    {header.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal, rowIdx) => (
                <tr key={rowIdx} className="border-b border-gray-100">
                  {proposalsHeaders.map((header, colIdx) => {
                    const cellValue = proposal[header.field];
                    const isLastCol = colIdx === proposalsHeaders.length - 1;
                    const numericValue = parseFloat(cellValue);
                    const isLowPercentage = isLastCol && !isNaN(numericValue) && numericValue < 85;

                    return (
                      <td
                        key={colIdx}
                        className={clsx(
                          "py-3 px-4 text-left",
                          colIdx === 0 ? "font-semibold text-gray-800" : "text-gray-700",
                          isLowPercentage && "text-red-700 font-semibold"
                        )}
                      >
                        {cellValue ?? ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default MeetingDetailsSection;

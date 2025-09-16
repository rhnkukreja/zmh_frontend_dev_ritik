import React, { useState } from "react";
import TableWrapper from "../components/TableWrapper";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import { FaDownload } from "react-icons/fa";

// Dummy data for demonstration
const dummyData = {
  AMZN: [
    { name: "The Vanguard Group, Inc.", ownership: 7.5 },
    { name: "BlackRock Fund Advisors", ownership: 4.1 },
    { name: "SSgA Funds Management, Inc.", ownership: 3.5 },
    { name: "Fidelity Management & Research Co. LLC", ownership: 2.8 },
    { name: "Geode Capital Management LLC", ownership: 2.0 },
    { name: "T. Rowe Price Associates, Inc. (IM)", ownership: 1.4 },
    { name: "Norges Bank Investment Management", ownership: 1.2 },
  ],
  META: [
    { name: "The Vanguard Group, Inc.", ownership: 8.4 },
    { name: "Fidelity Management & Research Co. LLC", ownership: 5.7 },
    { name: "BlackRock Fund Advisors", ownership: 4.9 },
    { name: "SSgA Funds Management, Inc.", ownership: 4.0 },
    { name: "Geode Capital Management LLC", ownership: 2.4 },
    { name: "Capital Research & Management Co. (World Investors)", ownership: 1.8 },
    { name: "T. Rowe Price Associates, Inc. (IM)", ownership: 1.7 },
  ],
  MSFT: [
    { name: "The Vanguard Group, Inc.", ownership: 9.0 },
    { name: "BlackRock Fund Advisors", ownership: 5.0 },
    { name: "SSgA Funds Management, Inc.", ownership: 4.0 },
    { name: "Geode Capital Management LLC", ownership: 2.4 },
    { name: "Fidelity Management & Research Co. LLC", ownership: 2.3 },
    { name: "T. Rowe Price Associates, Inc. (IM)", ownership: 1.7 },
    { name: "Norges Bank Investment Management", ownership: 1.4 },
  ],
  ADBE: [
    { name: "The Vanguard Group, Inc.", ownership: 8.9 },
    { name: "BlackRock Fund Advisors", ownership: 5.8 },
    { name: "SSgA Funds Management, Inc.", ownership: 4.7 },
    { name: "Geode Capital Management LLC", ownership: 2.5 },
    { name: "BlackRock Advisors (UK) Ltd.", ownership: 1.2 },
    { name: "Norges Bank Investment Management", ownership: 1.2 },
    { name: "Amundi Asset Management US, Inc.", ownership: 1.1 },
  ],
  GOOG: [
    { name: "The Vanguard Group, Inc.", ownership: 7.3 },
    { name: "BlackRock Fund Advisors", ownership: 4.2 },
    { name: "SSgA Funds Management, Inc.", ownership: 3.5 },
    { name: "Geode Capital Management LLC", ownership: 2.0 },
    { name: "Capital Research & Management Co. (International Investors)", ownership: 1.7 },
    { name: "Fidelity Management & Research Co. LLC", ownership: 1.5 },
    { name: "T. Rowe Price Associates, Inc. (IM)", ownership: 1.2 },
  ],
};

const tickerOptions = Object.keys(dummyData).map(ticker => ({ value: ticker, label: ticker }));

function getPeerInvestors(selectedTickers: string[]) {
  // Find investors who appear in more than one selected ticker
  const investorCount: Record<string, number> = {};
  selectedTickers.forEach(ticker => {
    dummyData[ticker]?.forEach(inv => {
      investorCount[inv.name] = (investorCount[inv.name] || 0) + 1;
    });
  });
  return Object.entries(investorCount)
    .filter(([_, count]) => count > 1)
    .map(([name]) => name);
}

const CustomReports = () => {
  const [selectedTickers, setSelectedTickers] = useState<string[]>(["AMZN", "META"]);

  const peerInvestors = getPeerInvestors(selectedTickers);

  // Download CSV
  const handleDownload = () => {
    let csv = "Ticker,Investor Name,Ownership %\n";
    selectedTickers.forEach(ticker => {
      dummyData[ticker]?.slice(0, 20).forEach(inv => {
        csv += `${ticker},"${inv.name}",${inv.ownership}\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custom_reports.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="box p-5 mt-3.5">
      <div className="flex flex-col sm:flex-row gap-y-2 justify-between items-center mb-4">
        <h1 className="text-lg font-bold">Custom Reports</h1>
        <Button variant="primary" onClick={handleDownload} className="flex items-center gap-2">
          <FaDownload /> Download CSV
        </Button>
      </div>
      <div className="mb-6 max-w-xl">
        <MultiSelectDropdown
          data={tickerOptions}
          placeholder="Select up to 5 tickers"
          onChange={opts => setSelectedTickers(opts.map(o => o.value).slice(0, 5))}
          selectedOption={selectedTickers}
        />
      </div>
      <TableWrapper>
        <div className="overflow-x-auto">
          <Table>
            <Table.Thead>
              <Table.Tr className="bg-primary text-white text-sm">
                {selectedTickers.map(ticker => (
                  <>
                    <Table.Td className="px-4 py-2 font-semibold" key={ticker + "-name"}>{ticker}</Table.Td>
                    <Table.Td className="px-4 py-2 font-semibold" key={ticker + "-ownership"}>Ownership %</Table.Td>
                  </>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {[...Array(20)].map((_, rowIdx) => (
                <Table.Tr key={rowIdx}>
                  {selectedTickers.map(ticker => {
                    const inv = dummyData[ticker]?.[rowIdx];
                    if (!inv) return [<Table.Td key={ticker + rowIdx + "-name"}></Table.Td>, <Table.Td key={ticker + rowIdx + "-ownership"}></Table.Td>];
                    // Remove highlight
                    return [
                      <Table.Td key={ticker + rowIdx + "-name"}>{inv.name}</Table.Td>,
                      <Table.Td key={ticker + rowIdx + "-ownership"}>{inv.ownership}</Table.Td>
                    ];
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      </TableWrapper>
    </div>
  );
};

export default CustomReports;

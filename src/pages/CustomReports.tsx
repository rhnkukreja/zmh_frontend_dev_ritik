import React, { useState, useEffect } from "react";
import TableWrapper from "../components/TableWrapper";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { FaDownload, FaTimes } from "react-icons/fa";
import { reportsService, CompanyOwnership, OwnershipData } from "@/services/reports";
import { useAppSelector } from "@/stores/hooks";
import CompanySelect from "@/components/ReactSelectAsync";

const CustomReports = () => {
  // Get global company ticker from authentication store
  const { companyGlobalSearchTicker } = useAppSelector((state) => state.authentiction);
  
  // Initialize with global company ticker if available, otherwise use default values
  const getInitialTickers = () => {
    if (companyGlobalSearchTicker) {
      return [companyGlobalSearchTicker];
    }
    return ["AAPL", "AMZN"];
  };

  const [selectedTickers, setSelectedTickers] = useState<string[]>(getInitialTickers());
  const [ownershipData, setOwnershipData] = useState<CompanyOwnership[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Update selected tickers when global company changes
  useEffect(() => {
    if (companyGlobalSearchTicker && !selectedTickers.includes(companyGlobalSearchTicker)) {
      setSelectedTickers([companyGlobalSearchTicker]);
    }
  }, [companyGlobalSearchTicker]);

  // Fetch ownership data whenever selected tickers change
  useEffect(() => {
    if (selectedTickers.length > 0) {
      fetchOwnershipData();
    }
  }, [selectedTickers]);

  const fetchOwnershipData = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await reportsService.getMultipleTickersOwnership(selectedTickers);
      setOwnershipData(data);
    } catch (err) {
      setError("Failed to fetch ownership data. Please try again.");
      console.error("Error fetching ownership data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (selectedOptions: any) => {
    if (selectedOptions && selectedOptions.length > 0) {
      // Extract tickers from selected companies using the symbol field
      const newTickers = selectedOptions.slice(0, 5).map((option: any) => {
        return option.symbol || option.company?.symbol || option.company?.ticker || option.label.split(' ')[0];
      }).filter((ticker: string) => ticker); // Filter out any null/undefined values
      
      // Merge with existing tickers, keeping global company ticker if it exists
      const allTickers = [...new Set([...selectedTickers, ...newTickers])]; // Remove duplicates
      setSelectedTickers(allTickers.slice(0, 5)); // Limit to 5 companies
    } else {
      // Only clear if global company ticker is not present
      if (companyGlobalSearchTicker) {
        setSelectedTickers([companyGlobalSearchTicker]);
      } else {
        setSelectedTickers([]);
      }
    }
  };

  const removeTicker = (ticker: string) => {
    setSelectedTickers(selectedTickers.filter(t => t !== ticker));
  };

  // Download CSV
  const handleDownload = () => {
    let csv = "Ticker,Company Name,Investor Name,Ownership %\n";
    ownershipData.forEach(company => {
      company.ownership_data.slice(0, 20).forEach(inv => {
        csv += `${company.ticker},"${company.company_name}","${inv.institution_name}",${inv.percent_ownership}\n`;
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
        <Button 
          variant="primary" 
          onClick={handleDownload} 
          className="flex items-center gap-2"
          disabled={loading || ownershipData.length === 0}
        >
          <FaDownload /> Download CSV
        </Button>
      </div>

      {/* Ticker Search Section */}
      <div className="mb-8">
        <div className="mb-4 w-full">
          <CompanySelect
            value={[]}
            onChange={handleCompanySelect}
            isMulti={true}
            placeholder="Search and select up to 5 companies..."
            className="w-full"
            isClearable={true}
          />
        </div>

        {/* Selected Tickers */}
        <div className="flex flex-wrap gap-3 mb-3">
          {selectedTickers.map(ticker => (
            <div
              key={ticker}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md"
            >
              {ticker}
              <button
                onClick={() => removeTicker(ticker)}
                className="ml-1 hover:bg-white hover:text-primary rounded-full p-1 transition-colors duration-200"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-700 font-medium">Maximum 5 companies can be selected at a time.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-16 h-16"
          />
        </div>
      )}

      {/* Single Combined Table */}
      {!loading && ownershipData.length > 0 && (
        <TableWrapper>
          <div className="overflow-x-auto">
            <Table>
              <Table.Thead>
                <Table.Tr className="bg-primary text-white text-sm">
                  {ownershipData.map(company => (
                    <React.Fragment key={company.ticker}>
                      <Table.Td className="px-6 py-3 font-semibold text-left min-w-[250px]">
                        {company.ticker} - {company.company_name}
                      </Table.Td>
                      <Table.Td className="px-6 py-3 font-semibold text-center min-w-[120px]">Ownership %</Table.Td>
                    </React.Fragment>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[...Array(20)].map((_, rowIdx) => (
                  <Table.Tr key={rowIdx} className="hover:bg-gray-50 transition-colors duration-150">
                    {ownershipData.map(company => {
                      const inv = company.ownership_data?.[rowIdx];
                      if (!inv) {
                        return (
                          <React.Fragment key={company.ticker + rowIdx}>
                            <Table.Td className="px-6 py-3 text-gray-400 min-w-[250px]"></Table.Td>
                            <Table.Td className="px-6 py-3 text-gray-400 min-w-[120px]"></Table.Td>
                          </React.Fragment>
                        );
                      }
                      return (
                        <React.Fragment key={company.ticker + rowIdx}>
                          <Table.Td className="px-6 py-3 text-sm font-medium text-left min-w-[250px]">
                            <span className={inv.status ? "text-green-600 font-semibold" : "text-gray-900"}>
                              {inv.institution_name}
                            </span>
                          </Table.Td>
                          <Table.Td className="px-6 py-3 text-sm font-bold text-primary text-center min-w-[120px]">
                            {inv.percent_ownership}%
                          </Table.Td>
                        </React.Fragment>
                      );
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        </TableWrapper>
      )}

      {/* No Data State */}
      {!loading && ownershipData.length === 0 && selectedTickers.length > 0 && !error && (
        <div className="text-center py-8 text-gray-800 font-medium">
          No ownership data available for the selected tickers.
        </div>
      )}
    </div>
  );
};

export default CustomReports;

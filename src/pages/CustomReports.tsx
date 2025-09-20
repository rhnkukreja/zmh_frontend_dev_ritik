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

  // Update selected tickers when global company changes, but only on initial load or when empty
  useEffect(() => {
    // Only add the global ticker if:
    // 1. We have a global ticker
    // 2. We don't already have it in our selections
    // 3. Either this is initial load (selectedTickers is empty) OR we haven't manually removed it before
    const isInitialLoad = selectedTickers.length === 0 || 
                         (selectedTickers.length === 1 && selectedTickers[0] === "AAPL" || selectedTickers[0] === "AMZN");
                         
    if (companyGlobalSearchTicker && 
        !selectedTickers.includes(companyGlobalSearchTicker) && 
        isInitialLoad) {
      
      // Update the selected tickers
      setSelectedTickers([companyGlobalSearchTicker]);
      // Clear any existing data to prevent confusion
      setOwnershipData([]);
      
      // Initial load: fetch data
      if (isInitialLoad) {
        setTimeout(() => fetchOwnershipData(), 0);
      }
    }
  }, [companyGlobalSearchTicker]);

  // Fetch ownership data on initial load if we have selected tickers
  useEffect(() => {
    // On initial mount, if we have selected tickers, fetch data
    if (selectedTickers.length > 0) {
      fetchOwnershipData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on component mount, with explicit dependency list

  const fetchOwnershipData = async () => {
    if (selectedTickers.length === 0) {
      setError("Please select at least one company");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setOwnershipData([]); // Clear previous data
      
      // Create a fresh copy of the current selected tickers and normalize them to uppercase
      const currentTickers = [...selectedTickers].map(ticker => ticker.toUpperCase());
      console.log("Fetching data for tickers:", currentTickers);
      
      const data = await reportsService.getMultipleTickersOwnership(currentTickers);
      
      // Verify the response matches our requested tickers
      console.log("Received data for tickers:", data.map(item => item.ticker));
      
      // Ensure data is exactly matched with current ticker selections (case insensitive)
      const normalizedCurrentTickers = currentTickers.map(t => t.toUpperCase());
      const filteredData = data.filter(company => 
        normalizedCurrentTickers.includes(company.ticker.toUpperCase())
      );
      
      console.log("Final filtered data for tickers:", filteredData.map(item => item.ticker));
      setOwnershipData(filteredData);
      
      // Check if we're missing any data
      const returnedTickers = filteredData.map(item => item.ticker.toUpperCase());
      const missingTickers = normalizedCurrentTickers.filter(t => !returnedTickers.includes(t));
      if (missingTickers.length > 0) {
        console.warn("Missing data for tickers:", missingTickers);
      }
      
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
    // Remove the ticker from the selected list, including global ticker
    const updatedTickers = selectedTickers.filter(t => t !== ticker);
    
    // Update the selected tickers
    setSelectedTickers(updatedTickers);
    
    // If we have tickers left, fetch new data
    if (updatedTickers.length > 0) {
      // Use setTimeout to ensure state is updated before API call
      setTimeout(() => fetchOwnershipData(), 0);
    } else {
      // Clear the displayed data if no tickers left
      setOwnershipData([]);
    }
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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-[550px]">
            <CompanySelect
              value={[]}
              onChange={handleCompanySelect}
              isMulti={true}
              placeholder="Search by company name, ticker, or symbol (US company only)"
              className="w-full"
              isClearable={true}
            />
          </div>
          <Button
            variant="primary"
            onClick={fetchOwnershipData}
            className="whitespace-nowrap"
          >
            Apply
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => {
              // Just clear selections without triggering API call
              setSelectedTickers(companyGlobalSearchTicker ? [companyGlobalSearchTicker] : []);
              // Also clear any displayed data and errors
              setOwnershipData([]);
              setError("");
            }}
            className="whitespace-nowrap"
          >
            Clear
          </Button>
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
                title="Remove and update data"
                aria-label="Remove ticker and update data"
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
                  {/* Only show columns for companies that match currently selected tickers */}
                  {ownershipData
                    .filter(company => selectedTickers.map(t => t.toUpperCase()).includes(company.ticker.toUpperCase()))
                    .map(company => (
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
                    {/* Only show data for companies that match currently selected tickers */}
                    {ownershipData
                      .filter(company => selectedTickers.map(t => t.toUpperCase()).includes(company.ticker.toUpperCase()))
                      .map(company => {
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

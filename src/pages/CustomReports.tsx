import React, { useState, useEffect } from "react";
import TableWrapper from "../components/TableWrapper";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import FormInput from "@/components/Base/Form/FormInput";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { FaDownload, FaPlus, FaTimes } from "react-icons/fa";
import { reportsService, CompanyOwnership, OwnershipData } from "@/services/reports";
import { useAppSelector } from "@/stores/hooks";

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
  const [tickerInput, setTickerInput] = useState<string>("");
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

  const addTicker = () => {
    if (
      tickerInput.trim() &&
      !selectedTickers.includes(tickerInput.toUpperCase()) &&
      selectedTickers.length < 5
    ) {
      setSelectedTickers([...selectedTickers, tickerInput.toUpperCase()]);
      setTickerInput("");
    }
  };

  const removeTicker = (ticker: string) => {
    setSelectedTickers(selectedTickers.filter(t => t !== ticker));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTicker();
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

      {/* Ticker Input Section */}
      <div className="mb-8">
        <div className="flex gap-3 mb-4 w-[400px]">
          <FormInput
            type="text"
            placeholder="Enter ticker symbol (e.g., AAPL)"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-[300px] max-w-2xl px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
          <Button
            variant="primary"
            onClick={addTicker}
            disabled={!tickerInput.trim() || selectedTickers.length >= 5 || selectedTickers.includes(tickerInput.toUpperCase())}
            className="flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-colors duration-200 flex-shrink-0"
          >
            <FaPlus size={14} /> Add Ticker
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
                className="ml-1 hover:bg-white hover:text-primary rounded-full p-1 transition-colors duration-200"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-700 font-medium">Maximum 5 tickers can be selected at a time.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <LoadingIcon icon="spinning-circles" className="w-10 h-10 text-primary" />
          <span className="ml-3 text-lg text-gray-800 font-medium">Loading ownership data...</span>
        </div>
      )}

      {/* Separate Tables for Each Company */}
      {!loading && ownershipData.length > 0 && (
        <div className="space-y-8">
          {ownershipData.map((company) => (
            <div key={company.ticker} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              {/* Company Header */}
              <div className="bg-primary px-6 py-4">
                <h3 className="text-xl font-bold text-white">
                  {company.ticker} - {company.company_name}
                </h3>
                <p className="text-white/80 text-sm mt-1">
                  Top {Math.min(20, company.ownership_data.length)} Institutional Owners
                </p>
              </div>
              
              {/* Company Table */}
              <TableWrapper>
                <div className="overflow-x-auto">
                  <Table>
                    <Table.Thead>
                      <Table.Tr className="bg-gray-100 border-b-2 border-gray-200">
                        <Table.Td className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wide">
                          #
                        </Table.Td>
                        <Table.Td className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Institution Name
                        </Table.Td>
                        <Table.Td className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Ownership %
                        </Table.Td>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {company.ownership_data.slice(0, 20).map((inv, index) => (
                        <Table.Tr key={inv.filer_id} className="hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100">
                          <Table.Td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 bg-gray-50">
                            {index + 1}
                          </Table.Td>
                          <Table.Td className="px-6 py-4 text-sm text-gray-900 font-medium">
                            {inv.institution_name}
                          </Table.Td>
                          <Table.Td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                            {inv.percent_ownership}%
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </div>
              </TableWrapper>
            </div>
          ))}
        </div>
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

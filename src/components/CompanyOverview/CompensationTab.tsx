import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AI_CHATBOT_API_BASE } from '@/pages/AIChatbot/api';

interface CompensationTabProps {
  ticker: string;
}

const compensationDataCache = new Map<string, any | null>();

const CompensationTab: React.FC<CompensationTabProps> = ({ ticker }) => {
  const [secData, setSecData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isActiveRef = useRef(true);

  useEffect(() => {
    isActiveRef.current = true;

    if (!ticker) {
      setLoading(false);
      setError(null);
      setSecData(null);
      return;
    }

    if (compensationDataCache.has(ticker)) {
      setSecData(compensationDataCache.get(ticker));
      setError(null);
      setLoading(false);
      return;
    }

    fetchCompensationData(ticker);

    return () => {
      isActiveRef.current = false;
    };
  }, [ticker]);

  const fetchCompensationData = async (currentTicker: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${AI_CHATBOT_API_BASE}/api/compensation/${currentTicker}`);
      
      if (response.data.status === "success") {
        compensationDataCache.set(currentTicker, response.data.data);

        if (!isActiveRef.current) return;

        setSecData(response.data.data);
      } else if (response.data.status === "not_found") {
        compensationDataCache.set(currentTicker, null);

        if (!isActiveRef.current) return;

        setSecData(null); 
      }
    } catch (err) {
      if (!isActiveRef.current) return;

      console.error(err);
      setError("Failed to fetch data from the server.");
    } finally {
      if (isActiveRef.current) {
        setLoading(false);
      }
    }
  };

  // NEW: Smooth scroll function for the Table of Contents hyperlinks
  const scrollToTable = (index: number) => {
    const element = document.getElementById(`table-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 1. XLSX Download Function
  const handleDownloadXLSX = (tableName: string, tableData: any[]) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => {
      const XLSX = (window as any).XLSX;

      const grid: { [key: string]: string } = {};
      const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
      const occupied = new Set<string>();
      let maxCol = 0;
      const numRows = tableData.length;

      tableData.forEach((row: any[], rowIndex: number) => {
        let colCursor = 0;
        row.forEach((cell: any) => {
          while (occupied.has(`${rowIndex},${colCursor}`)) colCursor++;

          let text = (cell.text || "")
            .replace(/&nbsp;/g, " ")
            .replace(/\u00A0/g, " ")
            .replace(/<[^>]*>/g, "")
            .trim();

          const colspan = Math.max(1, cell.colspan || 1);
          const rowspan = Math.max(1, cell.rowspan || 1);

          grid[`${rowIndex},${colCursor}`] = text;

          if (colspan > 1 || rowspan > 1) {
            merges.push({
              s: { r: rowIndex, c: colCursor },
              e: { r: rowIndex + rowspan - 1, c: colCursor + colspan - 1 },
            });
          }

          for (let r = 0; r < rowspan; r++) {
            for (let c = 0; c < colspan; c++) {
              if (r === 0 && c === 0) continue;
              occupied.add(`${rowIndex + r},${colCursor + c}`);
            }
          }

          maxCol = Math.max(maxCol, colCursor + colspan);
          colCursor += colspan;
        });
      });

      const isDollarOnlyCol = (col: number): boolean => {
        let hasContent = false;
        for (let r = 0; r < numRows; r++) {
          const val = (grid[`${r},${col}`] || "").trim();
          if (val === "") continue;
          hasContent = true;
          if (val !== "$") return false;
        }
        return hasContent; 
      };

      const dollarCols = new Set<number>();
      for (let c = 0; c < maxCol; c++) {
        if (isDollarOnlyCol(c)) dollarCols.add(c);
      }

      dollarCols.forEach((dollarCol) => {
        let nextCol = dollarCol + 1;
        while (dollarCols.has(nextCol)) nextCol++;

        for (let r = 0; r < numRows; r++) {
          const dollarVal = (grid[`${r},${dollarCol}`] || "").trim();
          const nextVal = (grid[`${r},${nextCol}`] || "").trim();
          if (dollarVal === "$" && nextVal !== "") {
            grid[`${r},${nextCol}`] = `$ ${nextVal}`;
          }
          delete grid[`${r},${dollarCol}`];
        }
      });

      const colMap: number[] = []; 
      for (let c = 0; c < maxCol; c++) {
        if (!dollarCols.has(c)) colMap.push(c);
      }
      const newMaxCol = colMap.length;

      const oldToNew: { [old: number]: number } = {};
      colMap.forEach((oldC, newC) => { oldToNew[oldC] = newC; });

      const remappedMerges = merges
        .filter(m => !dollarCols.has(m.s.c)) 
        .map(m => ({
          s: { r: m.s.r, c: oldToNew[m.s.c] ?? 0 },
          e: { r: m.e.r, c: oldToNew[m.e.c] ?? (oldToNew[m.s.c] ?? 0) },
        }))
        .filter(m => m.s.c !== undefined && m.e.c !== undefined);

      const aoa: any[][] = []; // Changed to any[][] to accept numbers
      for (let r = 0; r < numRows; r++) {
        const rowArr: any[] = [];
        for (let newC = 0; newC < newMaxCol; newC++) {
          const oldC = colMap[newC];
          let cellValue: any = grid[`${r},${oldC}`] ?? "";

          if (typeof cellValue === 'string') {
            // 1. Remove dollar signs, commas, and spaces
            const cleanedValue = cellValue.replace(/[\$,\s]/g, '');
            
            // 2. Handle accounting negative formats like "(1234)" -> "-1234"
            let testValue = cleanedValue;
            if (testValue.startsWith('(') && testValue.endsWith(')')) {
              testValue = '-' + testValue.slice(1, -1);
            }

            // 3. If the resulting string is a valid number, convert it
            if (testValue !== '' && !isNaN(Number(testValue))) {
              cellValue = Number(testValue);
            }
          }

          rowArr.push(cellValue);
        }
        aoa.push(rowArr);
      }

      const colWidths = Array.from({ length: newMaxCol }, (_, newC) => {
        const oldC = colMap[newC];
        let max = 8;
        for (let r = 0; r < numRows; r++) {
          const val = grid[`${r},${oldC}`] || "";
          max = Math.max(max, val.length + 2);
        }
        return { wch: Math.min(max, 45) };
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!merges"] = remappedMerges;
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tableName.slice(0, 31));
      XLSX.writeFile(wb, `${ticker}_${tableName.replace(/\s+/g, "_")}.xlsx`);
    };

    document.head.appendChild(script);
  };

  // 2. Open Table in a New Browser Tab WITH "Save as PDF" Feature inside
  const handleOpenInNewTab = (tableSection: any) => {
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert("Please allow pop-ups for this site to open the table in a new window.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${ticker} - ${tableSection.tag}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            padding: 40px; 
            background: #f9fafb; 
            color: #1f2937; 
            margin: 0;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #e5e7eb;
          }
          h1 { margin: 0; font-size: 24px; color: #111827; }
          .ticker-badge {
            background: #e0e7ff;
            color: #4338ca;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 600;
            margin-right: 12px;
          }
          #pdf-wrapper {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          
          /* NEW: Container to keep scrolling contained and clean */
          .table-responsive {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
            border: 1px solid #e5e7eb; /* Adds a clean border around the scrollable area */
            border-radius: 6px;
          }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            min-width: 1200px; /* Forces the table to stay wide, triggering the smooth scrollbar */
          }
          th, td { 
            border: 1px solid #e5e7eb; 
            padding: 12px 16px; 
            text-align: left; 
            font-size: 14px; 
            white-space: nowrap; /* Prevents text from awkwardly stacking vertically */
          }
          th { 
            background-color: #f3f4f6; 
            font-weight: 600; 
            color: #374151;
            text-align: center;
          }
          tr:hover { background-color: #f9fafb; }
          tr { page-break-inside: avoid; }
          
          button {
            background-color: #dc2626;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          button:hover { background-color: #b91c1c; }
          button:disabled { background-color: #9ca3af; cursor: not-allowed; }
        </style>
      </head>
      <body>
        <div class="header-container" data-html2canvas-ignore="true">
          <div>
            <span class="ticker-badge">${ticker}</span>
            <span style="font-size: 20px; font-weight: 600;">${tableSection.tag}</span>
          </div>
          <button id="pdfBtn" onclick="generatePDF()">Save as PDF</button>
        </div>

        <div id="pdf-wrapper">
          <h2 id="pdf-title" style="display: none; color: #111827; margin-top: 0; margin-bottom: 20px;">${ticker} - ${tableSection.tag}</h2>
          
          <div class="table-responsive">
            <table>
              <tbody>
                ${tableSection.data.map((row: any[]) => `
                  <tr>
                    ${row.map((cell: any) => {
                      const tag = cell.is_header ? 'th' : 'td';
                      return `<${tag} colspan="${cell.colspan}" rowspan="${cell.rowspan}">${cell.text || '&nbsp;'}</${tag}>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
        </div>

        <script>
          function generatePDF() {
            const btn = document.getElementById('pdfBtn');
            btn.innerText = "Generating PDF...";
            btn.disabled = true;

            const element = document.getElementById('pdf-wrapper');
            document.getElementById('pdf-title').style.display = 'block';

            const opt = {
              margin:       [0.5, 0.5, 0.5, 0.5],
              filename:     '${ticker}_${tableSection.tag.replace(/\s+/g, '_')}.pdf',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { 
                scale: 2, 
                windowWidth: 1600, 
                useCORS: true
              },
              jsPDF:        { 
                unit: 'in', 
                format: 'a3', 
                orientation: 'landscape' 
              },
              pagebreak:    { mode: 'avoid-all' } 
            };

            html2pdf().set(opt).from(element).save().then(() => {
              document.getElementById('pdf-title').style.display = 'none';
              btn.innerText = "Save as PDF";
              btn.disabled = false;
            });
          }
        </script>
      </body>
      </html>
    `;

    newWindow.document.open();
    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };
  
  // Reusable function to render the HTML table locally
  const renderTableData = (tableSection: any) => (
    <table className="min-w-full border-collapse border border-gray-300 text-sm bg-white">
      <tbody>
        {tableSection.data.map((row: any[], rowIndex: number) => (
          <tr key={rowIndex} className="border-b border-gray-200 hover:bg-gray-50">
            {row.map((cell: any, cellIndex: number) => {
              const Tag = cell.is_header ? 'th' : 'td';
              return (
                <Tag 
                  key={cellIndex}
                  colSpan={cell.colspan} 
                  rowSpan={cell.rowspan}
                  className={`border border-gray-300 p-2 ${cell.is_header ? 'bg-gray-50 font-bold text-center' : 'text-left'}`}
                  dangerouslySetInnerHTML={{ __html: cell.text || "&nbsp;" }} 
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // --- RENDER UI ---
  if (loading) return <div className="p-10 text-center">Loading compensation data...</div>;
  if (error) return <div className="p-10 text-red-500 text-center">{error}</div>;

  if (!secData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 border rounded shadow-sm bg-white">
        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <h3 className="text-xl font-semibold text-gray-800">Compensation Data</h3>
        <p className="text-gray-500 mb-6">Data has not been extracted from the SEC yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow-sm">
      <h4><b>Expand To New Tab Leads to Save the Table as PDF</b></h4>
      <div className="mb-6 pb-4 border-b">
        <h2 className="text-2xl font-bold text-gray-800">{secData.ticker}</h2>
        <a href={secData.source_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm font-semibold mt-2 block">
          View Original SEC Filing (DEF 14A)
        </a>
      </div>

      {/* NEW: QUICK NAVIGATION TABLE OF CONTENTS */}
      {secData.tables && secData.tables.length > 0 && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-lg shadow-sm">
          <h3 className="text-xs font-bold text-blue-800 mb-3 uppercase tracking-wider">Quick Navigation ({secData.tables.length} Tables)</h3>
          <div className="flex flex-wrap gap-2">
            {secData.tables.map((tableSection: any, index: number) => (
              <button
                key={`nav-${index}`}
                onClick={() => scrollToTable(index)}
                className="text-sm bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 hover:shadow-sm px-3 py-1.5 rounded-md transition-all text-left"
              >
                {tableSection.tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {secData.tables.map((tableSection: any, index: number) => (
        // NEW: Added `id` and `scroll-mt-24` so the sticky nav doesn't hide the table title when scrolled to
        <div key={index} id={`table-${index}`} className="mb-10 overflow-x-auto scroll-mt-24">
          
          {/* Header with Action Buttons */}
          <div className="flex justify-between items-center bg-gray-100 p-3 rounded mb-3">
            <h3 className="text-lg font-semibold m-0 text-gray-800">{tableSection.tag}</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => handleOpenInNewTab(tableSection)}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors shadow-sm"
              >
                ⤢ Expand To New Tab
              </button>

              <button 
                onClick={() => handleDownloadXLSX(tableSection.tag, tableSection.data)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors shadow-sm"
              >
                ↓ CSV
              </button>
            </div>
          </div>
          
          {renderTableData(tableSection)}
        </div>
      ))}
    </div>
  );
};

export default CompensationTab;
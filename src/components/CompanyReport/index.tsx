import { forwardRef, useRef, useState } from "react";
import { CompanyReportData } from "@/types/companyReport";
import zmhLogo from "@/assets/images/logo/zmh-logo.jpg";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./CompanyReport.css";

// Section Components
import {
  SharePricePerformanceSection,
  Top20InvestorsSection,
  InvestorsVotingAgainstSection,
  EngagementStatsSection,
  ShareholderProposalsSection
} from "./sections";

interface CompanyReportProps {
  data: CompanyReportData;
  onClose?: () => void;
}

const CompanyReport = forwardRef<HTMLDivElement, CompanyReportProps>(
  ({ data, onClose }, ref) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const handleExportToPDF = async () => {
      const input = reportRef.current;
      if (!input) return;

      setIsGeneratingPDF(true);

      try {
        // Hide buttons during PDF generation
        const buttonsToHide = document.querySelectorAll(".exclude-from-pdf");
        buttonsToHide.forEach((el) => el.classList.add("hidden"));

        const canvas = await html2canvas(input, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: input.scrollWidth,
          windowHeight: input.scrollHeight,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdfWidth = 210; // A4 width in mm
        const margin = 10;
        const imgWidth = pdfWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Calculate number of pages needed
        const pageHeight = 297 - 2 * margin; // A4 height minus margins
        const totalPages = Math.ceil(imgHeight / pageHeight);

        const pdf = new jsPDF("p", "mm", "a4");

        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }

          const sourceY = page * pageHeight * (canvas.width / imgWidth);
          const sourceHeight = Math.min(
            pageHeight * (canvas.width / imgWidth),
            canvas.height - sourceY
          );

          // Create a temporary canvas for this page section
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext("2d");

          if (ctx) {
            ctx.drawImage(
              canvas,
              0,
              sourceY,
              canvas.width,
              sourceHeight,
              0,
              0,
              canvas.width,
              sourceHeight
            );

            const pageImgData = pageCanvas.toDataURL("image/png");
            const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;

            pdf.addImage(
              pageImgData,
              "PNG",
              margin,
              margin,
              imgWidth,
              pageImgHeight,
              undefined,
              "FAST"
            );
          }

          // Add footer with page number
          pdf.setFontSize(8);
          pdf.setTextColor(128);
          pdf.text(
            `${data.finnhub_data?.company_name || "Company Report"} | Data as of: ${data.data_as_of || new Date().toLocaleDateString()}`,
            margin,
            290
          );
          pdf.text(`Page ${page + 1} of ${totalPages}`, pdfWidth - margin - 20, 290);
        }

        const fileName = `${data.finnhub_data?.company_name || "Company"}_Report_${new Date().toISOString().split("T")[0]}.pdf`;
        pdf.save(fileName);

        // Show buttons again
        buttonsToHide.forEach((el) => el.classList.remove("hidden"));
      } catch (error) {
        console.error("Error generating PDF:", error);
      } finally {
        setIsGeneratingPDF(false);
      }
    };

    return (
      <div className="w-full max-w-[1200px] mx-auto">
        {/* Report Content */}
        <div
          ref={reportRef}
          className="bg-white report-content px-8 py-6"
          style={{ fontFamily: "inherit" }}
        >
          {/* Report Header - Logo and Download Button */}
          <div className="report-header border-b-2 border-primary pb-4 mb-6">
            <div className="flex items-center justify-between">
              <img
                src={zmhLogo}
                alt="ZMH Logo"
                className="h-20 w-auto object-contain"
              />
              <button
                onClick={handleExportToPDF}
                disabled={isGeneratingPDF}
                className="exclude-from-pdf flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPDF ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 1: Share Price Performance */}
          {data.share_price_performance_data && (
            <div className="mb-10">
              <SharePricePerformanceSection 
                data={data.share_price_performance_data} 
                dataAsOf={data.data_as_of}
                companyName={data.finnhub_data?.company_name}
              />
            </div>
          )}

          {/* Section 2: Top 20 Investors with Pie Chart and Proxy Influence */}
          <div className="mb-10">
            <Top20InvestorsSection data={data.percent_ownership_data || []} />
          </div>

          {/* Section 3: Investors Voting Against + Trend Charts */}
          {data.charts_data && (
            <div className="mb-10">
              <InvestorsVotingAgainstSection 
                data={data.charts_data}
                percentOwnershipData={data.percent_ownership_data}
              />
            </div>
          )}

          {/* Section 4: Engagement Stats (Company + Peers) */}
          <div className="mb-10">
            <EngagementStatsSection
              data={data.engagement_stats_data}
              exGlobalData={data.engagement_stats_ex_global_data}
              companyName={data.finnhub_data?.company_name}
            />
          </div>

          {/* Section 5: Shareholder Proposals */}
          <div className="mb-10">
            <ShareholderProposalsSection data={data.sp_data || []} />
          </div>

          {/* Report Footer */}
          <div className="report-footer mt-12 pt-6 border-t-2 border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <img src={zmhLogo} alt="ZMH Logo" className="h-6 w-auto" />
                <span>© {new Date().getFullYear()} ZMH Advisors. All rights reserved.</span>
              </div>
              <div>
                <span>This report is for informational purposes only.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CompanyReport.displayName = "CompanyReport";

export default CompanyReport;

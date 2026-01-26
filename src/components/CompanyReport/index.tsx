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
  ShareholderProposalsSection,
  KeyTakeawaysSection
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

        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = 210;
        const pdfHeight = 297;
        const margin = 12;
        const contentWidth = pdfWidth - 2 * margin;
        const maxContentHeight = pdfHeight - 2 * margin - 12; // Leave room for footer
        
        let currentY = margin;
        let pageNum = 1;

        // Helper to add footer
        const addFooter = (pageNumber: number) => {
          pdf.setFontSize(8);
          pdf.setTextColor(128);
          pdf.text(
            `${data.finnhub_data?.company_name || "Company Report"} | Data as of: ${data.data_as_of || new Date().toLocaleDateString()}`,
            margin,
            pdfHeight - 7
          );
          pdf.text(`Page ${pageNumber}`, pdfWidth - margin - 15, pdfHeight - 7);
        };

        // Get all sections (header, content sections, footer)
        const allSections = input.querySelectorAll('.report-header, section, .report-footer');
        
        for (let i = 0; i < allSections.length; i++) {
          const section = allSections[i] as HTMLElement;
          
          // Render this section to canvas
          const canvas = await html2canvas(section, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: "#ffffff",
          });

          // Calculate dimensions
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Check if this section fits on current page
          if (currentY + imgHeight > maxContentHeight + margin && currentY > margin) {
            // Add footer to current page
            addFooter(pageNum);
            // Start new page
            pdf.addPage();
            pageNum++;
            currentY = margin;
          }

          // If single section is taller than page, we need to split it
          if (imgHeight > maxContentHeight) {
            const scaleFactor = canvas.width / imgWidth;
            const pageHeightInPixels = maxContentHeight * scaleFactor;
            const sectionPages = Math.ceil(canvas.height / pageHeightInPixels);

            for (let sp = 0; sp < sectionPages; sp++) {
              if (sp > 0 || currentY > margin) {
                if (sp > 0) {
                  addFooter(pageNum);
                  pdf.addPage();
                  pageNum++;
                  currentY = margin;
                }
              }

              const sourceY = sp * pageHeightInPixels;
              const sourceHeight = Math.min(pageHeightInPixels, canvas.height - sourceY);

              const pageCanvas = document.createElement("canvas");
              pageCanvas.width = canvas.width;
              pageCanvas.height = sourceHeight;
              const ctx = pageCanvas.getContext("2d");

              if (ctx) {
                ctx.drawImage(
                  canvas,
                  0, sourceY, canvas.width, sourceHeight,
                  0, 0, canvas.width, sourceHeight
                );

                const pageImgData = pageCanvas.toDataURL("image/png");
                const destHeight = sourceHeight / scaleFactor;

                pdf.addImage(pageImgData, "PNG", margin, currentY, imgWidth, destHeight, undefined, "FAST");
                currentY += destHeight + 5;
              }
            }
          } else {
            // Section fits on page
            const imgData = canvas.toDataURL("image/png");
            pdf.addImage(imgData, "PNG", margin, currentY, imgWidth, imgHeight, undefined, "FAST");
            currentY += imgHeight + 8; // Add spacing between sections
          }
        }

        // Add footer to last page
        addFooter(pageNum);

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

          {/* Section 1: Key Takeaways Table */}
          {data.key_takeaways && data.key_takeaways.length > 0 && (
            <KeyTakeawaysSection data={data.key_takeaways} />
          )}

          {/* Section 2: Share Price Performance */}
          {data.share_price_performance_data && (
            <SharePricePerformanceSection 
              data={data.share_price_performance_data} 
              dataAsOf={data.data_as_of}
              companyName={data.finnhub_data?.company_name}
            />
          )}

          {/* Section 3: Top 20 Investors with Pie Chart and Proxy Influence */}
          <Top20InvestorsSection data={data.percent_ownership_data || []} />

          {/* Section 4: Investors Voting Against + Trend Charts */}
          {data.charts_data && (
            <InvestorsVotingAgainstSection 
              data={data.charts_data}
              percentOwnershipData={data.percent_ownership_data}
            />
          )}

          {/* Section 5: Engagement Stats (Company + Peers) */}
          <EngagementStatsSection
            data={data.engagement_stats_data}
            exGlobalData={data.engagement_stats_ex_global_data}
            companyName={data.finnhub_data?.company_name}
          />

          {/* Section 6: Shareholder Proposals */}
          <ShareholderProposalsSection data={data.sp_data || []} />

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

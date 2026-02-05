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
  KeyTakeawaysSection,
  MeetingDetailsSection
} from "./sections";

interface CompanyReportProps {
  data: CompanyReportData;
  onClose?: () => void;
}

const CompanyReport = forwardRef<HTMLDivElement, CompanyReportProps>(
  ({ data, onClose }, ref) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const formatUSDate = (dateValue?: string | null) => {
      if (!dateValue) return "";
      const dt = new Date(dateValue);
      if (Number.isNaN(dt.getTime())) return String(dateValue);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(dt);
    };

    const handleExportToPDF = async () => {
      const input = reportRef.current;
      if (!input) {
        console.error("Report ref not found");
        return;
      }

      setIsGeneratingPDF(true);

      // Longer delay to allow state to update and UI to re-render (for expanding collapsed sections)
      await new Promise(resolve => setTimeout(resolve, 800));

      let prevPaddingBottom = "";
      try {
        prevPaddingBottom = (input as HTMLElement).style.paddingBottom;
        (input as HTMLElement).style.paddingBottom = "64px";

        const pdfWidth = 210;
        const pdfHeight = 297;
        const margin = 8;
        const contentWidth = pdfWidth - 2 * margin;
        
        // Render the entire report as one canvas
        const canvas = await html2canvas(input, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: true,
          backgroundColor: "#ffffff",
          windowWidth: input.scrollWidth,
          windowHeight: input.scrollHeight,
          ignoreElements: (el) => {
            const element = el as HTMLElement;
            return (
              element.classList?.contains('exclude-from-pdf') ||
              element.classList?.contains('no-print')
            );
          },
        });

        // Debug: Check if canvas rendered properly
        console.log('[CompanyReport PDF] Canvas dimensions:', canvas.width, 'x', canvas.height);
        console.log('[CompanyReport PDF] Input dimensions:', input.scrollWidth, 'x', input.scrollHeight);
        
        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error('Canvas rendered with zero dimensions');
        }

        const imgWidthMm = contentWidth;
        const pxPerMm = canvas.width / imgWidthMm;
        const footerHeightMm = 12;
        const guardBandMm = 6;
        const pageContentHeightMm = pdfHeight - 2 * margin - footerHeightMm - guardBandMm;
        const pageContentHeightPx = Math.floor(pageContentHeightMm * pxPerMm);
        const overlapPx = 0; // no overlap: prevents repeated rows/content between pages
        let pageNum = 1;

        const sourceCtx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;

        // Build avoid ranges for headings + table rows so cuts never split them
        const domToCanvasScaleY = input.scrollHeight > 0 ? (canvas.height / input.scrollHeight) : 1;
        const avoidPadPx = Math.floor(6 * domToCanvasScaleY);

        const getTopWithinInputPx = (el: HTMLElement, container: HTMLElement) => {
          let top = 0;
          let node: HTMLElement | null = el;
          let safety = 0;
          while (node && node !== container && safety < 1000) {
            top += node.offsetTop || 0;
            node = (node.offsetParent as HTMLElement | null) || null;
            safety++;
          }
          if (node === container) return Math.max(0, top);
          const elRect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          return Math.max(0, elRect.top - containerRect.top);
        };

        const avoidRangesPx = Array.from(
          input.querySelectorAll('h2, h3, table thead tr, table tbody tr')
        )
          .map((node) => {
            const el = node as HTMLElement;
            const top = getTopWithinInputPx(el, input);
            const height = el.offsetHeight;
            return {
              startPx: Math.max(0, Math.floor(top * domToCanvasScaleY) - avoidPadPx),
              endPx: Math.min(canvas.height, Math.floor((top + height) * domToCanvasScaleY) + avoidPadPx)
            };
          })
          .filter(r => r.endPx > r.startPx)
          .sort((a, b) => a.startPx - b.startPx);

        const adjustForAvoidRanges = (startY: number, desiredHeight: number) => {
          const endY = startY + desiredHeight;
          for (const range of avoidRangesPx) {
            if (endY > range.startPx && endY < range.endPx) {
              const adjusted = range.startPx - startY;
              return adjusted > 0 ? adjusted : desiredHeight;
            }
          }
          return desiredHeight;
        };

        // Build slices first so we never skip content and so we know totalPages
        const slices: { imgData: string; sliceHeightMm: number }[] = [];
        let yOffsetPx = 0;
        while (yOffsetPx < canvas.height) {
          const remainingPx = canvas.height - yOffsetPx;
          const baseSliceHeightPx = Math.min(pageContentHeightPx, remainingPx);

          // For last page or if remaining fits, use all of it
          // Otherwise, adjust so we never cut through headings or table rows
          const sliceHeightPx = remainingPx <= pageContentHeightPx
            ? baseSliceHeightPx
            : adjustForAvoidRanges(yOffsetPx, baseSliceHeightPx);

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeightPx;

          const ctx = pageCanvas.getContext('2d');
          if (!ctx) break;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            yOffsetPx,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx
          );

          const sliceHeightMm = sliceHeightPx / pxPerMm;
          const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          slices.push({ imgData, sliceHeightMm });

          if (import.meta.env.DEV) {
            console.log('[CompanyReport PDF] slice', {
              yOffsetPx,
              sliceHeightPx,
              remainingPx,
              sliceHeightMm
            });
          }

          if (remainingPx <= pageContentHeightPx) break;
          yOffsetPx += Math.max(1, sliceHeightPx - overlapPx);
        }

        const pdf = new jsPDF("p", "mm", "a4");
        const totalPages = Math.max(1, slices.length);

        // Helper to add footer
        const addFooter = (pageNumber: number) => {
          const asOf = formatUSDate(data.data_as_of) || formatUSDate(new Date().toISOString());
          pdf.setFontSize(7);
          pdf.setTextColor(128);
          pdf.text(
            `${data.finnhub_data?.company_name || "Company Report"} | Data as of: ${asOf}`,
            margin,
            pdfHeight - 4
          );
          pdf.text(`Page ${pageNumber} of ${totalPages}`, pdfWidth - margin - 18, pdfHeight - 4);
        };

        slices.forEach((slice, index) => {
          if (index > 0) pdf.addPage();
          pdf.addImage(slice.imgData, 'JPEG', margin, margin, imgWidthMm, slice.sliceHeightMm);
          addFooter(index + 1);
          pageNum++;
        });

        const fileName = `${data.finnhub_data?.company_name || "Company"}_Report_${new Date().toISOString().split("T")[0]}.pdf`;
        pdf.save(fileName);
      } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Error generating PDF. Please check console for details.");
      } finally {
        if (reportRef.current) {
          (reportRef.current as HTMLElement).style.paddingBottom = prevPaddingBottom;
        }
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
          {/* Report Header - Logo, Title and Download Button */}
          <div className="report-header border-b-2 border-primary pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isGeneratingPDF && (
                  <img
                    src={zmhLogo}
                    alt="ZMH Logo"
                    className="h-16 w-auto object-contain"
                  />
                )}
                <h1 className="text-2xl font-bold text-gray-900">
                  {data.finnhub_data?.company_name || 'Company'} - Company Report
                </h1>
              </div>
              <button
                onClick={handleExportToPDF}
                disabled={isGeneratingPDF}
                className="download-btn exclude-from-pdf flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Table of Contents / Index Section */}
          <section className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200 exclude-from-pdf">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Table of Contents</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <a 
                href="#share-price-performance" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('share-price-performance');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                1. Share Price Performance
              </a>
              <a 
                href="#meeting-details" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('meeting-details');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                2. Shareholder Meeting Summary
              </a>
              <a 
                href="#total-ownership" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('total-ownership');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                3. Top 20 Ownership
              </a>
              <a 
                href="#voting-rationale" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('voting-rationale');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                4. Voting Rationale
              </a>
              <a 
                href="#trend-investor-support" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('trend-investor-support');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                5. Trend in Investor Support
              </a>
              <a 
                href="#engagement-history" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('engagement-history');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                6. Engagement History
              </a>
              <a 
                href="#shareholder-proposals" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('shareholder-proposals');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                7. Shareholder Proposals
              </a>
            </div>
          </section>

          {/* Section 1: Key Takeaways Table - Hidden for now */}
          {/* {data.key_takeaways && data.key_takeaways.length > 0 && (
            <KeyTakeawaysSection data={data.key_takeaways} />
          )} */}

          {/* Section 1: Share Price Performance */}
          <div id="share-price-performance">
            {data.share_price_performance_data && (
              <SharePricePerformanceSection 
                data={data.share_price_performance_data} 
                dataAsOf={data.data_as_of}
                companyName={data.finnhub_data?.company_name}
              />
            )}
          </div>

          {/* Section 2: Meeting Details */}
          <div id="meeting-details">
            <MeetingDetailsSection data={data.meeting_details_data} />
          </div>

          {/* Section 3: Investors with Pie Chart and Proxy Influence */}
          <div id="total-ownership">
            <Top20InvestorsSection 
              data={data.percent_ownership_data || []} 
              totalPercentOwnership={data.total_percent_ownership}
            />
          </div>

          {/* Section 4: Voting Rationale + Trend Charts */}
          <div id="voting-rationale">
            {data.charts_data && (
              <InvestorsVotingAgainstSection 
                data={data.charts_data}
                votedAgainstRationale={data.voted_against_rationale}
              />
            )}
          </div>

          {/* Section 5: Engagement Stats (Company + Peers) */}
          <div id="engagement-history">
            <EngagementStatsSection
              data={data.engagement_stats_data}
              exGlobalData={data.engagement_stats_ex_global_data}
              companyName={data.finnhub_data?.company_name}
              isGeneratingPDF={isGeneratingPDF}
            />
          </div>

          {/* Section 7: Shareholder Proposals */}
          <div id="shareholder-proposals">
            <ShareholderProposalsSection data={data.sp_data || []} />
          </div>

          {/* Report Footer */}
          <div className="report-footer mt-12 pt-6 border-t-2 border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                {isGeneratingPDF && (
                  <img src={zmhLogo} alt="ZMH Logo" className="h-6 w-auto" />
                )}
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

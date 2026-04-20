import React, { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import Lucide from "@/components/Base/Lucide";
import { axiosInstance } from "@/services";
import { baseURL } from "@/constant";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

interface PdfThumbnailProps {
  fileUrl: string;
  onClick?: () => void;
  width?: number;
}

const PdfThumbnail: React.FC<PdfThumbnailProps> = ({ fileUrl, onClick, width = 300 }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Preview not available");
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPdf = async () => {
      if (!fileUrl || fileUrl === "#") {
        if (isMounted) {
          setError(true);
          setErrorMessage("Invalid document URL");
          setLoading(false);
          setPdfData(null);
        }
        return;
      }

      setLoading(true);
      setError(false);

      try {
        const isAbsoluteHttpUrl = /^https?:\/\//i.test(fileUrl);
        let arrayBuffer: ArrayBuffer;

        if (!isAbsoluteHttpUrl) {
          const response = await axiosInstance.get(fileUrl, {
            responseType: "arraybuffer",
          });
          arrayBuffer = response.data;
        } else {
          const fileOrigin = new URL(fileUrl).origin;
          const apiOrigin = new URL(baseURL).origin;

          if (fileOrigin === apiOrigin) {
            const response = await axiosInstance.get(fileUrl, {
              responseType: "arraybuffer",
            });
            arrayBuffer = response.data;
          } else {
            // External hosts (e.g., S3) require valid CORS headers for browser access.
            const response = await fetch(fileUrl, {
              method: "GET",
              mode: "cors",
              credentials: "omit",
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch external PDF: ${response.status}`);
            }

            arrayBuffer = await response.arrayBuffer();
          }
        }

        if (!isMounted) {
          return;
        }

        const bytes = new Uint8Array(arrayBuffer);

        setPdfData(bytes);
      } catch (err) {
        console.error("PDF Fetch Error:", err);

        if (!isMounted) {
          return;
        }

        setError(true);
        if (err instanceof TypeError && /failed to fetch/i.test(err.message)) {
          setErrorMessage("Preview blocked by storage CORS policy");
        } else {
          setErrorMessage("Unable to load PDF preview");
        }
        setLoading(false);
        setPdfData(null);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [fileUrl]);

  return (
    <div 
      className="relative cursor-pointer group overflow-hidden rounded-xl border border-slate-200 dark:border-darkmode-400 bg-slate-50 dark:bg-darkmode-600/50 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/50"
      onClick={onClick}
    >
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-darkmode-600/50 z-10">
          <Lucide icon="Loader2" className="w-8 h-8 text-primary animate-spin mb-2" />
          <span className="text-xs text-slate-400">Loading Preview...</span>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-darkmode-600/50 z-10 p-4 text-center">
          <Lucide icon="FileWarning" className="w-10 h-10 text-slate-400 mb-2" />
          <span className="text-sm font-medium text-slate-500">{errorMessage}</span>
          <span className="text-xs text-slate-400 mt-1">Click to open full document</span>
        </div>
      )}

      <div className="min-h-[400px] flex items-center justify-center pointer-events-none">
        {pdfData && !error ? (
          <Document
            file={{ data: pdfData }}
            onLoadSuccess={() => {
              setLoading(false);
              setError(false);
            }}
            onSourceError={(err) => {
              console.error("PDF Source Error:", err);
              setLoading(false);
              setError(true);
            }}
            onLoadError={(err) => {
              console.error("PDF Load Error:", err);
              setLoading(false);
              setError(true);
            }}
            className="flex justify-center"
          >
            <Page
              pageNumber={1}
              width={width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-[0_0_15px_rgba(0,0,0,0.1)]"
            />
          </Document>
        ) : null}
      </div>
      
      {/* Overlay for hover effect */}
      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center text-white gap-2">
          <Lucide icon="Maximize2" className="w-4 h-4" />
          <span className="text-sm font-medium">Click to view full screen</span>
        </div>
      </div>
    </div>
  );
};

export default PdfThumbnail;

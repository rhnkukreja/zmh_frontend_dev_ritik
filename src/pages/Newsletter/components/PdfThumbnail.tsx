import React, { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import Lucide from "@/components/Base/Lucide";
import { axiosInstance } from "@/services";
import { baseURL } from "@/constant";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfThumbnailProps {
  fileUrl: string;
  onClick?: () => void;
  width?: number;
}

const PdfThumbnail: React.FC<PdfThumbnailProps> = ({ fileUrl, onClick, width }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Preview not available");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [autoWidth, setAutoWidth] = useState(300);
  const pdfBlobUrlRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (!containerRef.current || typeof width === "number") return;
      const nextWidth = Math.max(220, Math.floor(containerRef.current.clientWidth * 0.92));
      setAutoWidth(nextWidth);
    };

    updateWidth();

    if (typeof width === "number" || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => updateWidth());
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [width]);

  useEffect(() => {
    let isMounted = true;

    const loadPdf = async () => {
      if (!fileUrl || fileUrl === "#") {
        if (isMounted) {
          setError(true);
          setErrorMessage("Invalid document URL");
          setLoading(false);
          if (pdfBlobUrlRef.current) {
            URL.revokeObjectURL(pdfBlobUrlRef.current);
            pdfBlobUrlRef.current = null;
          }
          setPdfBlobUrl(null);
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

        const blob = new Blob([arrayBuffer], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(blob);

        if (pdfBlobUrlRef.current) {
          URL.revokeObjectURL(pdfBlobUrlRef.current);
        }
        pdfBlobUrlRef.current = objectUrl;
        setPdfBlobUrl(objectUrl);
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
        if (pdfBlobUrlRef.current) {
          URL.revokeObjectURL(pdfBlobUrlRef.current);
          pdfBlobUrlRef.current = null;
        }
        setPdfBlobUrl(null);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = null;
      }
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

      <div ref={containerRef} className="min-h-[400px] flex items-center justify-center pointer-events-none">
        {pdfBlobUrl && !error ? (
          <Document
            file={pdfBlobUrl}
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
              width={typeof width === "number" ? width : autoWidth}
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

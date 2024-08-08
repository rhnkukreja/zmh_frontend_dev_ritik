import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Dialog } from "../Base/Headless";
import Lucide from "../Base/Lucide";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface PdfViewerProps {
  file: string;
  pdfVisible: boolean;
  setPdfVisible: (visible: boolean) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  pdfVisible,
  setPdfVisible,
}) => {
  const [numPages, setNumPages] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: any }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handlePreviousPage = () => {
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber((prevPageNumber) => Math.min(prevPageNumber + 1, numPages));
  };

  const handleZoomIn = () => {
    setScale((prevScale) => prevScale + 0.1);
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.1, 0.5));
  };
  return (
    <Dialog size="lg" open={pdfVisible} onClose={() => setPdfVisible(false)}>
      <Dialog.Panel className="text-center">
        <Dialog.Title>
          <h2 className="mr-auto text-xl font-semibold">PDF</h2>
          <div
            onClick={() => setPdfVisible(false)}
            className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
          >
            <Lucide icon="X" className="w-8 h-8 text-slate-400" />
          </div>
        </Dialog.Title>
        <Dialog.Description className="px-6 py-4 space-y-6">
          <div>
            <div className="controls">
              <button onClick={handlePreviousPage} disabled={pageNumber <= 1}>
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
              >
                Next
              </button>
              <span>
                Page {pageNumber} of {numPages}
              </span>
              <button onClick={handleZoomOut} disabled={scale <= 0.5}>
                Zoom Out
              </button>
              <button onClick={handleZoomIn} disabled={scale >= 2.0}>
                Zoom In
              </button>
            </div>
            <Document
              file={
                "https://s29.q4cdn.com/175625835/files/doc_downloads/test.pdf"
              }
              onLoadError={(msg) => {
                console.log(msg);
              }}
              onLoadSuccess={onDocumentLoadSuccess}
              loading="Loading PDF..."
            >
              <Page pageNumber={pageNumber} scale={scale} />
            </Document>
          </div>
        </Dialog.Description>
        <Dialog.Footer className="gap-3 sm:gap-6"></Dialog.Footer>
      </Dialog.Panel>
    </Dialog>
  );
};

export default PdfViewer;

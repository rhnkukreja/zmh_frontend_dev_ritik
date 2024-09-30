import React, { useMemo, useState } from "react";
import { pdfjs } from "react-pdf";

import { Dialog } from "../Base/Headless";
import Lucide from "../Base/Lucide";

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
  const fileName = useMemo(() => {
    return file?.split("/")?.pop();
  }, [file]);
  return (
    <Dialog size="xl" open={pdfVisible} onClose={() => setPdfVisible(false)}>
      <Dialog.Panel className="text-center">
        <Dialog.Title>
          <h2 className="mr-auto text-xl font-semibold">{fileName}</h2>
          <div
            onClick={() => setPdfVisible(false)}
            className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
          >
            <Lucide icon="X" className="w-8 h-8 text-slate-400" />
          </div>
        </Dialog.Title>
        <Dialog.Description className="px-6 py-4 space-y-6">
          {!file ? (
            <div
              id="error-message"
              className=" absolute inset-0 flex items-center justify-center bg-white border border-gray-300 shadow-lg"
            >
              <div className="text-center text-red-600">
                <p className="text-xl font-semibold">
                  File not found or unable to display the PDF.
                </p>
                <p>Please check the URL or try again later.</p>
              </div>
            </div>
          ) : (
            <iframe
              src={file || ""}
              width="100%"
              style={{
                height: "100vh",
              }}
            ></iframe>
          )}
        </Dialog.Description>
        <Dialog.Footer className="gap-3 sm:gap-6"></Dialog.Footer>
      </Dialog.Panel>
    </Dialog>
  );
};

export default PdfViewer;

import React, { useMemo, useState } from "react";
import { pdfjs } from "react-pdf";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import { Dialog } from "../Base/Headless";
import Lucide from "../Base/Lucide";
import Tippy from "../Base/Tippy";

interface PdfViewerProps {
  file?: string;
  file_name?: string;
  currentPdfDoc?: string;
  currentPdfName?: string;
  pdfVisible: boolean;
  setPdfVisible: (visible: boolean) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  file_name,
  currentPdfDoc,
  currentPdfName,
  pdfVisible,
  setPdfVisible,
}) => {
  const pdfFile = file || currentPdfDoc;
  const pdfFileName = file_name || currentPdfName;
  const fileName = useMemo(() => {
    return file_name;
  }, [file_name]);

  type Size = "sm" | "md" | "lg" | "xl" | "2xl";
  const [dialogSize, setDialogSize] = useState<Size>("xl");

  return (
    <Dialog size={dialogSize} open={pdfVisible} onClose={() => setPdfVisible(false)}>
      <Dialog.Panel className="text-center">
        <Dialog.Title>
          <h2 className="mr-auto text-lg font-semibold">{fileName}</h2>
          <Tippy content={dialogSize === "2xl" ? "Collapse" : "Expand"} options={{ theme: "light" }}>
            <div
              className="box p-2 cursor-pointer"
              onClick={() =>
                dialogSize === "2xl" ? setDialogSize("xl") : setDialogSize("2xl")
                // window.open("investor-details", "_blank")
              }
            >
              <img alt="tab-icon" src={tabIcon} />
            </div>
          </Tippy>
          <div
            onClick={() => setPdfVisible(false)}
            className=" ml-5 top-0 right-0 mt-1 mr-3 cursor-pointer"
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
              src={`${file || ""}`}
              width="100%"
              title={fileName}
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

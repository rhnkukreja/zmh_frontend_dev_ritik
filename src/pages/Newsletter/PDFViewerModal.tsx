import React from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";

interface PDFViewerModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  pdfUrl: string;
  title: string;
}

const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  setIsOpen,
  pdfUrl,
  title,
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[9999]"
        onClose={() => setIsOpen(false)}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl h-[90vh] transform overflow-hidden rounded-2xl bg-white dark:bg-darkmode-600 shadow-2xl transition-all flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-darkmode-400">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3"
                  >
                    <Lucide icon="FileText" className="w-5 h-5 text-primary" />
                    {title}
                  </Dialog.Title>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="hidden sm:flex items-center gap-2"
                      onClick={() => window.open(pdfUrl, "_blank")}
                    >
                      <Lucide icon="ExternalLink" className="w-4 h-4" />
                      Open in New Tab
                    </Button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-darkmode-400 transition-colors"
                    >
                      <Lucide icon="X" className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-100 dark:bg-darkmode-800 relative">
                  {pdfUrl && pdfUrl !== "#" ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full border-none"
                      title={title}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <Lucide icon="AlertCircle" className="w-12 h-12 mb-4 opacity-20" />
                      <p>Document URL is invalid or missing.</p>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PDFViewerModal;

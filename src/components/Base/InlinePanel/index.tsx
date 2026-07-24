import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";

interface InlinePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  url?: string;
  loading?: boolean;
  children?: React.ReactNode;
}

// Full-screen in-page panel used to show internal pages (Voting Data, N-PX,
// N-PX Analytics, 8-K filings, etc.) without navigating away or opening a
// new browser tab. The user stays on the dashboard; this simply overlays it.
export default function InlinePanel({
  open,
  onClose,
  title,
  subtitle,
  url,
  loading,
  children,
}: InlinePanelProps) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="flex h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="flex flex-none items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5">
                <div className="min-w-0">
                  <Dialog.Title className="truncate text-base font-bold text-gray-900">
                    {title}
                  </Dialog.Title>
                  {subtitle && (
                    <p className="truncate text-xs text-slate-500">{subtitle}</p>
                  )}
                </div>
                <div className="flex flex-none items-center gap-1.5">
                  {url && (
                    <a
                      href={url.replace(/([?&])embed=1(&)?/, "$1").replace(/[?&]$/, "")}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in new tab"
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    title="Close"
                    className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="relative flex-1 overflow-auto bg-slate-50">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                    <Loader2 className="h-8 w-8 animate-spin text-[#9F1239]" />
                  </div>
                )}
                {url ? (
                  <iframe
                    src={url}
                    title={title}
                    className="h-full w-full border-0"
                  />
                ) : (
                  children
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

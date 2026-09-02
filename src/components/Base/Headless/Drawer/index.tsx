import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import Lucide from "../../Lucide";

export default function Drawer({ open, setOpen, children, headerActions, headerContent }) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={setOpen}>
        {/* Overlay Transition */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gradient-to-b from-theme-1/50 via-theme-2/50 to-black/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* Drawer Slide-in Transition */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed top-[65px] bottom-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto relative w-screen max-w-[460px]">
                  <div className="flex h-full flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl">
                    <div className="border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
                      <div className="flex items-center justify-between gap-2.5">
                        <h2 className="text-lg font-semibold leading-none text-slate-900">
                          Notifications
                        </h2>
                        <div className="flex items-center gap-1.5">
                          {headerActions}
                          <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9F1239]/30"
                            aria-label="Close notifications"
                          >
                            <Lucide icon="X" className="h-5 w-5 stroke-[2.4]" />
                          </button>
                        </div>
                      </div>
                      {headerContent && <div className="mt-3">{headerContent}</div>}
                    </div>
                    <div className="relative flex h-full flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6">
                      {children}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

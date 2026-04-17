import { Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onConfirm: () => void;
  title?: string;
  isLoading?: boolean;
}

const DeleteConfirmationModal = ({
  isOpen,
  setIsOpen,
  onConfirm,
  title = "this document",
  isLoading = false,
}: DeleteConfirmationModalProps) => {
  return (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)} size="md">
      <Dialog.Panel>
        <div className="p-5 text-center">
          <div className="flex justify-center mb-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-danger/10 text-danger animate-pulse">
              <Lucide icon="Trash2" className="w-8 h-8" />
            </div>
          </div>
          <div className="text-3xl font-bold mt-5 text-slate-800 dark:text-slate-100">Are you sure?</div>
          <div className="text-slate-500 mt-2 text-lg">
            Do you really want to delete <span className="font-bold text-slate-700 dark:text-slate-300">{title}</span>? <br />
            This action cannot be undone.
          </div>
        </div>
        <div className="px-5 pb-8 text-center flex justify-center gap-3">
          <Button
            variant="outline-secondary"
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-32 rounded-xl"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            type="button"
            className="w-32 rounded-xl shadow-lg shadow-danger/20 transform hover:scale-105 transition-all duration-200"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Lucide icon="Loader2" className="w-4 h-4 animate-spin" />
                Deleting...
              </div>
            ) : (
              "Delete"
            )}
          </Button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};

export default DeleteConfirmationModal;

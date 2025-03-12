import React from "react";
import { Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";

interface DeleteConfirmationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

export const DeleteConfirmationModal: React.FC<
  DeleteConfirmationModalProps
> = ({
  isVisible,
  onClose,
  onConfirm,

  description = "Are you sure you want to delete this item? This action cannot be undone.",
  loading = false,
}) => {
  return (
    <Dialog size="md" open={isVisible} onClose={onClose} staticBackdrop>
      <Dialog.Panel className="flex flex-col justify-center items-center">
        <Lucide icon="XCircle" className="w-16 h-16 mx-auto mt-3 text-danger" />
        <div className="mt-5 text-3xl">Are you sure?</div>
        <Dialog.Description className="px-6 py-4 space-y-4 text-center">
          <p
            className="text-gray-600"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </Dialog.Description>
        <Dialog.Footer className="!border-none">
          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="outline-secondary"
              onClick={onClose}
              className="w-24"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={onConfirm}
              className="w-24"
            >
              {loading ? (
                <Lucide icon="Loader" className={`w-4 h-4 animate-spin`} />
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </Dialog.Footer>
      </Dialog.Panel>
    </Dialog>
  );
};

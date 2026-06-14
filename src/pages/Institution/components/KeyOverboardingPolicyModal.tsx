import { useEffect, useState } from "react";
import Button from "@/components/Base/Button";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { toast } from "react-toastify";
import LoadingIcon from "@/components/Base/LoadingIcon";
import {
  keyOverboardingPolicyService,
  KeyOverboardingPolicyDocument,
} from "@/services/keyOverboardingPolicy";

interface KeyOverboardingPolicyModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const KeyOverboardingPolicyModal = ({
  visible,
  setVisible,
}: KeyOverboardingPolicyModalProps) => {
  const [currentDoc, setCurrentDoc] =
    useState<KeyOverboardingPolicyDocument | null>(null);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadLatest = async () => {
    setFetching(true);
    try {
      const doc = await keyOverboardingPolicyService.getLatest();
      setCurrentDoc(doc);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load current policy document");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setSelectedFile(null);
      loadLatest();
    }
  }, [visible]);

  const handleClose = () => {
    setSelectedFile(null);
    setVisible(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF file to upload");
      return;
    }
    setUploading(true);
    try {
      const doc = await keyOverboardingPolicyService.upload(selectedFile);
      toast.success("Key Overboarding Policy uploaded successfully");
      setCurrentDoc(doc);
      setSelectedFile(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload policy document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={visible} onClose={handleClose}>
      <Dialog.Panel>
        <Dialog.Title>
          <h2 className="mr-auto text-base font-medium">
            Add/Update Key Overboarding Policy
          </h2>
          <button
            className="absolute top-0 right-0 mt-3 mr-3"
            onClick={handleClose}
          >
            <Lucide icon="X" className="w-8 h-8 text-slate-400" />
          </button>
        </Dialog.Title>
        <Dialog.Description className="space-y-5">
          {/* Current document */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              Current Policy Document
            </label>
            {fetching ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <LoadingIcon icon="oval" className="w-5 h-5" />
                Loading current document...
              </div>
            ) : currentDoc?.document_url ? (
              <div className="flex items-center justify-between gap-3 p-3 border rounded-lg border-slate-200 bg-slate-50">
                <div className="flex items-center min-w-0 gap-3">
                  <Lucide
                    icon="FileText"
                    className="flex-none w-6 h-6 text-primary"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate text-slate-800">
                      {currentDoc.document_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatBytes(currentDoc.size)}
                      {currentDoc.last_modified
                        ? ` · Updated ${formatDate(currentDoc.last_modified)}`
                        : ""}
                    </div>
                  </div>
                </div>
                <a
                  href={currentDoc.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-none"
                >
                  <Button variant="outline-primary" size="sm">
                    <Lucide icon="ExternalLink" className="w-4 h-4 mr-1.5" />
                    Open
                  </Button>
                </a>
              </div>
            ) : (
              <div className="p-3 text-sm border rounded-lg border-slate-200 bg-slate-50 text-slate-500">
                No policy document uploaded yet.
              </div>
            )}
          </div>

          {/* Upload new */}
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">
              {currentDoc ? "Replace with new PDF" : "Upload PDF"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            <span className="block mt-1 text-xs text-slate-500">
              Accepted format: PDF file. Uploading replaces the existing policy
              document.
            </span>
            {selectedFile && (
              <div className="mt-2 text-xs text-slate-600">
                Selected: <span className="font-medium">{selectedFile.name}</span>
              </div>
            )}
          </div>
        </Dialog.Description>
        <Dialog.Footer>
          <Button
            type="button"
            variant="outline-secondary"
            onClick={handleClose}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </Dialog.Footer>
      </Dialog.Panel>
    </Dialog>
  );
};

export { KeyOverboardingPolicyModal };
export default KeyOverboardingPolicyModal;

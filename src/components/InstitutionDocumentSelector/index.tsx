import { useMemo, useRef } from 'react';
import TomSelect from '@/components/Base/TomSelect';
import { useFetchInstitutionDocuments } from '@/hooks/useFetchInstitutionDocuments';
import { InstitutionDocument } from '@/types/institutions';
import Lucide from '@/components/Base/Lucide';

interface InstitutionDocumentSelectorProps {
  institutionId: number | null | undefined;
  onChange: (selectedLinks: string[]) => void;
  selectedDocuments?: string[];
  placeholder?: string;
  disabled?: boolean;
}

/**
 * InstitutionDocumentSelector Component (TomSelect Version)
 * 
 * Fetches and displays documents for a selected institution using TomSelect.
 * Shows file names in dropdown but sends links to parent component.
 * 
 * @param institutionId - The ID of the institution to fetch documents for
 * @param onChange - Callback function when documents are selected (receives array of links)
 * @param selectedDocuments - Pre-selected document links
 * @param placeholder - Custom placeholder text
 * @param disabled - Disable the dropdown
 * 
 * Usage:
 * <InstitutionDocumentSelector
 *   institutionId={selectedInstitutionId}
 *   onChange={(links) => field.onChange(links)}
 *   selectedDocuments={field.value}
 *   placeholder="Select Documents"
 * />
 */
export const InstitutionDocumentSelector = ({
  institutionId,
  onChange,
  selectedDocuments = [],
  placeholder = "Select Documents",
  disabled = false,
}: InstitutionDocumentSelectorProps) => {
  const { documents, loading, error } = useFetchInstitutionDocuments(institutionId);
  const selectRef = useRef<any>(null);

  // Convert documents to options for TomSelect (use link as value, name as label)
  const documentOptions = useMemo(() => {
    return documents
      .filter((doc) => doc.active && doc.link) // Only active documents with links
      .map((doc) => ({
        link: doc.link, // Store link as value
        name: `${doc.name}`, // Show name as label
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  }, [documents]);

  // Ensure selectedDocuments is always an array
  const selectedValue = useMemo(() => {
    if (!selectedDocuments) return [];
    return Array.isArray(selectedDocuments) ? selectedDocuments : [selectedDocuments];
  }, [selectedDocuments]);

  const handleChange = (e: any) => {
    // TomSelect passes e.target.value as array when multiple is enabled
    const links = Array.isArray(e.target.value) ? e.target.value : [];
    onChange(links);
  };

  if (disabled || !institutionId) {
    return (
      <div className="p-3 bg-gray-100 rounded border border-gray-300 text-gray-600 text-sm">
        {!institutionId
          ? 'Please select an institution first'
          : 'No documents available'}
      </div>
    );
  }

  return (
    <div className="relative">
      <TomSelect
        getRef={(el: any) => {
          selectRef.current = el;
        }}
        value={selectedValue}
        onChange={handleChange}
        options={{
          placeholder: placeholder,
        }}
        className="w-full"
        multiple
      >
        <option value="">{placeholder}</option>
        {documentOptions.map((doc) => (
          <option key={doc.link} value={doc.link}>
            {doc.name}
          </option>
        ))}
      </TomSelect>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
          <Lucide icon="AlertCircle" className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div className="absolute right-3 top-3">
          <Lucide icon="Loader" className="w-4 h-4 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
};

export default InstitutionDocumentSelector;

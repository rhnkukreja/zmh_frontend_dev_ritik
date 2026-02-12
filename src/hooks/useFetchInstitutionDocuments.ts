import { useState, useEffect } from 'react';
import { institutionService } from '@/services/institution';
import { InstitutionDocument } from '@/types/institutions';
import { toast } from 'react-toastify';

interface UseFetchInstitutionDocumentsReturn {
  documents: InstitutionDocument[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch documents for a specific institution
 * @param institutionId - The ID of the institution to fetch documents for
 * @returns Object containing documents array, loading state, and error message
 * 
 * Usage:
 * const { documents, loading } = useFetchInstitutionDocuments(institutionId);
 */
export const useFetchInstitutionDocuments = (
  institutionId: number | null | undefined
): UseFetchInstitutionDocumentsReturn => {
  const [documents, setDocuments] = useState<InstitutionDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If no institution ID provided, reset and return early
    if (!institutionId) {
      setDocuments([]);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchDocuments = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await institutionService.getInstitutionDocuments(institutionId);
        
        // Handle the response structure { count, results }
        if (response.results && Array.isArray(response.results)) {
          setDocuments(response.results);
        } else {
          setDocuments([]);
          setError('Invalid response format');
        }
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to fetch documents';
        setError(errorMessage);
        console.error('Error fetching institution documents:', err);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [institutionId]);

  return { documents, loading, error };
};

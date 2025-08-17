import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface QuotePrefillData {
  quoteId: string;
  packageCode: string;
  duration: string;
  numWeeks: number;
  selectedDates: string[];
  startDate: string | null;
  endDate: string | null;
  addOns: Array<{ code: string; price: number }>;
  subtotalCents: number;
  addonsCents: number;
  totalCents: number;
  currency: string;
  expiresAt: string;
}

export function useQuotePrefill() {
  const [quoteId, setQuoteId] = useState<string | null>(null);

  // Extract quote ID from URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const quoteParam = urlParams.get('quote');
    if (quoteParam) {
      setQuoteId(quoteParam);
    }
  }, []);

  // Fetch quote prefill data
  const { data: prefillData, isLoading, error } = useQuery({
    queryKey: ['quote-prefill', quoteId],
    queryFn: async (): Promise<QuotePrefillData> => {
      const response = await fetch(`/api/quotes/${quoteId}/prefill`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Quote not found or has expired');
        }
        throw new Error('Failed to load quote data');
      }
      
      const result = await response.json();
      return result.prefill;
    },
    enabled: !!quoteId,
    retry: false
  });

  return {
    quoteId,
    prefillData,
    isLoading,
    error: error as Error | null,
    hasPrefill: !!quoteId
  };
}
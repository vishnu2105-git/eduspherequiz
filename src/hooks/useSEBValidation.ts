import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SEBValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
  validated_with?: 'config_key' | 'browser_exam_key';
}

export function useSEBValidation(quizId: string) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateSEB = async () => {
      if (!quizId) return;

      try {
        setLoading(true);
        setError(null);

        const currentUrl = window.location.href;
        
        const { data, error: sebError } = await supabase.functions.invoke('seb-validate', {
          body: { 
            quizId, 
            requestUrl: currentUrl 
          }
        });

        if (sebError) {
          throw new Error(sebError.message);
        }

        const result = data as SEBValidationResult;
        
        if (result.valid) {
          setIsValid(true);
        } else {
          setIsValid(false);
          setError(result.message || result.error || 'SEB validation failed');
        }
      } catch (err) {
        console.error('SEB validation error:', err);
        setIsValid(false);
        setError(err instanceof Error ? err.message : 'Failed to validate SEB session');
      } finally {
        setLoading(false);
      }
    };

    // Check if we're in SEB environment by looking for SEB-specific properties
    const isSEBEnvironment = () => {
      // Check for SEB-specific window properties or user agent strings
      return (
        navigator.userAgent.includes('SEB') ||
        // @ts-ignore - SEB specific properties
        window.sebHost !== undefined ||
        // @ts-ignore
        window.SafeExamBrowser !== undefined
      );
    };

    // Only validate if we think we're in SEB
    if (isSEBEnvironment()) {
      validateSEB();
    } else {
      // If not in SEB, we still need to check if SEB is required
      setLoading(false);
    }
  }, [quizId]);

  return {
    isValid,
    loading,
    error,
    retry: () => {
      setLoading(true);
      setError(null);
      // Re-trigger validation
      window.location.reload();
    }
  };
}

export function createQuizLaunchUrl(quizId: string, studentData?: { name?: string; email?: string }) {
  return supabase.functions.invoke('quiz-launch', {
    body: {
      quizId,
      studentName: studentData?.name,
      studentEmail: studentData?.email,
      userId: null // For anonymous access
    }
  });
}
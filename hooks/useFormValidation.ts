import { useState, useCallback } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  async?: (value: any, context?: any) => Promise<string | null>;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface UseFormValidationReturn {
  errors: Record<string, string>;
  validateField: (name: string, value: any) => boolean;
  validateForm: (data: Record<string, any>) => boolean;
  validateFormAsync: (data: Record<string, any>) => Promise<boolean>;
  clearErrors: () => void;
  clearFieldError: (name: string) => void;
  isValidating: boolean;
}

export function useFormValidation(rules: ValidationRules): UseFormValidationReturn {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = useCallback((name: string, value: any): boolean => {
    const rule = rules[name];
    if (!rule) return true;

    let error: string | null = null;

    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      error = 'Ce champ est requis';
    } else if (rule.minLength && value && value.length < rule.minLength) {
      error = `Ce champ doit contenir au moins ${rule.minLength} caractères`;
    } else if (rule.maxLength && value && value.length > rule.maxLength) {
      error = `Ce champ ne peut pas dépasser ${rule.maxLength} caractères`;
    } else if (rule.pattern && value && !rule.pattern.test(value)) {
      error = 'Format invalide';
    } else if (rule.custom) {
      error = rule.custom(value);
    }

    setErrors((prev) => ({
      ...prev,
      [name]: error || '',
    }));

    return !error;
  }, [rules]);

  const validateForm = useCallback((data: Record<string, any>): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.keys(rules).forEach((name) => {
      const value = data[name];
      const rule = rules[name];
      let error: string | null = null;

      if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        error = 'Ce champ est requis';
      } else if (rule.minLength && value && value.length < rule.minLength) {
        error = `Ce champ doit contenir au moins ${rule.minLength} caractères`;
      } else if (rule.maxLength && value && value.length > rule.maxLength) {
        error = `Ce champ ne peut pas dépasser ${rule.maxLength} caractères`;
      } else if (rule.pattern && value && !rule.pattern.test(value)) {
        error = 'Format invalide';
      } else if (rule.custom) {
        error = rule.custom(value);
      }

      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules]);

  const validateFormAsync = useCallback(async (data: Record<string, any>): Promise<boolean> => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    setIsValidating(true);

    try {
      // First run synchronous validations
      Object.keys(rules).forEach((name) => {
        const value = data[name];
        const rule = rules[name];
        let error: string | null = null;

        if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
          error = 'Ce champ est requis';
        } else if (rule.minLength && value && value.length < rule.minLength) {
          error = `Ce champ doit contenir au moins ${rule.minLength} caractères`;
        } else if (rule.maxLength && value && value.length > rule.maxLength) {
          error = `Ce champ ne peut pas dépasser ${rule.maxLength} caractères`;
        } else if (rule.pattern && value && !rule.pattern.test(value)) {
          error = 'Format invalide';
        } else if (rule.custom) {
          error = rule.custom(value);
        }

        if (error) {
          newErrors[name] = error;
          isValid = false;
        }
      });

      // Then run asynchronous validations
      const asyncValidations = Object.keys(rules).map(async (name) => {
        const value = data[name];
        const rule = rules[name];

        if (rule.async && !newErrors[name]) {
          try {
            const error = await rule.async(value, data);
            if (error) {
              newErrors[name] = error;
              isValid = false;
            }
          } catch (err) {
            newErrors[name] = 'Erreur de validation';
            isValid = false;
          }
        }
      });

      await Promise.all(asyncValidations);
    } finally {
      setIsValidating(false);
    }

    setErrors(newErrors);
    return isValid;
  }, [rules]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((name: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    validateFormAsync,
    clearErrors,
    clearFieldError,
    isValidating,
  };
}

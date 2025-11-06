import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const CACHE_KEY = 'questionnaire_schema';
const CACHE_VERSION_KEY = 'questionnaire_schema_version';
const CACHE_EXPIRY_KEY = 'questionnaire_schema_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Custom hook to fetch and cache the questionnaire schema
 *
 * Features:
 * - Fetches schema from backend API
 * - Caches in localStorage with version checking
 * - Automatic cache invalidation after 24 hours
 * - Version-based cache invalidation (when backend updates schema_version)
 * - Returns loading state and error handling
 *
 * Usage:
 * const { schema, loading, error } = useQuestionnaireSchema();
 *
 * @returns {Object} { schema, loading, error, refetch }
 */
export function useQuestionnaireSchema() {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Check if cached schema is still valid
   */
  const isCacheValid = () => {
    const cachedSchema = localStorage.getItem(CACHE_KEY);
    const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);

    if (!cachedSchema || !cachedVersion || !cacheExpiry) {
      return false;
    }

    // Check if cache has expired
    const now = Date.now();
    if (now > parseInt(cacheExpiry, 10)) {
      console.log('[useQuestionnaireSchema] Cache expired, fetching fresh schema');
      return false;
    }

    return true;
  };

  /**
   * Get schema from localStorage cache
   */
  const getCachedSchema = () => {
    try {
      const cachedSchema = localStorage.getItem(CACHE_KEY);
      if (cachedSchema) {
        return JSON.parse(cachedSchema);
      }
    } catch (err) {
      console.error('[useQuestionnaireSchema] Failed to parse cached schema:', err);
    }
    return null;
  };

  /**
   * Save schema to localStorage cache
   */
  const cacheSchema = (schemaData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(schemaData));
      localStorage.setItem(CACHE_VERSION_KEY, schemaData.schema_version || '1.0.0');
      localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
      console.log(`[useQuestionnaireSchema] Schema cached (version: ${schemaData.schema_version})`);
    } catch (err) {
      console.error('[useQuestionnaireSchema] Failed to cache schema:', err);
    }
  };

  /**
   * Fetch schema from backend API
   */
  const fetchSchema = async () => {
    try {
      console.log('[useQuestionnaireSchema] Fetching schema from API...');
      const response = await axios.get(`${API_BASE_URL}/api/questionnaire/schema`);
      const schemaData = response.data;

      // Check if cached version is different from fetched version
      const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      if (cachedVersion && cachedVersion !== schemaData.schema_version) {
        console.log(`[useQuestionnaireSchema] Version mismatch: cached=${cachedVersion}, fetched=${schemaData.schema_version}`);
        console.log('[useQuestionnaireSchema] Invalidating cache and using new schema');
      }

      // Cache the new schema
      cacheSchema(schemaData);

      setSchema(schemaData);
      setLoading(false);
      setError(null);

      console.log(`[useQuestionnaireSchema] ✅ Schema loaded successfully (${schemaData.sections?.length} sections)`);
    } catch (err) {
      console.error('[useQuestionnaireSchema] ❌ Failed to fetch schema:', err);
      setError(err.message || 'Failed to load questionnaire schema');
      setLoading(false);

      // Try to use cached schema as fallback
      const cachedSchema = getCachedSchema();
      if (cachedSchema) {
        console.log('[useQuestionnaireSchema] Using cached schema as fallback');
        setSchema(cachedSchema);
      }
    }
  };

  /**
   * Initialize: Check cache first, then fetch if needed
   */
  useEffect(() => {
    const initializeSchema = async () => {
      // Check if cache is valid
      if (isCacheValid()) {
        const cachedSchema = getCachedSchema();
        if (cachedSchema) {
          console.log('[useQuestionnaireSchema] Using cached schema');
          setSchema(cachedSchema);
          setLoading(false);
          return;
        }
      }

      // Cache invalid or missing, fetch from API
      await fetchSchema();
    };

    initializeSchema();
  }, []);

  /**
   * Refetch function to manually reload schema (for testing/debugging)
   */
  const refetch = async () => {
    setLoading(true);
    await fetchSchema();
  };

  /**
   * Clear cache function (for testing/debugging)
   */
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
    console.log('[useQuestionnaireSchema] Cache cleared');
  };

  return {
    schema,
    loading,
    error,
    refetch,
    clearCache
  };
}

export default useQuestionnaireSchema;

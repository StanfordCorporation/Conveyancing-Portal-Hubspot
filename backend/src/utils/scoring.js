/**
 * Search Scoring Utility - Sneesby Algorithm
 * Provides robust text similarity scoring for flexible matching
 */

import { normalizePhoneToInternational } from './phone.js';

/**
 * Common stopwords to filter out from agency name searches
 * These words are too generic and don't help narrow down search results
 */
const AGENCY_STOPWORDS = ['real', 'estate', 'agency', 'group', 'realty', 'properties'];

/**
 * Calculate Levenshtein distance between two strings
 * Measures minimum edits needed to transform one string into another
 */
export const levenshteinDistance = (str1, str2) => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[len2][len1];
};

/**
 * Normalize string for comparison (lowercase, trim)
 */
export const norm = (s) => (s || '').toLowerCase().trim();

/**
 * Split string into individual words
 */
export const words = (s) => norm(s).split(/\s+/).filter(Boolean);

/**
 * Score how well a candidate matches a search term
 * Returns score 0-1 where 1 is perfect match
 *
 * Scoring logic:
 * - Word token matching (best)
 * - Substring matching
 * - Levenshtein distance (fuzzy)
 * - Length similarity penalty/bonus
 */
export const scoreMatch = (searchTerm, candidate) => {
  if (!searchTerm || !candidate) return 0;

  const searchWords = words(searchTerm);
  const candidateWords = words(candidate);
  const searchNorm = norm(searchTerm);
  const candidateNorm = norm(candidate);

  let score = 0;

  // Perfect match (full strings)
  if (searchNorm === candidateNorm) return 1.0;

  // Exact substring match
  if (candidateNorm.includes(searchNorm)) {
    score = 0.9;
  }

  // Word token matching - score based on matching words
  let matchedWords = 0;
  for (const searchWord of searchWords) {
    for (const candidateWord of candidateWords) {
      if (searchWord === candidateWord) {
        matchedWords++;
        break;
      }
    }
  }

  // Proportion of search words matched
  if (searchWords.length > 0) {
    const tokenMatchScore = (matchedWords / searchWords.length) * 0.85;
    score = Math.max(score, tokenMatchScore);
  }

  // Partial word matching with Levenshtein
  if (matchedWords === 0 && searchWords.length > 0) {
    let bestWordScore = 0;
    for (const searchWord of searchWords) {
      for (const candidateWord of candidateWords) {
        const distance = levenshteinDistance(searchWord, candidateWord);
        const maxLen = Math.max(searchWord.length, candidateWord.length);
        const similarity = 1 - distance / maxLen;
        bestWordScore = Math.max(bestWordScore, similarity);
      }
    }
    score = Math.max(score, bestWordScore * 0.6); // Lower weight for fuzzy matches
  }

  // Length bonus/penalty - prefer similar length matches
  const lengthDiff = Math.abs(searchNorm.length - candidateNorm.length);
  const lengthPenalty = Math.min(lengthDiff * 0.01, 0.2);
  score = Math.max(0, score - lengthPenalty);

  return Math.min(score, 1.0);
};

/**
 * Search and score agencies based on search term
 * Takes API results and returns sorted by relevance
 */
export const searchAndScore = (apiResults, searchTerm) => {
  if (!apiResults || apiResults.length === 0) {
    return [];
  }

  return apiResults
    .map((item) => ({
      id: item.id,
      name: item.properties.name,
      email: item.properties.email,
      address: item.properties.address,
      phone: item.properties.phone,
      score: scoreMatch(searchTerm, item.properties.name),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0.3); // Only return matches above threshold
};

/**
 * Generate filter groups for multi-token search
 * Converts tokens into separate CONTAINS_TOKEN filter groups
 * Example: ["stanford", "legal"] → multiple filter groups for OR logic
 */
export const generateTokenFilterGroups = (tokens) => {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return [];
  }

  return tokens.map((token) => ({
    filters: [
      {
        operator: 'CONTAINS_TOKEN',
        propertyName: 'name',
        value: token.trim(),
      },
    ],
  }));
};

/**
 * Extract tokens from search input
 * Splits on whitespace, removes stopwords, and returns unique, non-empty tokens
 */
export const extractTokens = (input) => {
  if (!input) return [];
  return (
    input
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .filter((token) => !AGENCY_STOPWORDS.includes(token)) // Remove stopwords
      .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
  );
};

/**
 * Score how well an agent name matches a search term
 * Combines firstname and lastname for matching
 * @param {string} searchTerm - Search term (e.g., "Steve Athanates")
 * @param {string} firstname - Agent first name
 * @param {string} lastname - Agent last name
 * @returns {number} Score 0-1 where 1 is perfect match
 */
export const scoreAgentMatch = (searchTerm, firstname, lastname) => {
  if (!searchTerm) return 0;
  
  const agentFullName = `${firstname || ''} ${lastname || ''}`.trim();
  if (!agentFullName) return 0;
  
  // Use existing scoreMatch function on full name
  return scoreMatch(searchTerm, agentFullName);
};

/**
 * Score agent with agency, phone, and suburb information
 * Combines multiple scoring factors with weighted importance
 * @param {Object} agent - Agent object with firstname, lastname, phone
 * @param {Object} agency - Agency object with name, address
 * @param {string} agentSearchTerm - Search term for agent name
 * @param {string} agencySearchTerm - Optional: Search term for agency name
 * @param {string} agentPhoneSearchTerm - Optional: Search term for agent phone number
 * @param {string} suburbSearchTerm - Optional: Search term for suburb
 * @returns {number} Combined score 0-1
 */
export const scoreAgentWithAgency = (agent, agency, agentSearchTerm, agencySearchTerm = null, agentPhoneSearchTerm = null, suburbSearchTerm = null) => {
  if (!agent || !agentSearchTerm) return 0;
  
  // Score agent name (65% weight, reduced from 70% to accommodate phone bonus)
  const agentScore = scoreAgentMatch(
    agentSearchTerm,
    agent.firstname || '',
    agent.lastname || ''
  );
  
  let combinedScore = agentScore * 0.65;
  
  // Score agency name if provided (20% weight)
  if (agencySearchTerm && agency?.name) {
    const agencyScore = scoreMatch(agencySearchTerm, agency.name);
    combinedScore += agencyScore * 0.2;
  }
  
  // Score suburb if provided (10% weight - enhancement only, doesn't penalize)
  // Check suburb in both agency name and address for better matching
  if (suburbSearchTerm && agency) {
    const suburbLower = suburbSearchTerm.toLowerCase();
    let suburbScore = 0;
    
    // Check suburb in agency name (suburb might be in name like "NGU Brassall")
    if (agency.name) {
      const agencyNameLower = agency.name.toLowerCase();
      if (agencyNameLower.includes(suburbLower)) {
        suburbScore = 1.0; // Full bonus if suburb in agency name
      } else {
        // Try fuzzy matching on agency name
        suburbScore = Math.max(suburbScore, scoreMatch(suburbSearchTerm, agency.name));
      }
    }
    
    // Check suburb in address
    if (agency.address && agency.address.trim()) {
      const addressLower = agency.address.toLowerCase();
      if (addressLower.includes(suburbLower)) {
        suburbScore = Math.max(suburbScore, 1.0); // Full bonus if suburb in address
      } else {
        // Try fuzzy matching on address
        suburbScore = Math.max(suburbScore, scoreMatch(suburbSearchTerm, agency.address));
      }
    }
    
    // Add suburb bonus (only if suburb matches, no penalty if it doesn't)
    // This enhances scores but doesn't reduce them
    combinedScore += suburbScore * 0.1;
  }
  
  // Score phone if provided (15% weight - exact match only, enhancement bonus)
  if (agentPhoneSearchTerm && agent?.phone) {
    try {
      // Normalize both search phone and agent phone for exact comparison
      const normalizedSearchPhone = normalizePhoneToInternational(agentPhoneSearchTerm);
      const normalizedAgentPhone = normalizePhoneToInternational(agent.phone);
      
      console.log(`[Scoring] Phone matching for ${agent.firstname} ${agent.lastname}:`);
      console.log(`[Scoring]   Search phone: "${agentPhoneSearchTerm}" → normalized: "${normalizedSearchPhone}"`);
      console.log(`[Scoring]   Agent phone: "${agent.phone}" → normalized: "${normalizedAgentPhone}"`);
      
      // Exact match only - if normalized phones match exactly, add 15% bonus
      if (normalizedSearchPhone && normalizedAgentPhone && normalizedSearchPhone === normalizedAgentPhone) {
        console.log(`[Scoring]   ✅ Phone match! Adding 15% bonus`);
        combinedScore += 0.15; // 15% weight bonus for exact phone match
      } else {
        console.log(`[Scoring]   ❌ Phone mismatch - no bonus`);
      }
      // No penalty if phone doesn't match or is not provided
    } catch (error) {
      // If phone normalization fails, skip phone matching (no penalty)
      console.warn(`[Scoring] Phone normalization error: ${error.message}`);
    }
  }
  
  return Math.min(combinedScore, 1.0);
};

export default {
  levenshteinDistance,
  norm,
  words,
  scoreMatch,
  searchAndScore,
  generateTokenFilterGroups,
  extractTokens,
  scoreAgentMatch,
  scoreAgentWithAgency,
};

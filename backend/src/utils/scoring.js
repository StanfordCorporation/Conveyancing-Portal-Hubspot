/**
 * Search Scoring Utility - Sneesby Algorithm
 * Provides robust text similarity scoring for flexible matching
 */

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

export default {
  levenshteinDistance,
  norm,
  words,
  scoreMatch,
  searchAndScore,
  generateTokenFilterGroups,
  extractTokens,
};

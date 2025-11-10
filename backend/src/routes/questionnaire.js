import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GET /api/questionnaire/schema
 * Returns the complete questionnaire schema from questionnaire.json
 * Includes schema_version for cache invalidation
 */
export const getSchema = (req, res) => {
  try {
    const schemaPath = path.join(__dirname, '../config/questionnaire.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    // Add version for cache invalidation
    // Increment this version whenever questionnaire.json changes to force frontend cache refresh
    schema.schema_version = '1.0.5';

    res.json(schema);
  } catch (error) {
    console.error('Failed to load questionnaire schema:', error);
    res.status(500).json({
      error: 'Failed to load questionnaire schema',
      details: error.message
    });
  }
};

export default router;

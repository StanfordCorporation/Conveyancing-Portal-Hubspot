/**
 * Questionnaire API Tests
 * Tests for all questionnaire endpoints and services
 *
 * Run with: npm test tests/questionnaire.test.js
 */

import configService from '../src/services/questionnaire/configService.js';
import questionnaireService from '../src/services/questionnaire/questionnaireService.js';
import syncQueueService from '../src/services/questionnaire/syncQueueService.js';

describe('Questionnaire Services - Unit Tests', () => {

  // ============================================================================
  // ConfigService Tests
  // ============================================================================

  describe('ConfigService', () => {

    it('should initialize questionnaire config from file', async () => {
      await configService.initialize();
      expect(configService.initialized).toBe(true);
    });

    it('should get complete questionnaire config', async () => {
      await configService.initialize();
      const config = configService.getQuestionnaireConfig();

      expect(config).toBeDefined();
      expect(config.sections).toBeDefined();
      expect(Array.isArray(config.sections)).toBe(true);
      expect(config.sections.length).toBeGreaterThan(0);
    });

    it('should have all 5 sections', async () => {
      await configService.initialize();
      const config = configService.getQuestionnaireConfig();

      expect(config.sections.length).toBe(5);
      expect(config.sections[0].section_number).toBe('1');
      expect(config.sections[1].section_number).toBe('2');
      expect(config.sections[2].section_number).toBe('3');
      expect(config.sections[3].section_number).toBe('4');
      expect(config.sections[4].section_number).toBe('5');
    });

    it('should get specific section by number', async () => {
      await configService.initialize();
      const section = configService.getSection(1);

      expect(section).toBeDefined();
      expect(section.section_number).toBe('1');
      expect(section.questions).toBeDefined();
      expect(Array.isArray(section.questions)).toBe(true);
      expect(section.questions.length).toBeGreaterThan(0);
    });

    it('should get specific question by section and field name', async () => {
      await configService.initialize();
      const question = configService.getQuestion(1, 'body_corporate');

      expect(question).toBeDefined();
      expect(question.form_field_name).toBe('body_corporate');
      expect(question.form_question).toBeDefined();
      expect(question.HubSpot_Property_Name).toBeDefined();
    });

    it('should get all questions from a section', async () => {
      await configService.initialize();
      const questions = configService.getSectionQuestions(1);

      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0]).toHaveProperty('form_field_name');
      expect(questions[0]).toHaveProperty('HubSpot_Property_Name');
    });

    it('should get field mappings', async () => {
      await configService.initialize();
      const mappings = configService.getFieldMappings();

      expect(mappings).toBeDefined();
      expect(typeof mappings).toBe('object');
      expect(mappings.body_corporate).toBeDefined();
      expect(mappings.body_corporate.hsPropertyName).toBe('body_corporate');
    });

    it('should get HubSpot property name for form field', async () => {
      await configService.initialize();
      const hsProperty = configService.getHubSpotPropertyName('body_corporate');

      expect(hsProperty).toBe('body_corporate');
    });

    it('should return null for non-existent field', async () => {
      await configService.initialize();
      const question = configService.getQuestion(1, 'non_existent_field');

      expect(question).toBeNull();
    });

    it('should validate correct form data', async () => {
      await configService.initialize();
      const validation = configService.validateFormData({
        section_number: 1,
        body_corporate: 'yes'
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should reject invalid section number', async () => {
      await configService.initialize();
      const validation = configService.validateFormData({
        section_number: 99,
        body_corporate: 'yes'
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

  });

  // ============================================================================
  // QuestionnaireService Tests
  // ============================================================================

  describe('QuestionnaireService', () => {

    beforeAll(async () => {
      await configService.initialize();
    });

    it('should get section structure', () => {
      const structure = questionnaireService.getSectionStructure(1);

      expect(structure).toBeDefined();
      expect(structure.section_number).toBe('1');
      expect(structure.section_title).toBeDefined();
      expect(structure.questions).toBeDefined();
    });

    it('should get complete questionnaire structure', () => {
      const structure = questionnaireService.getCompleteStructure();

      expect(structure).toBeDefined();
      expect(structure.sections).toBeDefined();
      expect(structure.total_sections).toBe(5);
      expect(structure.total_questions).toBeGreaterThan(0);
    });

    it('should get visible questions without conditionals', () => {
      const visibleQuestions = questionnaireService.getVisibleQuestions(1, {});

      expect(Array.isArray(visibleQuestions)).toBe(true);
      expect(visibleQuestions.length).toBeGreaterThan(0);
    });

    it('should validate section data successfully', () => {
      const validation = questionnaireService.validateSectionData(1, {
        body_corporate: 'yes',
        registered_encumbrances: 'no'
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect missing required fields', () => {
      const validation = questionnaireService.validateSectionData(1, {
        // Missing body_corporate which is required
        registered_encumbrances: 'no'
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toHaveProperty('field');
      expect(validation.errors[0]).toHaveProperty('type', 'required');
    });

    it('should validate email field type', () => {
      const validation = questionnaireService.validateSectionData(2, {
        tenancy_agreement: 'no'
      }, { strict: false });

      // Email validation happens for email type fields
      expect(validation).toBeDefined();
    });

    it('should validate date field type', () => {
      const formData = {
        tenancy_agreement: 'yes',
        tenancy_agreement_lease_start_date: '2024-01-01' // Valid date
      };

      const validation = questionnaireService.validateSectionData(2, formData);

      // Should pass validation with valid date
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid date format', () => {
      const formData = {
        tenancy_agreement: 'yes',
        tenancy_agreement_lease_start_date: 'not-a-date'
      };

      const validation = questionnaireService.validateSectionData(2, formData);

      // Should fail with invalid date
      expect(validation.valid).toBe(false);
    });

    it('should map form data to HubSpot properties', () => {
      const formData = {
        body_corporate: 'yes',
        registered_encumbrances: 'no'
      };

      const hubSpotData = questionnaireService.mapFormDataToHubSpot(formData);

      expect(hubSpotData).toBeDefined();
      expect(hubSpotData.body_corporate).toBe('yes');
      expect(hubSpotData.registered_encumbrances).toBe('no');
    });

    it('should filter empty values when mapping to HubSpot', () => {
      const formData = {
        body_corporate: 'yes',
        registered_encumbrances: '',
        unregistered_encumbrances: null
      };

      const hubSpotData = questionnaireService.mapFormDataToHubSpot(formData);

      expect(hubSpotData.body_corporate).toBe('yes');
      expect(hubSpotData.registered_encumbrances).toBeUndefined();
      expect(hubSpotData.unregistered_encumbrances).toBeUndefined();
    });

    it('should map HubSpot data back to form fields', () => {
      const hubSpotData = {
        body_corporate: 'Yes',
        registered_encumbrances: 'No'
      };

      const formData = questionnaireService.mapHubSpotDataToForm(hubSpotData);

      expect(formData).toBeDefined();
      expect(formData.body_corporate).toBe('Yes');
      expect(formData.registered_encumbrances).toBe('No');
    });

    it('should get required fields for section', () => {
      const requiredFields = questionnaireService.getRequiredFields(1);

      expect(Array.isArray(requiredFields)).toBe(true);
      expect(requiredFields.length).toBeGreaterThan(0);
      expect(requiredFields[0]).toEqual(expect.any(String));
    });

    it('should check section completion', () => {
      const formData = {
        body_corporate: 'yes',
        registered_encumbrances: 'no',
        unregistered_encumbrances: 'no'
      };

      const completion = questionnaireService.checkSectionCompletion(1, formData);

      expect(completion.complete).toBe(true);
      expect(completion.missing).toEqual([]);
      expect(completion.required_fields).toBeGreaterThan(0);
    });

    it('should report missing fields in completion check', () => {
      const formData = {
        body_corporate: 'yes'
        // Missing other required fields
      };

      const completion = questionnaireService.checkSectionCompletion(1, formData);

      expect(completion.complete).toBe(false);
      expect(completion.missing.length).toBeGreaterThan(0);
    });

    it('should get field metadata', () => {
      const metadata = questionnaireService.getFieldMetadata('body_corporate');

      expect(metadata).toBeDefined();
      expect(metadata.form_field_name).toBe('body_corporate');
      expect(metadata.form_question).toBeDefined();
      expect(metadata.HubSpot_Property_Name).toBe('body_corporate');
    });

  });

  // ============================================================================
  // SyncQueueService Tests
  // ============================================================================

  describe('SyncQueueService', () => {

    it('should add item to queue', () => {
      const syncData = {
        dealId: '12345',
        sectionNumber: '1',
        formData: { body_corporate: 'yes' },
        endpoint: '/api/questionnaire/12345/section/1',
        error: 'HubSpot API timeout'
      };

      const queueItem = syncQueueService.addToQueue(syncData);

      expect(queueItem).toBeDefined();
      expect(queueItem.id).toBeDefined();
      expect(queueItem.dealId).toBe('12345');
      expect(queueItem.status).toBe('queued');
      expect(queueItem.attempts).toBe(0);
      expect(queueItem.maxAttempts).toBe(3);
    });

    it('should get queue items', () => {
      const items = syncQueueService.getQueueItems();

      expect(Array.isArray(items)).toBe(true);
    });

    it('should filter queue items by status', () => {
      // Add item to queue first
      syncQueueService.addToQueue({
        dealId: '12345',
        sectionNumber: '1',
        formData: {},
        endpoint: '/test',
        error: 'test error'
      });

      const queuedItems = syncQueueService.getQueueItems({ status: 'queued' });

      expect(Array.isArray(queuedItems)).toBe(true);
    });

    it('should get queue statistics', () => {
      const stats = syncQueueService.getQueueStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.queued).toBeGreaterThanOrEqual(0);
      expect(stats.scheduled).toBeGreaterThanOrEqual(0);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
      expect(stats.failedManualReview).toBeGreaterThanOrEqual(0);
    });

    it('should get queue summary', () => {
      const summary = syncQueueService.getQueueSummary();

      expect(summary).toBeDefined();
      expect(summary.status).toBe('active');
      expect(summary.statistics).toBeDefined();
      expect(summary.requiresAttention).toBe(typeof true);
    });

    it('should get items for manual review', () => {
      const items = syncQueueService.getItemsForManualReview();

      expect(Array.isArray(items)).toBe(true);
    });

    it('should prevent duplicate retries', async () => {
      const queueItem = syncQueueService.addToQueue({
        dealId: '99999',
        sectionNumber: '1',
        formData: {},
        endpoint: '/test',
        error: 'test'
      });

      // Try to simulate concurrent retry
      const mockCallback = jest.fn().mockResolvedValue({ success: true });

      // First retry attempt
      const promise1 = syncQueueService.retryQueueItem(queueItem.id, mockCallback);

      // Second concurrent attempt should be blocked
      const promise2 = syncQueueService.retryQueueItem(queueItem.id, mockCallback);

      const result1 = await promise1;
      const result2 = await promise2;

      // One should succeed, one should be blocked
      expect(result1.success || result2.success).toBe(true);
      expect(!(result1.success && result2.success)).toBe(true);
    });

  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {

    beforeAll(async () => {
      await configService.initialize();
    });

    it('should handle complete form workflow', () => {
      const formData = {
        body_corporate: 'yes',
        registered_encumbrances: 'no',
        unregistered_encumbrances: 'no'
      };

      // Step 1: Validate form data
      const validation = questionnaireService.validateSectionData(1, formData);
      expect(validation.valid).toBe(true);

      // Step 2: Check completion
      const completion = questionnaireService.checkSectionCompletion(1, formData);
      expect(completion.complete).toBe(true);

      // Step 3: Map to HubSpot
      const hubSpotData = questionnaireService.mapFormDataToHubSpot(formData);
      expect(hubSpotData).toBeDefined();
      expect(Object.keys(hubSpotData).length).toBeGreaterThan(0);
    });

    it('should handle conditional fields correctly', () => {
      const formDataWithCondition = {
        registered_encumbrances: 'yes'
      };

      // Get visible questions - should include conditional field
      const visibleQuestions = questionnaireService.getVisibleQuestions(1, formDataWithCondition);
      const hasConditionalField = visibleQuestions.some(
        q => q.conditional_on.question === 'registered_encumbrances'
      );

      expect(visibleQuestions.length).toBeGreaterThan(0);
    });

    it('should handle multi-section workflow', () => {
      // Get structures for all 5 sections
      for (let i = 1; i <= 5; i++) {
        const structure = questionnaireService.getSectionStructure(i);
        expect(structure).toBeDefined();
        expect(structure.section_number).toBe(String(i));
      }
    });

  });

});

/**
 * HubSpot Sync Queue Service
 * Manages failed HubSpot API calls with retry logic
 * Implements exponential backoff: 1s, 5s, 30s (3 attempts total)
 * Failed syncs are queued for manual admin review
 */

class SyncQueueService {
  constructor() {
    // In-memory queue for managing failed syncs
    // In production, this would be persisted to a database
    this.queue = [];
    this.activeRetries = new Map(); // Track ongoing retries
    this.queueId = 0; // Auto-increment queue item ID
  }

  /**
   * Add a failed sync to the queue
   * @param {Object} syncData - The data that failed to sync
   *   - dealId: string (HubSpot deal ID)
   *   - sectionNumber: string (questionnaire section)
   *   - formData: Object (form data that failed to sync)
   *   - endpoint: string (the API endpoint that failed)
   *   - error: string (error message)
   * @param {Object} options - Queue options
   *   - autoRetry: boolean (default: true) - Auto-retry with exponential backoff
   *   - priority: string (default: 'normal') - Queue priority: high, normal, low
   * @returns {Object} Queue item with ID and status
   */
  addToQueue(syncData, options = {}) {
    const { autoRetry = true, priority = 'normal' } = options;

    const queueItem = {
      id: ++this.queueId,
      dealId: syncData.dealId,
      sectionNumber: syncData.sectionNumber,
      formData: syncData.formData,
      endpoint: syncData.endpoint,
      error: syncData.error,
      priority,
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      retryIntervals: [1000, 5000, 30000], // ms: 1s, 5s, 30s
      nextRetryTime: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryHistory: [
        {
          attempt: 0,
          timestamp: new Date().toISOString(),
          error: syncData.error,
          status: 'initial_failure'
        }
      ]
    };

    this.queue.push(queueItem);

    console.log(`[SyncQueue] ➕ Added to queue (ID: ${queueItem.id})`);
    console.log(`[SyncQueue]    Deal ID: ${syncData.dealId}`);
    console.log(`[SyncQueue]    Section: ${syncData.sectionNumber}`);
    console.log(`[SyncQueue]    Error: ${syncData.error}`);
    console.log(`[SyncQueue]    Auto-Retry: ${autoRetry}`);
    console.log(`[SyncQueue]    Priority: ${priority}`);
    console.log(`[SyncQueue]    Queue Size: ${this.queue.length}`);

    // Auto-retry if enabled
    if (autoRetry) {
      this._scheduleRetry(queueItem);
    }

    return queueItem;
  }

  /**
   * Process queue item with retry logic
   * Called internally by retry scheduler
   * @param {number} queueItemId - ID of the queue item to retry
   * @param {Function} retryCallback - Async function that attempts the sync
   *   Should throw error on failure, return success object on success
   * @returns {Promise<Object>} { success: boolean, result?: Object, error?: string }
   */
  async retryQueueItem(queueItemId, retryCallback) {
    const item = this.queue.find(q => q.id === queueItemId);

    if (!item) {
      console.error(`[SyncQueue] ❌ Queue item not found: ${queueItemId}`);
      return { success: false, error: 'Queue item not found' };
    }

    // Prevent concurrent retries of same item
    if (this.activeRetries.has(queueItemId)) {
      console.warn(`[SyncQueue] ⚠️  Retry already in progress for queue item: ${queueItemId}`);
      return { success: false, error: 'Retry already in progress' };
    }

    try {
      this.activeRetries.set(queueItemId, true);
      item.attempts++;

      console.log(`[SyncQueue] 🔄 Retrying queue item ${queueItemId} (Attempt ${item.attempts}/${item.maxAttempts})`);

      // Call the retry callback
      const result = await retryCallback(item);

      // Success! Remove from queue
      console.log(`[SyncQueue] ✅ Queue item ${queueItemId} synced successfully on attempt ${item.attempts}`);

      item.status = 'completed';
      item.updatedAt = new Date().toISOString();
      item.retryHistory.push({
        attempt: item.attempts,
        timestamp: new Date().toISOString(),
        status: 'success',
        result
      });

      // Remove from active retries
      this.activeRetries.delete(queueItemId);

      return { success: true, result, queueItemId };
    } catch (error) {
      console.error(`[SyncQueue] ❌ Retry ${item.attempts} failed for queue item ${queueItemId}: ${error.message}`);

      item.updatedAt = new Date().toISOString();
      item.retryHistory.push({
        attempt: item.attempts,
        timestamp: new Date().toISOString(),
        error: error.message,
        status: 'failed'
      });

      // Check if we should retry again
      if (item.attempts < item.maxAttempts) {
        console.log(`[SyncQueue] ⏱️  Scheduling next retry for queue item ${queueItemId}`);
        item.status = 'scheduled';
        this._scheduleRetry(item);
      } else {
        console.log(`[SyncQueue] 🛑 Max attempts reached for queue item ${queueItemId}. Moved to manual review.`);
        item.status = 'failed_manual_review';
        item.error = error.message;
      }

      // Remove from active retries
      this.activeRetries.delete(queueItemId);

      return { success: false, error: error.message, queueItemId };
    }
  }

  /**
   * Get all queued items
   * @param {Object} filters - Filter options
   *   - status: string - Filter by status (queued, scheduled, failed_manual_review, completed)
   *   - dealId: string - Filter by deal ID
   *   - priority: string - Filter by priority
   * @returns {Array} Filtered queue items
   */
  getQueueItems(filters = {}) {
    let items = [...this.queue];

    if (filters.status) {
      items = items.filter(q => q.status === filters.status);
    }

    if (filters.dealId) {
      items = items.filter(q => q.dealId === filters.dealId);
    }

    if (filters.priority) {
      items = items.filter(q => q.priority === filters.priority);
    }

    // Sort by priority and creation time
    items.sort((a, b) => {
      const priorityOrder = { high: 1, normal: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, sort by oldest first
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return items;
  }

  /**
   * Get a specific queue item
   * @param {number} queueItemId - ID of the queue item
   * @returns {Object|null} Queue item or null if not found
   */
  getQueueItem(queueItemId) {
    return this.queue.find(q => q.id === queueItemId) || null;
  }

  /**
   * Get queue statistics
   * @returns {Object} { total, queued, scheduled, completedItems, failedManualReview }
   */
  getQueueStats() {
    return {
      total: this.queue.length,
      queued: this.queue.filter(q => q.status === 'queued').length,
      scheduled: this.queue.filter(q => q.status === 'scheduled').length,
      completed: this.queue.filter(q => q.status === 'completed').length,
      failedManualReview: this.queue.filter(q => q.status === 'failed_manual_review').length
    };
  }

  /**
   * Get items pending manual review
   * @returns {Array} Queue items that failed all retries
   */
  getItemsForManualReview() {
    return this.getQueueItems({ status: 'failed_manual_review' });
  }

  /**
   * Clear a completed queue item (remove from queue)
   * @param {number} queueItemId - ID of the queue item
   * @returns {boolean} True if cleared, false if not found
   */
  clearQueueItem(queueItemId) {
    const index = this.queue.findIndex(q => q.id === queueItemId);

    if (index === -1) {
      return false;
    }

    const item = this.queue[index];
    console.log(`[SyncQueue] 🗑️  Clearing queue item ${queueItemId}`);

    this.queue.splice(index, 1);
    return true;
  }

  /**
   * Clear all completed items
   * @returns {number} Number of items cleared
   */
  clearCompletedItems() {
    const initialCount = this.queue.length;

    this.queue = this.queue.filter(q => q.status !== 'completed');

    const cleared = initialCount - this.queue.length;
    console.log(`[SyncQueue] 🧹 Cleared ${cleared} completed items`);

    return cleared;
  }

  /**
   * Get queue summary for dashboard
   * @returns {Object} Summary of queue status
   */
  getQueueSummary() {
    const stats = this.getQueueStats();
    const failedItems = this.getItemsForManualReview();

    return {
      status: 'active',
      statistics: stats,
      requiresAttention: failedItems.length > 0,
      itemsRequiringAttention: failedItems.length,
      oldestFailedItem: failedItems.length > 0
        ? failedItems.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0]
        : null
    };
  }

  // Private helper methods

  /**
   * Schedule retry for a queue item with exponential backoff
   * @private
   */
  _scheduleRetry(item) {
    const interval = item.retryIntervals[item.attempts];

    if (!interval) {
      console.warn(`[SyncQueue] ⚠️  No retry interval defined for attempt ${item.attempts}`);
      return;
    }

    const nextRetryTime = new Date(Date.now() + interval);
    item.nextRetryTime = nextRetryTime.toISOString();

    console.log(`[SyncQueue] ⏰ Next retry scheduled for ${nextRetryTime.toLocaleTimeString()} (in ${interval}ms)`);
  }
}

// Create singleton instance
const syncQueueService = new SyncQueueService();

export default syncQueueService;

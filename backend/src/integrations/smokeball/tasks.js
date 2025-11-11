/**
 * Smokeball Task Operations
 * Create and manage tasks in Smokeball
 */

import * as client from './client.js';
import { SMOKEBALL_API } from '../../config/smokeball.js';

/**
 * Create a task in Smokeball
 *
 * @param {Object} taskData - Task information
 * @param {string} taskData.matterId - Matter UUID to associate task with
 * @param {string} taskData.title - Task title
 * @param {string} taskData.description - Task description (optional)
 * @param {string} taskData.assignedTo - Staff member UUID (optional)
 * @param {string} taskData.dueDate - Due date ISO string (optional)
 * @param {string} taskData.priority - Priority level (optional)
 * @returns {Promise<Object>} Created task
 */
export async function createTask(taskData) {
  try {
    console.log('[Smokeball Tasks] ✅ Creating task:', taskData.title);

    const payload = {
      matterId: taskData.matterId,
      title: taskData.title,
      description: taskData.description || null,
      staffId: taskData.assignedTo || null,  // Smokeball API expects 'staffId' not 'assignedTo'
      dueDate: taskData.dueDate || null,
      priority: taskData.priority || 'Normal',
      status: 'NotStarted',
    };

    // Remove null values
    Object.keys(payload).forEach(key => {
      if (payload[key] === null) delete payload[key];
    });

    const response = await client.post(SMOKEBALL_API.endpoints.tasks, payload);

    console.log('[Smokeball Tasks] ✅ Task created successfully');
    console.log(`[Smokeball Tasks] 🆔 Task ID: ${response.id}`);

    return response;

  } catch (error) {
    console.error('[Smokeball Tasks] ❌ Error creating task:', error.message);
    throw error;
  }
}

/**
 * Get task by ID
 *
 * @param {string} taskId - Task UUID
 * @returns {Promise<Object>} Task details
 */
export async function getTask(taskId) {
  try {
    const response = await client.get(SMOKEBALL_API.endpoints.task(taskId));
    return response;
  } catch (error) {
    console.error('[Smokeball Tasks] ❌ Error fetching task:', error.message);
    throw error;
  }
}

/**
 * Update task
 *
 * @param {string} taskId - Task UUID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated task
 */
export async function updateTask(taskId, updateData) {
  try {
    console.log(`[Smokeball Tasks] 🔄 Updating task: ${taskId}`);

    const response = await client.patch(
      SMOKEBALL_API.endpoints.task(taskId),
      updateData
    );

    console.log('[Smokeball Tasks] ✅ Task updated successfully');

    return response;

  } catch (error) {
    console.error('[Smokeball Tasks] ❌ Error updating task:', error.message);
    throw error;
  }
}

/**
 * Mark task as complete
 *
 * @param {string} taskId - Task UUID
 * @returns {Promise<Object>} Updated task
 */
export async function completeTask(taskId) {
  return await updateTask(taskId, { status: 'Completed' });
}

/**
 * Get all tasks for a matter
 *
 * @param {string} matterId - Matter UUID
 * @returns {Promise<Array>} Tasks for the matter
 */
export async function getTasksForMatter(matterId) {
  try {
    const response = await client.get(SMOKEBALL_API.endpoints.tasks, { matterId });

    const results = Array.isArray(response) ? response : response.items || [];

    console.log(`[Smokeball Tasks] ✅ Found ${results.length} tasks for matter`);

    return results;

  } catch (error) {
    console.error('[Smokeball Tasks] ❌ Error fetching tasks:', error.message);
    throw error;
  }
}

/**
 * Create welcome tasks for Laura (After Searches Returned - Stage 9)
 *
 * @param {string} matterId - Matter UUID
 * @param {string} lauraStaffId - Laura's staff UUID
 * @returns {Promise<Array>} Created tasks
 */
export async function createWelcomeTasksForLaura(matterId, lauraStaffId) {
  try {
    console.log('[Smokeball Tasks] 📋 Creating welcome tasks for Laura');

    const tasks = [
      {
        matterId,
        title: 'Review Client Details',
        description: 'Review and verify all client information and contact details',
        assignedTo: lauraStaffId,
        priority: 'High',
      },
      {
        matterId,
        title: 'Prepare Welcome Package',
        description: 'Prepare and send welcome package to client with next steps',
        assignedTo: lauraStaffId,
        priority: 'Normal',
      },
      {
        matterId,
        title: 'Schedule Initial Call',
        description: 'Schedule initial consultation call with client',
        assignedTo: lauraStaffId,
        priority: 'High',
      },
    ];

    const createdTasks = [];

    for (const taskData of tasks) {
      const task = await createTask(taskData);
      createdTasks.push(task);
    }

    console.log(`[Smokeball Tasks] ✅ Created ${createdTasks.length} welcome tasks`);

    return createdTasks;

  } catch (error) {
    console.error('[Smokeball Tasks] ❌ Error creating welcome tasks:', error.message);
    throw error;
  }
}

export default {
  createTask,
  getTask,
  updateTask,
  completeTask,
  getTasksForMatter,
  createWelcomeTasksForLaura,
};

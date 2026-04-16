'use strict';

const { v4: uuidv4 } = require('uuid');

// In-memory store
let tasks = [];

function resetStore() {
  tasks = [];
}

function getAllTasks({ status, page, limit } = {}) {
  let result = [...tasks];

  if (status) {
    result = result.filter(t => t.status === status);
  }

  // BUG #1: pagination uses 0-based page internally but API docs say page=1 is first page
  // When page=1, skip = (1-1)*limit = 0 which is correct, but when no page is provided
  // page defaults to undefined, and (undefined - 1) * limit = NaN, so slice(NaN, NaN) returns []
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 0;

  if (limitNum > 0) {
    const skip = (pageNum - 1) * limitNum;
    result = result.slice(skip, skip + limitNum);
  }

  return result;
}

function getTaskById(id) {
  return tasks.find(t => t.id === id) || null;
}

function createTask({ title, description = '', status = 'pending', priority = 'medium', dueDate = null }) {
  const task = {
    id: uuidv4(),
    title: title.trim(),
    description,
    status,
    priority,
    dueDate: dueDate || null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
}

function updateTask(id, updates) {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;

  // BUG #2: PUT (full update) should replace the task but preserve id and createdAt.
  // However this implementation merges instead of replacing, so extra old fields persist.
  const existing = tasks[index];
  tasks[index] = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
  };

  return tasks[index];
}

function deleteTask(id) {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}

function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return null;

  // BUG #3: already-completed tasks can be "completed" again, resetting completedAt timestamp
  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  return task;
}

function getStats() {
  const stats = {
    pending: 0,
    'in-progress': 0,
    completed: 0,
    overdue: 0,
  };

  const now = new Date();

  for (const task of tasks) {
    if (stats[task.status] !== undefined) {
      stats[task.status]++;
    }

    // Fixed: only non-completed tasks count as overdue
    if (task.dueDate && task.status !== 'completed' && new Date(task.dueDate) < now) {
      stats.overdue++;
    }
  }

  return stats;
}

function assignTask(id, assignee) {
  const task = tasks.find(t => t.id === id);
  if (!task) return null;
  task.assignee = assignee;
  return task;
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  getStats,
  assignTask,
  resetStore,
};

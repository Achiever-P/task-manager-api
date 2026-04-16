'use strict';

const VALID_STATUSES = ['pending', 'in-progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function isValidStatus(status) {
  return VALID_STATUSES.includes(status);
}

function isValidPriority(priority) {
  return VALID_PRIORITIES.includes(priority);
}

function isValidDate(dateStr) {
  if (!dateStr) return true; // null/undefined is ok
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

function validateTaskInput(body) {
  const errors = [];

  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    errors.push('title is required and must be a non-empty string');
  }

  if (body.status !== undefined && !isValidStatus(body.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.priority !== undefined && !isValidPriority(body.priority)) {
    errors.push(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  if (body.dueDate !== undefined && !isValidDate(body.dueDate)) {
    errors.push('dueDate must be a valid ISO 8601 date string');
  }

  return errors;
}

module.exports = { isValidStatus, isValidPriority, isValidDate, validateTaskInput, VALID_STATUSES, VALID_PRIORITIES };

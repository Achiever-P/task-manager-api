'use strict';

const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateTaskInput, isValidStatus } = require('../utils/validators');

// GET /tasks/stats  — must come BEFORE /:id to avoid being swallowed
router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

// GET /tasks
router.get('/', (req, res) => {
  const { status, page, limit } = req.query;

  if (status && !isValidStatus(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: pending, in-progress, completed` });
  }

  const tasks = taskService.getAllTasks({ status, page, limit });
  res.json(tasks);
});

// POST /tasks
router.post('/', (req, res) => {
  const errors = validateTaskInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const task = taskService.createTask(req.body);
  res.status(201).json(task);
});

// PUT /tasks/:id
router.put('/:id', (req, res) => {
  const errors = validateTaskInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const task = taskService.updateTask(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// DELETE /tasks/:id
router.delete('/:id', (req, res) => {
  const deleted = taskService.deleteTask(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.status(204).send();
});

// PATCH /tasks/:id/complete
router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// PATCH /tasks/:id/assign  — NEW FEATURE
router.patch('/:id/assign', (req, res) => {
  const { assignee } = req.body;

  if (assignee === undefined || assignee === null) {
    return res.status(400).json({ error: 'assignee is required' });
  }

  if (typeof assignee !== 'string' || assignee.trim() === '') {
    return res.status(400).json({ error: 'assignee must be a non-empty string' });
  }

  const task = taskService.assignTask(req.params.id, assignee.trim());
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// GET /tasks/:id
router.get('/:id', (req, res) => {
  const task = taskService.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

module.exports = router;

'use strict';

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// Reset in-memory store before each test for isolation
beforeEach(() => {
  taskService.resetStore();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
async function createTask(overrides = {}) {
  const defaults = { title: 'Test Task', priority: 'medium' };
  const res = await request(app)
    .post('/tasks')
    .send({ ...defaults, ...overrides });
  return res.body;
}

// ===========================================================================
// POST /tasks
// ===========================================================================
describe('POST /tasks', () => {
  it('creates a task with required fields', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Write tests' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Write tests',
      status: 'pending',
      priority: 'medium',
      completedAt: null,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('creates a task with all optional fields', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Full task',
      description: 'Desc',
      status: 'in-progress',
      priority: 'high',
      dueDate: '2030-01-01T00:00:00.000Z',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Full task',
      description: 'Desc',
      status: 'in-progress',
      priority: 'high',
      dueDate: '2030-01-01T00:00:00.000Z',
    });
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'low' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 400 when title is empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', status: 'done' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid dueDate', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// GET /tasks
// ===========================================================================
describe('GET /tasks', () => {
  it('returns empty array when no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    await createTask({ title: 'Task 1' });
    await createTask({ title: 'Task 2' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters by status', async () => {
    await createTask({ title: 'Pending', status: 'pending' });
    await createTask({ title: 'InProgress', status: 'in-progress' });
    const res = await request(app).get('/tasks?status=pending');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('pending');
  });

  it('returns 400 for invalid status filter', async () => {
    const res = await request(app).get('/tasks?status=invalid');
    expect(res.status).toBe(400);
  });

  it('paginates results with page and limit', async () => {
    for (let i = 0; i < 5; i++) await createTask({ title: `Task ${i}` });
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns second page correctly', async () => {
    for (let i = 0; i < 5; i++) await createTask({ title: `Task ${i}` });
    const page1 = await request(app).get('/tasks?page=1&limit=3');
    const page2 = await request(app).get('/tasks?page=2&limit=3');
    expect(page1.body).toHaveLength(3);
    expect(page2.body).toHaveLength(2);
    // No overlap
    const ids1 = page1.body.map(t => t.id);
    const ids2 = page2.body.map(t => t.id);
    expect(ids1.filter(id => ids2.includes(id))).toHaveLength(0);
  });
});

// ===========================================================================
// GET /tasks/:id
// ===========================================================================
describe('GET /tasks/:id', () => {
  it('returns a task by id', async () => {
    const task = await createTask({ title: 'Find me' });
    const res = await request(app).get(`/tasks/${task.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(task.id);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).get('/tasks/non-existent-id');
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// PUT /tasks/:id
// ===========================================================================
describe('PUT /tasks/:id', () => {
  it('updates a task', async () => {
    const task = await createTask({ title: 'Original' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Updated', priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBe(task.id);
  });

  it('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .put('/tasks/ghost-id')
      .send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid update data', async () => {
    const task = await createTask();
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// DELETE /tasks/:id
// ===========================================================================
describe('DELETE /tasks/:id', () => {
  it('deletes a task and returns 204', async () => {
    const task = await createTask();
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);

    const check = await request(app).get(`/tasks/${task.id}`);
    expect(check.status).toBe(404);
  });

  it('returns 404 for non-existent task', async () => {
    const res = await request(app).delete('/tasks/no-such-id');
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// PATCH /tasks/:id/complete
// ===========================================================================
describe('PATCH /tasks/:id/complete', () => {
  it('marks a pending task as completed', async () => {
    const task = await createTask({ title: 'To complete' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('returns 404 for non-existent task', async () => {
    const res = await request(app).patch('/tasks/ghost/complete');
    expect(res.status).toBe(404);
  });

  // BUG TEST: completing an already-completed task resets completedAt
  it('BUG: completing an already-completed task overwrites completedAt', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/complete`);
    const first = await request(app).get(`/tasks/${task.id}`);
    const firstCompletedAt = first.body.completedAt;

    // Wait a tick to ensure timestamp would differ
    await new Promise(r => setTimeout(r, 10));
    await request(app).patch(`/tasks/${task.id}/complete`);
    const second = await request(app).get(`/tasks/${task.id}`);

    // This documents the bug: completedAt changes on re-completion
    // Correct behavior: should return 409 or be a no-op
    expect(second.body.completedAt).not.toBe(firstCompletedAt); // BUG: it resets
  });
});

// ===========================================================================
// GET /tasks/stats
// ===========================================================================
describe('GET /tasks/stats', () => {
  it('returns zero counts when no tasks', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ pending: 0, 'in-progress': 0, completed: 0, overdue: 0 });
  });

  it('counts tasks by status correctly', async () => {
    await createTask({ status: 'pending' });
    await createTask({ status: 'pending' });
    await createTask({ status: 'in-progress' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.pending).toBe(2);
    expect(res.body['in-progress']).toBe(1);
    expect(res.body.completed).toBe(0);
  });

  it('counts overdue tasks (non-completed with past dueDate)', async () => {
    await createTask({ dueDate: '2000-01-01T00:00:00.000Z' }); // overdue
    await createTask({ dueDate: '2099-01-01T00:00:00.000Z' }); // not overdue
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });

  // FIXED: completed tasks with past dueDate should NOT be counted as overdue
  it('completed tasks with past dueDate are not counted as overdue (bug fixed)', async () => {
    const task = await createTask({ dueDate: '2000-01-01T00:00:00.000Z' });
    await request(app).patch(`/tasks/${task.id}/complete`);
    const res = await request(app).get('/tasks/stats');
    // Bug was: completed tasks with past dueDate were wrongly counted as overdue
    // Fix applied in taskService.getStats(): added task.status !== 'completed' guard
    expect(res.body.overdue).toBe(0); // correct behaviour after fix
  });
});

// ===========================================================================
// PATCH /tasks/:id/assign  — NEW FEATURE
// ===========================================================================
describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task to a user', async () => {
    const task = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.id).toBe(task.id);
  });

  it('trims whitespace from assignee name', async () => {
    const task = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '  Bob  ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/ghost-id/assign')
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when assignee is missing', async () => {
    const task = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is empty string', async () => {
    const task = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is not a string', async () => {
    const task = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 42 });
    expect(res.status).toBe(400);
  });

  it('allows reassigning an already-assigned task', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('persists the assignee on the task after assignment', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Charlie' });
    const res = await request(app).get(`/tasks/${task.id}`);
    expect(res.body.assignee).toBe('Charlie');
  });
});

// ===========================================================================
// Unit tests — taskService directly
// ===========================================================================
describe('taskService unit tests', () => {
  it('createTask returns task with defaults', () => {
    const task = taskService.createTask({ title: 'Unit test' });
    expect(task.status).toBe('pending');
    expect(task.priority).toBe('medium');
    expect(task.completedAt).toBeNull();
    expect(task.id).toBeDefined();
  });

  it('getTaskById returns null for missing id', () => {
    expect(taskService.getTaskById('fake')).toBeNull();
  });

  it('deleteTask returns false for missing id', () => {
    expect(taskService.deleteTask('fake')).toBe(false);
  });

  it('completeTask returns null for missing id', () => {
    expect(taskService.completeTask('fake')).toBeNull();
  });

  it('updateTask returns null for missing id', () => {
    expect(taskService.updateTask('fake', { title: 'X' })).toBeNull();
  });

  it('getAllTasks returns empty array when store is empty', () => {
    expect(taskService.getAllTasks()).toEqual([]);
  });

  it('getAllTasks paginates correctly', () => {
    for (let i = 0; i < 10; i++) taskService.createTask({ title: `Task ${i}` });
    const page1 = taskService.getAllTasks({ page: 1, limit: 3 });
    const page2 = taskService.getAllTasks({ page: 2, limit: 3 });
    expect(page1).toHaveLength(3);
    expect(page2).toHaveLength(3);
  });

  it('assignTask stores assignee on task', () => {
    const task = taskService.createTask({ title: 'Assign me' });
    const updated = taskService.assignTask(task.id, 'Dave');
    expect(updated.assignee).toBe('Dave');
  });

  it('assignTask returns null for missing id', () => {
    expect(taskService.assignTask('fake', 'Dave')).toBeNull();
  });
});

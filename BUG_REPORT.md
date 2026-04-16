# Bug Report — Task API

---

## Bug 1 — `PUT /tasks/:id` always returns 404

### Location
`src/routes/tasks.js` — PUT handler

### Expected
Updating a task by its ID should return the updated task with status 200.

### What actually happens
Every PUT request returns `404 Task not found`, even for valid IDs.

### How discovered
Writing an integration test for task updates — the task was created successfully, but a PUT to the same ID always returned 404.

### Root cause
```js
// BROKEN
const task = taskService.updateTask(req.id, req.body);

// FIXED
const task = taskService.updateTask(req.params.id, req.body);
```
`req.id` is `undefined` in Express; the route parameter is on `req.params.id`. So `updateTask` receives `undefined` as the ID and finds no match.

### Fix applied ✅
Changed `req.id` → `req.params.id` in the PUT handler.

---

## Bug 2 — `GET /tasks/stats` counts completed tasks as overdue

### Location
`src/services/taskService.js` — `getStats()`

### Expected
The `overdue` count should only include tasks that are **not completed** and whose `dueDate` is in the past.

### What actually happens
A task marked as `completed` with a past `dueDate` is still counted in `overdue`.

### How discovered
Integration test: created a task with `dueDate: '2000-01-01'`, completed it, then called `/tasks/stats`. Expected `overdue: 0`, got `overdue: 1`.

### Root cause
```js
// BROKEN — no status check
if (task.dueDate && new Date(task.dueDate) < now) {
  stats.overdue++;
}

// FIXED
if (task.dueDate && task.status !== 'completed' && new Date(task.dueDate) < now) {
  stats.overdue++;
}
```

### Fix applied ✅
Added `task.status !== 'completed'` guard in the overdue check.

---

## Bug 3 — `PATCH /tasks/:id/complete` allows re-completing a task

### Location
`src/services/taskService.js` — `completeTask()`

### Expected
Completing an already-completed task should either be a no-op (return the existing task unchanged) or return a `409 Conflict`.

### What actually happens
Calling the endpoint again on a completed task resets `completedAt` to a new timestamp, silently corrupting the completion record.

### How discovered
Called `/complete` twice on the same task with a small delay, then compared `completedAt` — it had changed.

### Suggested fix (not yet applied)
```js
function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return null;

  // Guard: no-op if already completed
  if (task.status === 'completed') return task;

  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  return task;
}
```
The route handler can also return `200` with the existing task for idempotent behaviour, or `409` if the caller needs to detect it. I'd lean toward no-op (idempotent) since REST PATCH is typically safe to retry.

---

## Bug 4 — `PUT /tasks/:id` merges instead of replacing

### Location
`src/services/taskService.js` — `updateTask()`

### Expected
A `PUT` (full update) should replace the task's mutable fields with exactly what was sent. Fields omitted from the body should revert to defaults, not carry over from the old task.

### What actually happens
`updateTask` uses object spread (`{ ...existing, ...updates }`), so any field not included in the PUT body silently keeps its old value.

### How discovered
Code review of `taskService.js`. Created a task with `priority: 'high'`, then PUT `{ title: 'New title' }` without a `priority` field — `priority` stayed `'high'` instead of reverting to the default `'medium'`.

### Suggested fix (not yet applied)
Either document that PUT behaves like PATCH (and rename/redirect accordingly), or explicitly construct a fresh task object from the PUT body with defaults applied for missing fields.

---

## Summary table

| # | Location | Severity | Fixed? |
|---|---|---|---|
| 1 | `routes/tasks.js` — PUT uses `req.id` | High — entire endpoint broken | ✅ Yes |
| 2 | `taskService.js` — `getStats()` overdue | Medium — incorrect metric | ✅ Yes |
| 3 | `taskService.js` — `completeTask()` re-completion | Low/Medium — data corruption | ⬜ No (documented) |
| 4 | `taskService.js` — `updateTask()` merge vs replace | Low — semantic mismatch | ⬜ No (documented) |

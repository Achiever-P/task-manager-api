# Task Manager API

A RESTful Task Management API built with Node.js and Express.  
Submitted as a take-home assignment — includes a full test suite, bug fixes, and a new feature.

## Live API
🌐 https://task-manager-api-production-a48e.up.railway.app

## Features
- Create, read, update, and delete tasks
- Filter tasks by status, paginate results
- Mark tasks as completed
- Assign tasks to users (new feature)
- Task statistics endpoint
- Full input validation

## Tech Stack
- Node.js + Express
- Jest + Supertest (testing)
- Deployed on Railway

## Getting Started

```bash
cd task-api
npm install
npm test        # run 44 tests
npm start       # start server on port 3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tasks | Get all tasks (filter by status, paginate) |
| POST | /tasks | Create a new task |
| GET | /tasks/:id | Get a task by ID |
| PUT | /tasks/:id | Update a task |
| DELETE | /tasks/:id | Delete a task |
| PATCH | /tasks/:id/complete | Mark task as completed |
| PATCH | /tasks/:id/assign | Assign task to a user |
| GET | /tasks/stats | Get task statistics |

## Bugs Found & Fixed
See [BUG_REPORT.md](./BUG_REPORT.md) for full details.

- ✅ Fixed: `PUT /tasks/:id` always returned 404 (`req.id` → `req.params.id`)
- ✅ Fixed: `GET /tasks/stats` counted completed tasks as overdue
- 📝 Documented: Re-completing a task resets `completedAt` timestamp
- 📝 Documented: `PUT` merges fields instead of replacing (wrong REST semantics)

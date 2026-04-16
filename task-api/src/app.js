'use strict';

const express = require('express');
const app = express();

app.use(express.json());

const taskRoutes = require('./routes/tasks');
app.use('/tasks', taskRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task API running on http://localhost:${PORT}`);
  });
}

module.exports = app;

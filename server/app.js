const express = require('express');
const path = require('path');
const app = express();

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const exploreRoutes = require('./routes/explore.routes');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/explore', exploreRoutes);

module.exports = app;
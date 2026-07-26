const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/explore — list all featured projects, newest first
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.description, p.technologies, p.github_link,
              p.image_url, p.likes_count, p.created_at, u.name AS owner_name,
              (SELECT COUNT(*) FROM project_comments c WHERE c.project_id = p.id) AS comment_count
       FROM projects p
       JOIN users u ON u.id = p.user_id
       WHERE p.is_featured = TRUE
       ORDER BY p.created_at DESC`
    );
    res.json({ success: true, projects: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/explore/:id/like — increment the like count on a project
router.post('/:id/like', async (req, res) => {
  try {
    await pool.query('UPDATE projects SET likes_count = likes_count + 1 WHERE id = ?', [req.params.id]);
    const [rows] = await pool.query('SELECT likes_count FROM projects WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, likesCount: rows[0].likes_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/explore/:id/comments — list comments for a project, oldest first
router.get('/:id/comments', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, commenter_name, content, created_at FROM project_comments WHERE project_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ success: true, comments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/explore/:id/comments — add a comment, no login required
router.post('/:id/comments', async (req, res) => {
  try {
    const { commenterName, content } = req.body;
    if (!commenterName || !content) {
      return res.status(400).json({ success: false, error: 'Name and comment are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO project_comments (project_id, commenter_name, content) VALUES (?, ?, ?)',
      [req.params.id, commenterName.trim(), content.trim()]
    );

    res.status(201).json({
      success: true,
      comment: { id: result.insertId, commenter_name: commenterName.trim(), content: content.trim(), created_at: new Date() }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;

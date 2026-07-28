const express = require('express');
const pool = require('../db');
const router = express.Router();

// Every route here expects an adminId (query for GET, body for others)
// belonging to a user whose role is 'admin'. This is a simple check —
// consistent with the rest of the app, which doesn't use sessions/JWTs.
async function requireAdmin(id, res) {
  if (!id) {
    res.status(401).json({ success: false, error: 'Not authorized' });
    return false;
  }
  const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
  if (rows.length === 0 || rows[0].role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return false;
  }
  return true;
}

// GET /api/admin/projects?adminId=123 — list every project from every user
router.get('/projects', async (req, res) => {
  try {
    const { adminId } = req.query;
    if (!(await requireAdmin(adminId, res))) return;

    const [rows] = await pool.query(
      `SELECT p.*, u.name AS owner_name, u.email AS owner_email
       FROM projects p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`
    );
    res.json({ success: true, projects: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/admin/projects/:id  { adminId, name, description, technologies, github, imageUrl }
router.put('/projects/:id', async (req, res) => {
  try {
    const { adminId, name, description, technologies, github, imageUrl } = req.body;
    if (!(await requireAdmin(adminId, res))) return;

    if (!name || !description || !technologies) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    await pool.query(
      `UPDATE projects SET name = ?, description = ?, technologies = ?, github_link = ?, image_url = ?
       WHERE id = ?`,
      [name, description, technologies, github || null, imageUrl || null, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PATCH /api/admin/projects/:id/feature  { adminId, isFeatured }
router.patch('/projects/:id/feature', async (req, res) => {
  try {
    const { adminId, isFeatured } = req.body;
    if (!(await requireAdmin(adminId, res))) return;

    await pool.query('UPDATE projects SET is_featured = ? WHERE id = ?', [!!isFeatured, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/admin/projects/:id  { adminId }  (sent as query since DELETE bodies are unreliable)
router.delete('/projects/:id', async (req, res) => {
  try {
    const { adminId } = req.query;
    if (!(await requireAdmin(adminId, res))) return;

    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
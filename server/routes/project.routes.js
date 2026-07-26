const express = require('express');
const multer = require('multer');
const pool = require('../db');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// GET /api/projects?userId=123
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    const [rows] = await pool.query(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json({ success: true, projects: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/projects  (multipart form: userId, name, description, technologies, github, imageUrl, image file)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { userId, name, description, technologies, github, imageUrl } = req.body;
    if (!userId || !name || !description || !technologies) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const finalImageUrl = req.file ? '/uploads/' + req.file.filename : (imageUrl || null);

    const [result] = await pool.query(
      `INSERT INTO projects (user_id, name, description, technologies, github_link, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name, description, technologies, github || null, finalImageUrl]
    );

    res.status(201).json({ success: true, projectId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, technologies, github, imageUrl } = req.body;
    const finalImageUrl = req.file ? '/uploads/' + req.file.filename : (imageUrl || null);

    await pool.query(
      `UPDATE projects SET name = ?, description = ?, technologies = ?, github_link = ?, image_url = ?
       WHERE id = ?`,
      [name, description, technologies, github || null, finalImageUrl, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PATCH /api/projects/:id/feature  { isFeatured: true/false }
router.patch('/:id/feature', async (req, res) => {
  try {
    const { isFeatured } = req.body;
    await pool.query('UPDATE projects SET is_featured = ? WHERE id = ?', [!!isFeatured, req.params.id]);
    res.json({ success: true, isFeatured: !!isFeatured });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
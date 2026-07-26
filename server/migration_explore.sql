-- ProjectVault — Explore feature migration
-- Run this AFTER schema.sql if you already have a projectvault database set up.
-- (If you're setting up fresh, schema.sql now includes these changes already.)

USE projectvault;

ALTER TABLE projects
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN likes_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS project_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  commenter_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
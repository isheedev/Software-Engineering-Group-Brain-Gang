-- ProjectVault — Admin role + real like-tracking migration
-- Run this in DBeaver against your existing projectvault database.

USE projectvault;

ALTER TABLE users
  ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';

-- One row per (project, user) like — the UNIQUE constraint is what
-- actually stops someone from liking the same project twice.
CREATE TABLE IF NOT EXISTS project_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Promote yourself to admin so you can test the admin panel.
-- Replace the email with your actual test account's email.
-- UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';

/**
 * ProjectVault — API Route Tests
 * Covers: registration, duplicate registration, successful login,
 * wrong password, and creating a project — now against the real
 * Express routes instead of localStorage.
 *
 * The MySQL pool is mocked so these tests run fast and don't need
 * a real database connection.
 */

jest.mock('../server/db', () => ({
  query: jest.fn()
}));

const request = require('supertest');
const bcrypt = require('bcrypt');
const pool = require('../server/db');
const app = require('../server/app');

beforeEach(() => {
  pool.query.mockReset();
});

describe('Scenario 1: User registers with a new, unique email', () => {
  test('account is created and a user object is returned', async () => {
    pool.query
      .mockResolvedValueOnce([[]])                          // no existing user with this email
      .mockResolvedValueOnce([{ insertId: 1 }]);             // insert result

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane Doe', email: 'jane@example.com', password: 'password1', confirm: 'password1' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('jane@example.com');
  });
});

describe('Scenario 2: User tries to register with an email already in use', () => {
  test('registration is rejected with a 409 and an error message', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1 }]]);          // existing user found

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane Imposter', email: 'jane@example.com', password: 'password2', confirm: 'password2' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe('Scenario 3: User logs in with correct email and password', () => {
  test('login succeeds and returns the user', async () => {
    const hash = await bcrypt.hash('password1', 10);
    pool.query.mockResolvedValueOnce([[
      { id: 1, name: 'Jane Doe', email: 'jane@example.com', password_hash: hash }
    ]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com', password: 'password1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('jane@example.com');
  });
});

describe('Scenario 4: User logs in with the wrong password', () => {
  test('login fails with a 401 and an error message', async () => {
    const hash = await bcrypt.hash('password1', 10);
    pool.query.mockResolvedValueOnce([[
      { id: 1, name: 'Jane Doe', email: 'jane@example.com', password_hash: hash }
    ]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid/i);
  });
});

describe('Scenario 5: User adds a new project', () => {
  test('project is created and a projectId is returned', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 42 }]);

    const res = await request(app)
      .post('/api/projects')
      .field('userId', '1')
      .field('name', 'ProjectVault')
      .field('description', 'A portfolio site for showcasing student projects')
      .field('technologies', 'HTML, CSS, JavaScript');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.projectId).toBe(42);
  });
});
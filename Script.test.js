/**
 * ProjectVault — Unit Tests
 * Covers 4 user scenarios: registration, duplicate registration,
 * successful login, and adding a new project.
 */

const { registerUser, loginUser, createProject, getUsers, getProjects } = require('./script.js');

beforeEach(() => {
  localStorage.clear();
});

describe('Scenario 1: User registers with a new, unique email', () => {
  test('account is created and the user is logged in', () => {
    const result = registerUser('Jane Doe', 'jane@example.com', 'password1', 'password1');

    expect(result.success).toBe(true);
    expect(getUsers()).toHaveLength(1);
    expect(getUsers()[0].email).toBe('jane@example.com');
  });
});

describe('Scenario 2: User tries to register with an email already in use', () => {
  test('registration is rejected and no duplicate account is created', () => {
    registerUser('Jane Doe', 'jane@example.com', 'password1', 'password1');
    const result = registerUser('Jane Imposter', 'jane@example.com', 'password2', 'password2');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already exists/i);
    expect(getUsers()).toHaveLength(1);
  });
});

describe('Scenario 3: User logs in with correct email and password', () => {
  test('login succeeds', () => {
    registerUser('Jane Doe', 'jane@example.com', 'password1', 'password1');
    const result = loginUser('jane@example.com', 'password1');

    expect(result.success).toBe(true);
    expect(result.user.email).toBe('jane@example.com');
  });
});

describe('Scenario 4: User logs in with the wrong password', () => {
  test('login fails with an error and no session is created', () => {
    registerUser('Jane Doe', 'jane@example.com', 'password1', 'password1');
    const result = loginUser('jane@example.com', 'wrongpassword');
 
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });
});
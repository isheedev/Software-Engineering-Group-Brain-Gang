/** @jest-environment jsdom */

describe('create project form submission', () => {
  let createProjectModule;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <form id="createProjectForm">
        <input id="projectName" value="Test Project" />
        <textarea id="projectDescription">A test description</textarea>
        <input id="projectTechnologies" value="JavaScript, Jest" />
        <input id="projectImage" type="file" />
        <input id="projectGitHub" value="https://github.com/test/repo" />
      </form>
    `;

    global.fetch = jest.fn();
    global.alert = jest.fn();

    createProjectModule = require('../client/createProject.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('submits form data to the projects API and resets the form on success', async () => {
    const imageFile = new File(['image-content'], 'project.png', { type: 'image/png' });
    const imageInput = document.getElementById('projectImage');
    Object.defineProperty(imageInput, 'files', {
      value: [imageFile],
      configurable: true
    });

    const form = document.getElementById('createProjectForm');
    form.reset = jest.fn();

    global.fetch.mockResolvedValue({ ok: true });

    const { handleCreateProjectSubmit } = createProjectModule;
    await handleCreateProjectSubmit({ preventDefault: jest.fn() });

    expect(global.fetch).toHaveBeenCalledWith('/api/projects', expect.any(Object));

    const [, requestOptions] = global.fetch.mock.calls[0];
    const formData = requestOptions.body;

    expect(formData.get('name')).toBe('Test Project');
    expect(formData.get('description')).toBe('A test description');
    expect(formData.get('technologies')).toBe('JavaScript, Jest');
    expect(formData.get('github')).toBe('https://github.com/test/repo');
    expect(formData.get('image')).toBe(imageFile);

    expect(global.alert).toHaveBeenCalledWith('Project created successfully!');
    expect(form.reset).toHaveBeenCalled();
  });

  test('shows an alert when the project creation request fails', async () => {
    global.fetch.mockResolvedValue({ ok: false });

    const { handleCreateProjectSubmit } = createProjectModule;
    await handleCreateProjectSubmit({ preventDefault: jest.fn() });

    expect(global.alert).toHaveBeenCalledWith('Error creating project.');
  });
});

async function handleCreateProjectSubmit(e) {
    e.preventDefault();

    const createProjectForm = document.getElementById('createProjectForm');
    const projectName = document.getElementById('projectName').value;
    const projectDescription = document.getElementById('projectDescription').value;
    const projectTechnologies = document.getElementById('projectTechnologies').value;
    const projectImage = document.getElementById('projectImage').files[0];
    const projectGitHub = document.getElementById('projectGitHub').value;

    const formData = new FormData();
    formData.append('name', projectName);
    formData.append('description', projectDescription);
    formData.append('technologies', projectTechnologies);
    formData.append('image', projectImage);
    formData.append('github', projectGitHub);

    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            alert('Project created successfully!');
            createProjectForm.reset();
        } else {
            alert('Error creating project.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while creating the project.');
    }
}

if (typeof document !== 'undefined') {
    const createProjectForm = document.getElementById('createProjectForm');

    if (createProjectForm) {
        createProjectForm.addEventListener('submit', handleCreateProjectSubmit);
    }
}

module.exports = {
    handleCreateProjectSubmit
};
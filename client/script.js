/*ProjectVault — Frontend Logic*/

// ── Storage Helpers ──
const Storage = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    remove(key) { localStorage.removeItem(key); }
};

// ── User Management ──
function getUsers() { return Storage.get('pv_users') || []; }
function saveUsers(users) { Storage.set('pv_users', users); }
function getCurrentUser() { return Storage.get('pv_current_user'); }
function setCurrentUser(user) { Storage.set('pv_current_user', user); }
function logout() { Storage.remove('pv_current_user'); window.location.href = 'index.html'; }

// ── Project Management ──
function getProjects() { return Storage.get('pv_projects') || []; }
function saveProjects(projects) { Storage.set('pv_projects', projects); }

function getUserProjects(userId) {
    return getProjects().filter(p => p.userId === userId);
}

// ── Toast Notifications ──
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark';
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icon}" style="font-size:1.3rem"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ── Generate Unique ID ──
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/*INDEX PAGE LOGIC*/
function initIndexPage() {

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('main-navbar');
        if (nav) nav.classList.toggle('navbar-scrolled', window.scrollY > 50);
    });

    // Animated stat counters
    const counters = document.querySelectorAll('.stat-number[data-target]');
    const animateCounter = (el) => {
        const target = +el.dataset.target;
        const duration = 1500;
        const start = performance.now();
        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(target * eased);
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    if (counters.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    animateCounter(e.target);
                    observer.unobserve(e.target);
                }
            });
        }, { threshold: 0.5 });
        counters.forEach(c => observer.observe(c));
    }

    // Scroll reveal for feature/step cards
    const reveals = document.querySelectorAll('.feature-card, .step-card');
    if (reveals.length) {
        reveals.forEach(el => el.classList.add('reveal'));
        const revealObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    revealObs.unobserve(e.target);
                }
            });
        }, { threshold: 0.15 });
        reveals.forEach(el => revealObs.observe(el));
    }

    // Register Form
    const regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim().toLowerCase();
            const pass = document.getElementById('reg-password').value;
            const confirm = document.getElementById('reg-confirm').value;

            if (pass !== confirm) { showToast('Passwords do not match', 'error'); return; }

            const users = getUsers();
            if (users.find(u => u.email === email)) {
                showToast('An account with this email already exists', 'error'); return;
            }

            const user = { id: generateId(), name, email, password: pass };
            users.push(user);
            saveUsers(users);
            setCurrentUser({ id: user.id, name: user.name, email: user.email });
            showToast('Account created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            setTimeout(() => window.location.href = 'dashboard.html', 600);
        });
    }

    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim().toLowerCase();
            const pass = document.getElementById('login-password').value;

            const users = getUsers();
            const user = users.find(u => u.email === email && u.password === pass);
            if (!user) { showToast('Invalid email or password', 'error'); return; }

            setCurrentUser({ id: user.id, name: user.name, email: user.email });
            showToast('Welcome back, ' + user.name + '!');
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            setTimeout(() => window.location.href = 'dashboard.html', 600);
        });
    }

    // Modal switching
    const switchToReg = document.getElementById('switch-to-register');
    const switchToLog = document.getElementById('switch-to-login');
    if (switchToReg) {
        switchToReg.addEventListener('click', (e) => {
            e.preventDefault();
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            setTimeout(() => new bootstrap.Modal(document.getElementById('registerModal')).show(), 300);
        });
    }
    if (switchToLog) {
        switchToLog.addEventListener('click', (e) => {
            e.preventDefault();
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            setTimeout(() => new bootstrap.Modal(document.getElementById('loginModal')).show(), 300);
        });
    }

    // If already logged in, redirect or show dashboard link
    const user = getCurrentUser();
    if (user) {
        const authItems = document.querySelectorAll('.nav-auth-item');
        authItems.forEach(el => el.innerHTML = '');

        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `<a class="btn btn-gradient btn-sm nav-btn" href="dashboard.html"><i class="fa-solid fa-grid-2 me-1"></i> Dashboard</a>`;
        const navList = document.querySelector('#navMenu .navbar-nav');
        if (navList) navList.appendChild(li);
    }
}

/* DASHBOARD PAGE LOGIC */
let currentDeleteId = null;

function initDashboardPage() {
    const user = getCurrentUser();
    if (!user) { window.location.href = 'index.html'; return; }

    // Set greeting
    const greetEl = document.getElementById('dash-username');
    if (greetEl) greetEl.textContent = user.name.split(' ')[0];

    // Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Render projects
    renderProjects();

    // Search & Filter
    const searchInput = document.getElementById('search-input');
    const filterTech = document.getElementById('filter-tech');
    const sortSelect = document.getElementById('sort-select');

    if (searchInput) searchInput.addEventListener('input', renderProjects);
    if (filterTech) filterTech.addEventListener('change', renderProjects);
    if (sortSelect) sortSelect.addEventListener('change', renderProjects);

    // Project Form
    const projForm = document.getElementById('projectForm');
    if (projForm) {
        projForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveProject();
        });
    }

    // Image upload preview
    const imageUpload = document.getElementById('project-image-upload');
    if (imageUpload) {
        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('image-preview').src = ev.target.result;
                document.getElementById('image-preview-container').classList.remove('d-none');
                document.getElementById('project-image').value = '';
            };
            reader.readAsDataURL(file);
        });
    }

    const removeImg = document.getElementById('btn-remove-image');
    if (removeImg) {
        removeImg.addEventListener('click', () => {
            document.getElementById('image-preview-container').classList.add('d-none');
            document.getElementById('image-preview').src = '';
            document.getElementById('project-image-upload').value = '';
        });
    }

    // Delete confirmation
    const confirmDel = document.getElementById('btn-confirm-delete');
    if (confirmDel) {
        confirmDel.addEventListener('click', () => {
            if (currentDeleteId) {
                let projects = getProjects();
                projects = projects.filter(p => p.id !== currentDeleteId);
                saveProjects(projects);
                currentDeleteId = null;
                bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
                renderProjects();
                showToast('Project deleted');
            }
        });
    }
}

function openNewProject() {
    document.getElementById('projectModalLabel').textContent = 'New Project';
    document.getElementById('projectForm').reset();
    document.getElementById('project-id').value = '';
    document.getElementById('image-preview-container').classList.add('d-none');
}

function openEditProject(id) {
    const projects = getProjects();
    const p = projects.find(pr => pr.id === id);
    if (!p) return;

    document.getElementById('projectModalLabel').textContent = 'Edit Project';
    document.getElementById('project-id').value = p.id;
    document.getElementById('project-name').value = p.name;
    document.getElementById('project-desc').value = p.description;
    document.getElementById('project-techs').value = p.technologies.join(', ');
    document.getElementById('project-github').value = p.github || '';
    document.getElementById('project-image').value = p.imageUrl || '';
    document.getElementById('project-image-upload').value = '';

    if (p.imageData || p.imageUrl) {
        document.getElementById('image-preview').src = p.imageData || p.imageUrl;
        document.getElementById('image-preview-container').classList.remove('d-none');
    } else {
        document.getElementById('image-preview-container').classList.add('d-none');
    }

    new bootstrap.Modal(document.getElementById('projectModal')).show();
}

function confirmDelete(id) {
    currentDeleteId = id;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

function saveProject() {
    const user = getCurrentUser();
    if (!user) return;

    const id = document.getElementById('project-id').value;
    const name = document.getElementById('project-name').value.trim();
    const description = document.getElementById('project-desc').value.trim();
    const technologies = document.getElementById('project-techs').value
        .split(',').map(t => t.trim()).filter(t => t);
    const github = document.getElementById('project-github').value.trim();
    const imageUrl = document.getElementById('project-image').value.trim();
    const previewImg = document.getElementById('image-preview');
    const imageData = previewImg.src && previewImg.src.startsWith('data:') ? previewImg.src : '';

    let projects = getProjects();

    if (id) {
        // Edit existing
        const idx = projects.findIndex(p => p.id === id);
        if (idx !== -1) {
            projects[idx] = { ...projects[idx], name, description, technologies, github, imageUrl, imageData, updatedAt: new Date().toISOString() };
        }
        showToast('Project updated!');
    } else {
        // Create new
        projects.push({
            id: generateId(),
            userId: user.id,
            name, description, technologies, github, imageUrl, imageData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        showToast('Project created!');
    }

    saveProjects(projects);
    bootstrap.Modal.getInstance(document.getElementById('projectModal')).hide();
    renderProjects();
}

function renderProjects() {
    const user = getCurrentUser();
    if (!user) return;

    const grid = document.getElementById('projects-grid');
    const empty = document.getElementById('empty-state');
    if (!grid) return;

    let projects = getUserProjects(user.id);

    // Search filter
    const search = (document.getElementById('search-input')?.value || '').toLowerCase();
    if (search) {
        projects = projects.filter(p =>
            p.name.toLowerCase().includes(search) ||
            p.description.toLowerCase().includes(search) ||
            p.technologies.some(t => t.toLowerCase().includes(search))
        );
    }

    // Tech filter
    const techFilter = document.getElementById('filter-tech')?.value || '';
    if (techFilter) {
        projects = projects.filter(p =>
            p.technologies.some(t => t.toLowerCase() === techFilter.toLowerCase())
        );
    }

    // Sort
    const sort = document.getElementById('sort-select')?.value || 'newest';
    if (sort === 'newest') projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'oldest') projects.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sort === 'name') projects.sort((a, b) => a.name.localeCompare(b.name));

    // Populate tech filter dropdown (from all user projects)
    populateTechFilter(user.id);

    if (projects.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.classList.remove('d-none');
        return;
    }

    if (empty) empty.classList.add('d-none');

    grid.innerHTML = projects.map(p => {
        const imgSrc = p.imageData || p.imageUrl;
        const imgHtml = imgSrc
            ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.name)}" class="project-img">`
            : `<div class="project-img-placeholder"><i class="fa-solid fa-code"></i></div>`;

        const techTags = p.technologies.map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('');

        const githubHtml = p.github
            ? `<a href="${escapeHtml(p.github)}" target="_blank" class="github-link"><i class="fa-brands fa-github"></i> Repo</a>`
            : '<span></span>';

        return `
        <div class="col-sm-6 col-lg-4">
            <div class="project-card">
                ${imgHtml}
                <div class="project-card-body">
                    <h3>${escapeHtml(p.name)}</h3>
                    <p>${escapeHtml(p.description)}</p>
                    <div class="tech-tags">${techTags}</div>
                </div>
                <div class="project-card-footer">
                    ${githubHtml}
                    <div class="project-actions">
                        <button onclick="openEditProject('${p.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="confirmDelete('${p.id}')" class="btn-delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function populateTechFilter(userId) {
    const select = document.getElementById('filter-tech');
    if (!select) return;

    const allProjects = getUserProjects(userId);
    const techSet = new Set();
    allProjects.forEach(p => p.technologies.forEach(t => techSet.add(t)));

    const currentVal = select.value;
    select.innerHTML = '<option value="">All Technologies</option>';
    [...techSet].sort().forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (t === currentVal) opt.selected = true;
        select.appendChild(opt);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/*  INIT*/
document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we're on
    const isDashboard = document.body.classList.contains('dashboard-body');

    if (isDashboard) {
        initDashboardPage();
    } else {
        initIndexPage();
    }
});

/* ProjectVault — Frontend Logic (now backed by the real API) */

// ── Session Helpers (still uses localStorage, but only to remember who's logged in) ──
const Storage = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    remove(key) { localStorage.removeItem(key); }
};

function getCurrentUser() { return Storage.get('pv_current_user'); }
function setCurrentUser(user) { Storage.set('pv_current_user', user); }
function logout() { Storage.remove('pv_current_user'); window.location.href = 'index.html'; }

// ── API Helpers ──
async function apiRegister(name, email, password, confirm) {
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirm })
    });
    return res.json();
}

async function apiLogin(email, password) {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return res.json();
}

async function apiGetProjects(userId) {
    const res = await fetch(`/api/projects?userId=${encodeURIComponent(userId)}`);
    return res.json();
}

async function apiCreateProject(formData) {
    const res = await fetch('/api/projects', { method: 'POST', body: formData });
    return res.json();
}

async function apiUpdateProject(id, formData) {
    const res = await fetch(`/api/projects/${id}`, { method: 'PUT', body: formData });
    return res.json();
}

async function apiDeleteProject(id) {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    return res.json();
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

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ═══════════════════════════════════════════════
   REGISTER PAGE
   ═══════════════════════════════════════════════ */
function initRegisterPage() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const pass = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;

        const result = await apiRegister(name, email, pass, confirm);
        if (!result.success) { showToast(result.error, 'error'); return; }

        setCurrentUser(result.user);
        showToast('Account created successfully!');
        setTimeout(() => window.location.href = 'dashboard.html', 700);
    });
}

/* ═══════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════ */
function initLoginPage() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-password').value;

        const result = await apiLogin(email, pass);
        if (!result.success) { showToast(result.error, 'error'); return; }

        setCurrentUser(result.user);
        showToast('Welcome back, ' + result.user.name + '!');
        setTimeout(() => window.location.href = 'dashboard.html', 700);
    });
}

/* ═══════════════════════════════════════════════
   INDEX PAGE
   ═══════════════════════════════════════════════ */
function initIndexPage() {
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('main-navbar');
        if (nav) nav.classList.toggle('navbar-scrolled', window.scrollY > 50);
    });

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

/* ═══════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════ */
let allProjects = [];
let currentDeleteId = null;

async function initDashboardPage() {
    const user = getCurrentUser();
    if (!user) { window.location.href = 'index.html'; return; }

    const greetEl = document.getElementById('dash-username');
    if (greetEl) greetEl.textContent = user.name.split(' ')[0];

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    await loadAndRenderProjects();

    const searchInput = document.getElementById('search-input');
    const filterTech = document.getElementById('filter-tech');
    const sortSelect = document.getElementById('sort-select');
    if (searchInput) searchInput.addEventListener('input', renderProjects);
    if (filterTech) filterTech.addEventListener('change', renderProjects);
    if (sortSelect) sortSelect.addEventListener('change', renderProjects);

    const form = document.getElementById('projectForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('project-id').value;
            const formData = new FormData();
            formData.append('userId', user.id);
            formData.append('name', document.getElementById('project-name').value.trim());
            formData.append('description', document.getElementById('project-desc').value.trim());
            formData.append('technologies', document.getElementById('project-techs').value.trim());
            formData.append('github', document.getElementById('project-github').value.trim());
            formData.append('imageUrl', document.getElementById('project-image').value.trim());

            const fileInput = document.getElementById('project-image-upload');
            if (fileInput && fileInput.files[0]) {
                formData.append('image', fileInput.files[0]);
            }

            const result = id
                ? await apiUpdateProject(id, formData)
                : await apiCreateProject(formData);

            if (!result.success) { showToast(result.error || 'Something went wrong', 'error'); return; }

            showToast(id ? 'Project updated!' : 'Project added!');
            bootstrap.Modal.getInstance(document.getElementById('projectModal')).hide();
            form.reset();
            document.getElementById('project-id').value = '';
            await loadAndRenderProjects();
        });
    }

    const confirmDeleteBtn = document.getElementById('btn-confirm-delete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!currentDeleteId) return;
            const result = await apiDeleteProject(currentDeleteId);
            if (result.success) {
                showToast('Project deleted');
                bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
                await loadAndRenderProjects();
            } else {
                showToast(result.error || 'Could not delete project', 'error');
            }
        });
    }
}

async function loadAndRenderProjects() {
    const user = getCurrentUser();
    if (!user) return;
    const result = await apiGetProjects(user.id);
    allProjects = result.success ? result.projects : [];
    renderProjects();
}

function renderProjects() {
    const grid = document.getElementById('projects-grid');
    const empty = document.getElementById('empty-state');
    if (!grid) return;

    let projects = [...allProjects];

    const search = (document.getElementById('search-input')?.value || '').toLowerCase();
    if (search) {
        projects = projects.filter(p =>
            p.name.toLowerCase().includes(search) ||
            p.description.toLowerCase().includes(search) ||
            p.technologies.toLowerCase().includes(search)
        );
    }

    const techFilter = document.getElementById('filter-tech')?.value || '';
    if (techFilter) {
        projects = projects.filter(p =>
            p.technologies.toLowerCase().split(',').map(t => t.trim()).includes(techFilter.toLowerCase())
        );
    }

    const sort = document.getElementById('sort-select')?.value || 'newest';
    if (sort === 'newest') projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'oldest') projects.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sort === 'name') projects.sort((a, b) => a.name.localeCompare(b.name));

    populateTechFilter();

    if (projects.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.classList.remove('d-none');
        return;
    }
    if (empty) empty.classList.add('d-none');

    grid.innerHTML = projects.map(p => {
        const imgHtml = p.image_url
            ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" class="project-img">`
            : `<div class="project-img-placeholder"><i class="fa-solid fa-code"></i></div>`;

        const techTags = p.technologies.split(',').map(t =>
            `<span class="tech-tag">${escapeHtml(t.trim())}</span>`
        ).join('');

        const githubHtml = p.github_link
            ? `<a href="${escapeHtml(p.github_link)}" target="_blank" class="github-link"><i class="fa-brands fa-github"></i> Repo</a>`
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
                        <button onclick="openEditProject(${p.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="confirmDelete(${p.id})" class="btn-delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function populateTechFilter() {
    const select = document.getElementById('filter-tech');
    if (!select) return;

    const techSet = new Set();
    allProjects.forEach(p => p.technologies.split(',').forEach(t => techSet.add(t.trim())));

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

function openNewProject() {
    document.getElementById('projectForm').reset();
    document.getElementById('project-id').value = '';
    document.getElementById('projectModalLabel').textContent = 'New Project';
}

function openEditProject(id) {
    const p = allProjects.find(p => p.id === id);
    if (!p) return;
    document.getElementById('project-id').value = p.id;
    document.getElementById('project-name').value = p.name;
    document.getElementById('project-desc').value = p.description;
    document.getElementById('project-techs').value = p.technologies;
    document.getElementById('project-github').value = p.github_link || '';
    document.getElementById('project-image').value = p.image_url || '';
    document.getElementById('projectModalLabel').textContent = 'Edit Project';
    new bootstrap.Modal(document.getElementById('projectModal')).show();
}

function confirmDelete(id) {
    currentDeleteId = id;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

/* ═══════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const isDashboard = document.body.classList.contains('dashboard-body');
    const isRegister = document.body.classList.contains('register-body');
    const isLogin = document.body.classList.contains('login-body');

    if (isDashboard) {
        initDashboardPage();
    } else if (isRegister) {
        initRegisterPage();
    } else if (isLogin) {
        initLoginPage();
    } else {
        initIndexPage();
    }
});
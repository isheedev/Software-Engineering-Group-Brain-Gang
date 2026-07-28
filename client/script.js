/* ProjectVault — Frontend Logic (now backed by the real API) */

// ── Session Helpers (localStorage remembers who's logged in, with a 15-minute expiry) ──
const SESSION_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const Storage = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    remove(key) { localStorage.removeItem(key); }
};

function getCurrentUser() {
    const session = Storage.get('pv_session');
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
        Storage.remove('pv_session');
        return null;
    }

    return session.user;
}

function setCurrentUser(user) {
    Storage.set('pv_session', {
        user,
        expiresAt: Date.now() + SESSION_DURATION_MS
    });
}

function logout() { Storage.remove('pv_session'); window.location.href = 'index.html'; }

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
    toast.innerHTML = `<i class="fa-solid ${icon}" style="font-size:1.5rem"></i> ${message}`;
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

    if (getCurrentUser()) {
        window.location.href = 'dashboard.html';
        return;
    }

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

    if (getCurrentUser()) {
        window.location.href = 'dashboard.html';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-password').value;

        const result = await apiLogin(email, pass);
        if (!result.success) { showToast(result.error, 'error'); return; }

        setCurrentUser(result.user);
        showToast('Welcome back, ' + result.user.name + '!');
        const destination = result.user.role === 'admin' ? 'admin.html' : 'dashboard.html';
        setTimeout(() => window.location.href = destination, 700);
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

    const adminLink = document.getElementById('admin-nav-link');
    if (adminLink && user.role === 'admin') adminLink.classList.remove('d-none');

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
                        <button onclick="toggleFeatured(${p.id}, ${!p.is_featured})" title="${p.is_featured ? 'Remove from Explore' : 'Feature on Explore'}" class="${p.is_featured ? 'btn-featured-active' : ''}">
                            <i class="fa-solid fa-star"></i>
                        </button>
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
   EXPLORE PAGE (public — no login required to view, like, or comment)
   ═══════════════════════════════════════════════ */
let exploreProjects = [];

async function initExplorePage() {
    const grid = document.getElementById('explore-grid');
    if (!grid) return;

    const user = getCurrentUser();
    const url = user ? `/api/explore?userId=${user.id}` : '/api/explore';
    const res = await fetch(url);
    const result = await res.json();
    exploreProjects = result.success ? result.projects : [];
    renderExploreGrid();

    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const projectId = document.getElementById('comment-project-id').value;
            const commenterName = document.getElementById('comment-name').value.trim();
            const content = document.getElementById('comment-content').value.trim();

            const res = await fetch(`/api/explore/${projectId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commenterName, content })
            });
            const result = await res.json();
            if (!result.success) { showToast(result.error || 'Could not post comment', 'error'); return; }

            document.getElementById('comment-content').value = '';
            await loadComments(projectId);
        });
    }
}

function renderExploreGrid() {
    const grid = document.getElementById('explore-grid');
    const empty = document.getElementById('explore-empty');
    if (!grid) return;

    if (exploreProjects.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.classList.remove('d-none');
        return;
    }
    if (empty) empty.classList.add('d-none');

    grid.innerHTML = exploreProjects.map(p => {
        const imgHtml = p.image_url
            ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" class="project-img">`
            : `<div class="project-img-placeholder"><i class="fa-solid fa-code"></i></div>`;

        const techTags = p.technologies.split(',').map(t =>
            `<span class="tech-tag">${escapeHtml(t.trim())}</span>`
        ).join('');

        return `
        <div class="col-sm-6 col-lg-4">
            <div class="project-card">
                ${imgHtml}
                <div class="project-card-body">
                    <h3>${escapeHtml(p.name)}</h3>
                    <p class="project-owner">by ${escapeHtml(p.owner_name)}</p>
                    <p>${escapeHtml(p.description)}</p>
                    <div class="tech-tags">${techTags}</div>
                </div>
                <div class="project-card-footer">
                    <div class="d-flex gap-3">
                        <button onclick="likeProject(${p.id})" class="btn-like ${p.liked_by_user ? 'btn-liked' : ''}" title="${p.liked_by_user ? 'You liked this' : 'Like'}" ${p.liked_by_user ? 'disabled' : ''}>
                            <i class="fa-solid fa-heart"></i> <span id="likes-${p.id}">${p.likes_count}</span>
                        </button>
                        <button onclick="openComments(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')" class="btn-like" title="Comments">
                            <i class="fa-solid fa-comment"></i> ${p.comment_count}
                        </button>
                    </div>
                    ${p.github_link ? `<a href="${escapeHtml(p.github_link)}" target="_blank" class="github-link"><i class="fa-brands fa-github"></i></a>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

async function likeProject(id) {
    const user = getCurrentUser();
    if (!user) {
        showToast('Log in to like a project', 'error');
        setTimeout(() => window.location.href = 'login.html', 900);
        return;
    }

    const res = await fetch(`/api/explore/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
    });
    const result = await res.json();
    if (result.success) {
        const span = document.getElementById(`likes-${id}`);
        if (span) span.textContent = result.likesCount;
        const btn = span ? span.closest('.btn-like') : null;
        if (btn) { btn.classList.add('btn-liked'); btn.disabled = true; btn.title = 'You liked this'; }
    } else {
        showToast(result.error || 'Could not like this project', 'error');
    }
}

async function openComments(id, projectName) {
    document.getElementById('comment-project-id').value = id;
    document.getElementById('commentsModalTitle').textContent = `Comments — ${projectName}`;
    await loadComments(id);
    new bootstrap.Modal(document.getElementById('commentsModal')).show();
}

async function loadComments(id) {
    const res = await fetch(`/api/explore/${id}/comments`);
    const result = await res.json();
    const list = document.getElementById('comments-list');
    if (!list) return;

    if (!result.success || result.comments.length === 0) {
        list.innerHTML = `<p class="admin-email">No comments yet. Be the first!</p>`;
        return;
    }

    list.innerHTML = result.comments.map(c => `
        <div class="comment-item mb-2 pb-2">
            <strong>${escapeHtml(c.commenter_name)}</strong>
            <p class="mb-0">${escapeHtml(c.content)}</p>
        </div>
    `).join('');
}

async function toggleFeatured(id, isFeatured) {
    const res = await fetch(`/api/projects/${id}/feature`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured })
    });
    const result = await res.json();
    if (result.success) {
        showToast(isFeatured ? 'Project is now featured on Explore!' : 'Project removed from Explore');
        await loadAndRenderProjects();
    } else {
        showToast(result.error || 'Could not update project', 'error');
    }
}

/* ═══════════════════════════════════════════════
   ADMIN PAGE
   ═══════════════════════════════════════════════ */
let adminProjects = [];

async function initAdminPage() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') { window.location.href = 'index.html'; return; }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const searchInput = document.getElementById('admin-search');
    if (searchInput) searchInput.addEventListener('input', renderAdminTable);

    const editForm = document.getElementById('adminEditForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('admin-edit-id').value;
            const res = await fetch(`/api/admin/projects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId: user.id,
                    name: document.getElementById('admin-edit-name').value.trim(),
                    description: document.getElementById('admin-edit-desc').value.trim(),
                    technologies: document.getElementById('admin-edit-techs').value.trim(),
                    github: document.getElementById('admin-edit-github').value.trim(),
                    imageUrl: document.getElementById('admin-edit-image').value.trim()
                })
            });
            const result = await res.json();
            if (result.success) {
                showToast('Project updated');
                bootstrap.Modal.getInstance(document.getElementById('adminEditModal')).hide();
                await loadAdminProjects();
            } else {
                showToast(result.error || 'Could not update project', 'error');
            }
        });
    }

    await loadAdminProjects();
}

async function loadAdminProjects() {
    const user = getCurrentUser();
    const res = await fetch(`/api/admin/projects?adminId=${user.id}`);
    const result = await res.json();
    adminProjects = result.success ? result.projects : [];
    renderAdminTable();
}

function renderAdminTable() {
    const body = document.getElementById('admin-projects-body');
    const empty = document.getElementById('admin-empty');
    if (!body) return;

    const search = (document.getElementById('admin-search')?.value || '').toLowerCase();
    let projects = adminProjects;
    if (search) {
        projects = projects.filter(p =>
            p.name.toLowerCase().includes(search) ||
            p.owner_name.toLowerCase().includes(search)
        );
    }

    if (projects.length === 0) {
        body.innerHTML = '';
        if (empty) empty.classList.remove('d-none');
        return;
    }
    if (empty) empty.classList.add('d-none');

    body.innerHTML = projects.map(p => {
        const created = p.created_at ? new Date(p.created_at).toLocaleDateString() : '—';
        return `
        <tr>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.owner_name)} <span class="admin-email">(${escapeHtml(p.owner_email)})</span></td>
            <td>
                <button class="admin-feature-btn ${p.is_featured ? 'active' : ''}" onclick="adminToggleFeatured(${p.id}, ${!p.is_featured})">
                    ${p.is_featured ? 'Featured' : 'Not featured'}
                </button>
            </td>
            <td class="admin-date">${created}</td>
            <td class="admin-row-actions">
                <button class="admin-edit-btn" onclick="openAdminEdit(${p.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="admin-delete-btn" onclick="adminDeleteProject(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function openAdminEdit(id) {
    const p = adminProjects.find(p => p.id === id);
    if (!p) return;
    document.getElementById('admin-edit-id').value = p.id;
    document.getElementById('admin-edit-name').value = p.name;
    document.getElementById('admin-edit-desc').value = p.description;
    document.getElementById('admin-edit-techs').value = p.technologies;
    document.getElementById('admin-edit-github').value = p.github_link || '';
    document.getElementById('admin-edit-image').value = p.image_url || '';
    new bootstrap.Modal(document.getElementById('adminEditModal')).show();
}

async function adminToggleFeatured(id, isFeatured) {
    const user = getCurrentUser();
    const res = await fetch(`/api/admin/projects/${id}/feature`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, isFeatured })
    });
    const result = await res.json();
    if (result.success) { showToast('Updated'); await loadAdminProjects(); }
    else { showToast(result.error || 'Could not update', 'error'); }
}

async function adminDeleteProject(id) {
    if (!confirm('Delete this project permanently?')) return;
    const user = getCurrentUser();
    const res = await fetch(`/api/admin/projects/${id}?adminId=${user.id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) { showToast('Project deleted'); await loadAdminProjects(); }
    else { showToast(result.error || 'Could not delete', 'error'); }
}

/* ═══════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const isDashboard = document.body.classList.contains('dashboard-body');
    const isRegister = document.body.classList.contains('register-body');
    const isLogin = document.body.classList.contains('login-body');
    const isExplore = document.getElementById('explore-grid');
    const isAdmin = document.getElementById('admin-projects-body');

    if (isAdmin) {
        initAdminPage();
    } else if (isExplore) {
        initExplorePage();
    } else if (isDashboard) {
        initDashboardPage();
    } else if (isRegister) {
        initRegisterPage();
    } else if (isLogin) {
        initLoginPage();
    } else {
        initIndexPage();
    }
});
const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const profileName = document.getElementById('profile-name');
const tokenPreview = document.getElementById('token-preview');
const lastSync = document.getElementById('last-sync');
const visitCount = document.getElementById('visit-count');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');
const pageCount = document.getElementById('count-page');
const truthCount = document.getElementById('count-truth');
const totalCount = document.getElementById('count-total');
const pageList = document.getElementById('page-list');
const truthList = document.getElementById('truth-list');
const themeToggle = document.getElementById('theme-toggle');
const editorForm = document.getElementById('editor-form');
const editorStatus = document.getElementById('editor-status');
const postDir = document.getElementById('post-dir');
const postFile = document.getElementById('post-file');
const postTitle = document.getElementById('post-title');
const postDate = document.getElementById('post-date');
const postCategory = document.getElementById('post-category');
const postTags = document.getElementById('post-tags');
const postDescription = document.getElementById('post-description');
const postImage = document.getElementById('post-image');
const postContent = document.getElementById('post-content');
const createBtn = document.getElementById('create-btn');
const updateBtn = document.getElementById('update-btn');
const deleteBtn = document.getElementById('delete-btn');
const clearBtn = document.getElementById('clear-btn');
const postUpload = document.getElementById('post-upload');
const announcementList = document.getElementById('announcement-list');
const announcementInput = document.getElementById('announcement-content');
const addAnnouncementBtn = document.getElementById('add-announcement-btn');
const timeInputsContainer = document.getElementById('time-inputs');
const announcementTypeRadios = document.querySelectorAll('input[name="announcement-type"]');

// 监听单选框变化
announcementTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        updateTimeInputs(e.target.value);
    });
});

function updateTimeInputs(type) {
    timeInputsContainer.innerHTML = '';
    timeInputsContainer.style.display = 'none';

    if (type === 'scheduled') {
        timeInputsContainer.style.display = 'flex';
        timeInputsContainer.innerHTML = `
            <input type="datetime-local" id="publish-at" title="发布时间" style="width: auto;">
        `;
    } else if (type === 'interval') {
        timeInputsContainer.style.display = 'flex';
        timeInputsContainer.innerHTML = `
            <input type="datetime-local" id="publish-at" title="开始时间" style="width: auto;">
            <span style="display:flex;align-items:center;color:var(--text-secondary)">至</span>
            <input type="datetime-local" id="expire-at" title="结束时间" style="width: auto;">
        `;
    }
}

const state = {
    token: localStorage.getItem('admin_token') || '',
    editing: null
};

let refreshTimer = null;
let dashboardLoading = false;
const defaultTimeout = 12000;

async function fetchWithTimeout(url, options = {}, timeout = defaultTimeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    
    // 初始化 meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', currentTheme === 'dark' ? '#1a1625' : '#f0f4f8');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const targetTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', targetTheme);
            localStorage.setItem('theme', targetTheme);
            updateThemeIcon(targetTheme);
            
            // 更新 meta theme-color
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', targetTheme === 'dark' ? '#1a1625' : '#f0f4f8');
            }
        });
    }
}

function setStatus(message, type = '') {
    loginStatus.textContent = message;
    loginStatus.className = `admin-status ${type}`.trim();
}

function setEditorStatus(message, type = '') {
    editorStatus.textContent = message;
    editorStatus.className = `admin-status ${type}`.trim();
}

function updateTokenDisplay() {
    if (state.token) {
        tokenPreview.textContent = `${state.token.slice(0, 8)}...${state.token.slice(-6)}`;
    } else {
        tokenPreview.textContent = '无';
    }
}

function updateLastSync() {
    const now = new Date();
    lastSync.textContent = now.toLocaleString('zh-CN');
}

async function requestProfile() {
    if (!state.token) {
        profileName.textContent = '未登录';
        return false;
    }
    const response = await fetchWithTimeout('/api/profile', {
        headers: { Authorization: `Bearer ${state.token}` }
    });
    if (!response.ok) {
        profileName.textContent = '未登录';
        return false;
    }
    const data = await response.json();
    profileName.textContent = data.username || 'admin';
    return true;
}

function formatTags(tags) {
    if (!tags || tags.length === 0) return '';
    return tags.map(tag => `<span class="admin-tag">${tag}</span>`).join('');
}

function createItem(post, withActions = false) {
    const title = post.meta?.title || post.fileName || '未命名内容';
    const date = post.meta?.date || post.meta?.published || '未知日期';
    const excerpt = post.excerpt || '暂无摘要';
    const tags = formatTags(post.meta?.tags || []);
    const encodedFile = encodeURIComponent(post.fileName || '');
    const directory = post.directory || 'Page';
    const actions = withActions
        ? `
            <div class="admin-item-actions">
                <button data-action="edit" data-file="${encodedFile}" data-dir="${directory}">编辑</button>
                <button data-action="delete" data-file="${encodedFile}" data-dir="${directory}">删除</button>
            </div>
        `
        : '';
    return `
        <div class="admin-item">
            <h4>${title}</h4>
            <p>${excerpt}</p>
            <div class="admin-tags">
                <span class="admin-tag">${date}</span>
                ${tags}
            </div>
            ${actions}
        </div>
    `;
}

function renderList(container, posts, withActions = false) {
    if (!posts.length) {
        container.innerHTML = '<div class="admin-empty">暂无内容</div>';
        return;
    }
    container.innerHTML = posts.map(post => createItem(post, withActions)).join('');
}

async function loadPosts() {
    const [pageRes, truthRes] = await Promise.all([
        fetchWithTimeout('/api/posts?dir=Page&lite=1'),
        fetchWithTimeout('/api/posts?dir=Truth&lite=1')
    ]);

    const pagePosts = pageRes.ok ? await pageRes.json() : [];
    const truthPosts = truthRes.ok ? await truthRes.json() : [];

    pageCount.textContent = pagePosts.length;
    truthCount.textContent = truthPosts.length;
    totalCount.textContent = pagePosts.length + truthPosts.length;

    renderList(pageList, pagePosts, true);
    renderList(truthList, truthPosts, true);

    updateLastSync();
}

function renderStats(data) {
    visitCount.textContent = data.totalVisits ?? 0;
}

async function loadStats() {
    if (!state.token) return;
    const response = await fetchWithTimeout('/api/stats', {
        headers: { Authorization: `Bearer ${state.token}` }
    });
    if (!response.ok) return;
    const data = await response.json();
    renderStats(data);
}

async function loadDashboard() {
    if (dashboardLoading) return;
    dashboardLoading = true;
    try {
        await Promise.all([loadPosts(), loadStats(), loadAnnouncements()]);
    } finally {
        dashboardLoading = false;
    }
}

async function loadAnnouncements() {
    if (!state.token) return;
    const response = await fetchWithTimeout('/api/announcements', {
        headers: { Authorization: `Bearer ${state.token}` }
    });
    if (!response.ok) return;
    const list = await response.json();
    
    if (!list.length) {
        announcementList.innerHTML = '<div class="admin-empty">暂无公告</div>';
        return;
    }
    
    announcementList.innerHTML = list.map(item => {
        const publishTime = item.publishAt || item.createdAt;
        const expireTime = item.expireAt;
        const isFuture = publishTime > Date.now();
        const isExpired = expireTime && expireTime < Date.now();
        
        let statusLabel = '';
        if (isExpired) {
            statusLabel = `<span style="color: var(--text-secondary); text-decoration: line-through;">[已过期] ${new Date(expireTime).toLocaleString('zh-CN')} 结束</span>`;
        } else if (isFuture) {
             statusLabel = `<span style="color: var(--accent-color); font-weight: bold;">[定时] ${new Date(publishTime).toLocaleString('zh-CN')} 发布</span>`;
        } else {
             statusLabel = `<span style="color: var(--text-secondary);">${new Date(publishTime).toLocaleString('zh-CN')}</span>`;
        }
        
        if (expireTime && !isExpired) {
            statusLabel += ` <span style="font-size: 11px; color: var(--text-secondary);"> (至 ${new Date(expireTime).toLocaleString('zh-CN')})</span>`;
        }

        return `
        <div class="admin-item" style="display: flex; justify-content: space-between; align-items: center; opacity: ${isExpired ? '0.6' : '1'};">
            <div style="flex: 1; margin-right: 16px;">
                <p style="margin: 0; color: var(--text-primary); font-size: 14px; white-space: pre-wrap;">${item.content}</p>
                <div style="font-size: 12px; margin-top: 4px;">${statusLabel}</div>
            </div>
            <button class="admin-btn danger" style="padding: 4px 12px; font-size: 12px; flex-shrink: 0;" onclick="deleteAnnouncement('${item.id}')">删除</button>
        </div>
    `}).join('');
}

async function handleAddAnnouncement() {
    const content = announcementInput.value.trim();
    const type = document.querySelector('input[name="announcement-type"]:checked').value;
    
    let publishAt = null;
    let expireAt = null;
    
    if (type === 'scheduled') {
        const dateInput = document.getElementById('publish-at');
        if (dateInput && dateInput.value) {
            publishAt = dateInput.value;
        }
    } else if (type === 'interval') {
        const startInput = document.getElementById('publish-at');
        const endInput = document.getElementById('expire-at');
        if (startInput && startInput.value) publishAt = startInput.value;
        if (endInput && endInput.value) expireAt = endInput.value;
    }
    
    if (!content) return;
    
    if (!ensureAuth()) return;
    
    addAnnouncementBtn.disabled = true;
    addAnnouncementBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const response = await fetchWithTimeout('/api/announcements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${state.token}`
            },
            body: JSON.stringify({ content, publishAt, expireAt })
        });
        
        if (response.ok) {
            announcementInput.value = '';
            // 重置表单状态
            document.querySelector('input[name="announcement-type"][value="permanent"]').checked = true;
            updateTimeInputs('permanent');
            
            await loadAnnouncements();
        } else {
            alert('发布失败');
        }
    } catch (e) {
        console.error(e);
        alert('发布失败');
    } finally {
        addAnnouncementBtn.disabled = false;
        addAnnouncementBtn.innerHTML = '<i class="fas fa-plus"></i> 发布';
    }
}

window.deleteAnnouncement = async function(id) {
    if (!confirm('确认删除该公告吗？')) return;
    if (!ensureAuth()) return;
    
    try {
        const response = await fetchWithTimeout(`/api/announcements/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${state.token}` }
        });
        
        if (response.ok) {
            await loadAnnouncements();
        } else {
            alert('删除失败');
        }
    } catch (e) {
        console.error(e);
        alert('删除失败');
    }
};

addAnnouncementBtn.addEventListener('click', handleAddAnnouncement);

function startAutoRefresh() {
    stopAutoRefresh();
    loadDashboard().catch(() => {});
    refreshTimer = setInterval(() => {
        loadDashboard().catch(() => {});
    }, 20000);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    setStatus('正在登录...');
    const response = await fetchWithTimeout('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        setStatus('登录失败，请检查账号或密码', 'error');
        return;
    }

    const data = await response.json();
    state.token = data.token || '';
    localStorage.setItem('admin_token', state.token);
    updateTokenDisplay();
    const authed = await requestProfile();
    if (authed) {
        setAuthView(true);
        startAutoRefresh();
    }
    setStatus('登录成功', 'success');
}

async function handleLogout() {
    stopAutoRefresh();
    if (state.token) {
        await fetchWithTimeout('/api/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${state.token}` }
        });
    }
    state.token = '';
    localStorage.removeItem('admin_token');
    updateTokenDisplay();
    profileName.textContent = '未登录';
    resetEditor();
    renderStats({ totalVisits: 0, uniqueIps: 0, recentIps: [] });
    setAuthView(false);
    setStatus('已退出登录');
}

function normalizeFileName(value) {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.toLowerCase().endsWith('.md')) return trimmed;
    return `${trimmed}.md`;
}

function splitTags(value) {
    return value
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
}

function collectMeta() {
    const meta = {};
    const title = postTitle.value.trim();
    const published = postDate.value.trim();
    const description = postDescription.value.trim();
    const tags = splitTags(postTags.value);
    const category = postCategory.value.trim();
    const image = postImage.value.trim();

    if (title) meta.title = title;
    if (published) meta.published = published;
    if (description) meta.description = description;
    if (tags.length) meta.tags = tags;
    if (category) meta.category = category;
    if (image) meta.image = image;

    return meta;
}

function resetEditor() {
    postDir.value = 'Page';
    postFile.value = '';
    postTitle.value = '';
    postDate.value = '';
    postCategory.value = '';
    postTags.value = '';
    postDescription.value = '';
    postImage.value = '';
    postContent.value = '';
    postUpload.value = '';
    state.editing = null;
    setEditorStatus('');
}

function parseFrontMatter(content) {
    const frontMatterRegex = /^[\s\n]*---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (!match) {
        return { meta: {}, content };
    }

    const yamlStr = match[1];
    const markdownBody = match[2];
    const meta = {};

    yamlStr.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim();
            let value = line.slice(colonIndex + 1).trim();
            
            // Handle quotes
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            
            // Handle arrays [tag1, tag2]
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(item => item.trim()).filter(Boolean);
            }
            
            meta[key] = value;
        }
    });

    return { meta, content: markdownBody };
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });

        const { meta, content } = parseFrontMatter(text);

        // Auto-fill fields
        postFile.value = file.name;
        postTitle.value = meta.title || file.name.replace(/\.md$/i, '');
        postDate.value = meta.date || meta.published || new Date().toISOString().split('T')[0];
        postCategory.value = meta.category || '';
        postTags.value = Array.isArray(meta.tags) ? meta.tags.join(', ') : (meta.tags || '');
        postDescription.value = meta.description || '';
        postImage.value = meta.image || '';
        postContent.value = content ? content.trim() : '';

        setEditorStatus(`已加载文件: ${file.name}`, 'success');
    } catch (e) {
        console.error(e);
        setEditorStatus('读取文件失败', 'error');
    }
}

postUpload.addEventListener('change', handleFileUpload);

function ensureAuth() {
    if (!state.token) {
        setEditorStatus('请先登录后再执行管理操作', 'error');
        return false;
    }
    return true;
}

async function handleCreate(event) {
    event.preventDefault();
    if (!ensureAuth()) return;
    const directory = postDir.value;
    const fileName = normalizeFileName(postFile.value);
    const content = postContent.value;
    if (!content.trim()) {
        setEditorStatus('正文内容不能为空', 'error');
        return;
    }
    setEditorStatus('正在创建...');
    const response = await fetchWithTimeout('/api/posts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify({
            directory,
            fileName: fileName || undefined,
            meta: collectMeta(),
            content
        })
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setEditorStatus(data.error || '创建失败', 'error');
        return;
    }
    resetEditor();
    await loadPosts();
    setEditorStatus('创建成功', 'success');
}

async function handleUpdate() {
    if (!ensureAuth()) return;
    const directory = postDir.value;
    const fileName = normalizeFileName(postFile.value);
    const content = postContent.value;
    const target = state.editing?.fileName || fileName;
    const targetDir = state.editing?.directory || directory;
    if (!target) {
        setEditorStatus('请选择要编辑的文章', 'error');
        return;
    }
    if (state.editing && directory !== targetDir) {
        setEditorStatus('编辑时不可切换栏目', 'error');
        return;
    }
    if (!content.trim()) {
        setEditorStatus('正文内容不能为空', 'error');
        return;
    }
    setEditorStatus('正在保存...');
    const response = await fetchWithTimeout(`/api/posts/${encodeURIComponent(target)}?dir=${encodeURIComponent(targetDir)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify({
            newFileName: fileName || target,
            meta: collectMeta(),
            content
        })
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setEditorStatus(data.error || '编辑失败', 'error');
        return;
    }
    resetEditor();
    await loadPosts();
    setEditorStatus('编辑成功', 'success');
}

async function handleDelete() {
    if (!ensureAuth()) return;
    const directory = postDir.value;
    const fileName = normalizeFileName(postFile.value);
    const target = state.editing?.fileName || fileName;
    const targetDir = state.editing?.directory || directory;
    if (!target) {
        setEditorStatus('请选择要删除的文章', 'error');
        return;
    }
    if (!window.confirm(`确认删除 ${target} 吗？`)) {
        return;
    }
    setEditorStatus('正在删除...');
    const response = await fetchWithTimeout(`/api/posts/${encodeURIComponent(target)}?dir=${encodeURIComponent(targetDir)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${state.token}` }
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setEditorStatus(data.error || '删除失败', 'error');
        return;
    }
    resetEditor();
    await loadPosts();
    setEditorStatus('删除成功', 'success');
}

async function loadPostIntoEditor(fileName, directory) {
    const response = await fetchWithTimeout(`/api/posts/${encodeURIComponent(fileName)}?dir=${encodeURIComponent(directory)}`);
    if (!response.ok) {
        setEditorStatus('加载文章失败', 'error');
        return;
    }
    const post = await response.json();
    postDir.value = directory;
    postFile.value = post.fileName || '';
    postTitle.value = post.meta?.title || '';
    postDate.value = post.meta?.published || post.meta?.date || '';
    postCategory.value = post.meta?.category || '';
    postTags.value = (post.meta?.tags || []).join(', ');
    postDescription.value = post.meta?.description || '';
    postImage.value = post.meta?.image || '';
    postContent.value = post.raw || '';
    state.editing = { fileName: post.fileName, directory };
    setEditorStatus(`已载入 ${post.fileName}`, 'success');
}

function handleListAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const fileName = decodeURIComponent(button.dataset.file || '');
    const directory = button.dataset.dir || 'Page';
    if (!fileName) return;
    if (action === 'edit') {
        loadPostIntoEditor(fileName, directory);
    }
    if (action === 'delete') {
        postDir.value = directory;
        postFile.value = fileName;
        state.editing = { fileName, directory };
        handleDelete();
    }
}

function setAuthView(authed) {
    if (authed) {
        loginView.classList.add('hidden');
        adminView.classList.remove('hidden');
        return;
    }
    adminView.classList.add('hidden');
    loginView.classList.remove('hidden');
}

function initHeaderFloat() {
    const header = document.querySelector('.header');
    if (!header) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                if (scrollY > 50) {
                    header.classList.add('floating');
                } else {
                    header.classList.remove('floating');
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}


async function init() {
    initTheme();
    initHeaderFloat();
    updateTokenDisplay();
    const authed = await requestProfile();
    setAuthView(authed);
    if (authed) {
        startAutoRefresh();
        setStatus('登录状态已恢复');
    } else {
        setStatus('');
    }
}

loginForm.addEventListener('submit', handleLogin);
refreshBtn.addEventListener('click', loadDashboard);
logoutBtn.addEventListener('click', handleLogout);
editorForm.addEventListener('submit', handleCreate);
updateBtn.addEventListener('click', handleUpdate);
deleteBtn.addEventListener('click', handleDelete);
clearBtn.addEventListener('click', resetEditor);
pageList.addEventListener('click', handleListAction);
truthList.addEventListener('click', handleListAction);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
        return;
    }
    if (state.token) {
        startAutoRefresh();
    }
});
init();

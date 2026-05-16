async function api(url, options = {}) {
    const isFormData = options.body instanceof FormData;

    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers || {})
        },
        ...options
    });

    const raw = await response.text();
    let data = {};

    try {
        data = raw ? JSON.parse(raw) : {};
    } catch {
        data = { message: raw || 'Resposta inválida do servidor.' };
    }

    if (response.status === 401) {
        if (window.location.pathname !== '/admin') {
            window.location.href = '/admin';
        }
        throw new Error(data.message || 'Sessão expirada.');
    }

    if (!response.ok) {
        const error = new Error(data.message || 'Erro ao processar a requisição.');
        error.statusCode = response.status;
        error.details = data.details;
        error.data = data;
        throw error;
    }

    return data;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR');
}

function showAlert(elementId, type, message) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.className = `alert show ${type === 'success' ? 'alert-success' : 'alert-error'}`;
    el.textContent = message;
}

function clearAlert(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.className = 'alert';
    el.textContent = '';
}

function isImageFile(name) {
    return /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(name);
}

function getCurrentAdminPathKey() {
    const path = window.location.pathname;
    if (path === '/admin/dashboard') return 'dashboard';
    if (path === '/admin/applications-ui') return 'applications';
    if (path === '/admin/history-ui') return 'history';
    if (path === '/admin/storage') return 'storage';
    if (path === '/admin/diagnostics-ui') return 'diagnostics';
    return '';
}

function activateSidebarLink() {
    const current = getCurrentAdminPathKey();
    document.querySelectorAll('[data-nav]').forEach((el) => {
        el.classList.toggle('active', el.dataset.nav === current);
    });
}

async function ensureAuthenticated() {
    try {
        await api('/admin/applications');
    } catch (error) {
        window.location.href = '/admin';
    }
}

async function logout() {
    try {
        await api('/admin/logout', { method: 'POST' });
    } finally {
        window.location.href = '/admin';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const isLoginPage = window.location.pathname === '/admin';

    if (!isLoginPage) {
        await ensureAuthenticated();
        activateSidebarLink();

        document.querySelectorAll('[data-action="logout"]').forEach((button) => {
            button.addEventListener('click', logout);
        });
    }
});
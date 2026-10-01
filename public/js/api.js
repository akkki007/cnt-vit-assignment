/* Thin fetch wrapper around the REST API + auth/session helpers used across all pages. */
const API_BASE = '/api';

const Auth = {
  getToken() { return localStorage.getItem('vph_token'); },
  getUser() {
    try { return JSON.parse(localStorage.getItem('vph_user') || 'null'); }
    catch (e) { return null; }
  },
  setSession(token, user) {
    localStorage.setItem('vph_token', token);
    localStorage.setItem('vph_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('vph_token');
    localStorage.removeItem('vph_user');
  },
  isLoggedIn() { return !!this.getToken(); },
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  },
  requireRole(role) {
    if (!this.requireAuth()) return false;
    const user = this.getUser();
    if (!user) {
      this.clearSession();
      window.location.href = '/login.html';
      return false;
    }
    if (user.role !== role) {
      window.location.href = user.role === 'teacher' ? '/teacher-dashboard.html' : '/student-dashboard.html';
      return false;
    }
    return true;
  },
  logout() {
    this.clearSession();
    window.location.href = '/login.html';
  },
};

async function apiRequest(method, endpoint, data, isFormData = false) {
  const headers = {};
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData && data !== undefined) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (data !== undefined) opts.body = isFormData ? data : JSON.stringify(data);

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, opts);
  } catch (err) {
    throw new Error('Network error. Please check your connection and that the server is running.');
  }

  let body = {};
  try { body = await res.json(); } catch (e) { /* no body */ }

  if (res.status === 401 && token) {
    Auth.clearSession();
    window.location.href = '/login.html';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    throw new Error(body.message || `Request failed (${res.status})`);
  }

  return body;
}

const Api = {
  get: (endpoint) => apiRequest('GET', endpoint),
  post: (endpoint, data, isFormData = false) => apiRequest('POST', endpoint, data, isFormData),
  put: (endpoint, data, isFormData = false) => apiRequest('PUT', endpoint, data, isFormData),
  delete: (endpoint) => apiRequest('DELETE', endpoint),
};

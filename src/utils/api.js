const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    if (access) {
      localStorage.setItem('access_token', access);
    } else {
      localStorage.removeItem('access_token');
    }

    if (refresh !== undefined) {
      this.refreshToken = refresh;
      if (refresh) {
        localStorage.setItem('refresh_token', refresh);
      } else {
        localStorage.removeItem('refresh_token');
      }
    }
  }

  async refresh() {
    if (!this.refreshToken) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        this.setTokens(data.access);
        return data.access;
      }
    } catch (e) {
      console.error('Failed to refresh token', e);
    }
    this.setTokens(null, null);
    return null;
  }

  async request(path, options = {}) {
    let url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    options.headers = options.headers || {};

    if (!(options.body instanceof FormData)) {
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }

    if (this.accessToken) {
      options.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, options);

    if (response.status === 401 && this.refreshToken) {
      const newAccess = await this.refresh();
      if (newAccess) {
        options.headers['Authorization'] = `Bearer ${newAccess}`;
        response = await fetch(url, options);
      }
    }

    return response;
  }

  async get(path) {
    const res = await this.request(path, { method: 'GET' });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.statusText}`);
    return res.json();
  }

  async post(path, body) {
    const isFormData = body instanceof FormData;
    const res = await this.request(path, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || `POST ${path} failed: ${res.statusText}`);
    }
    return res.json();
  }

  async delete(path) {
    const res = await this.request(path, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.statusText}`);
    return res.json();
  }
}

export const api = new ApiClient();
export { BASE_URL };

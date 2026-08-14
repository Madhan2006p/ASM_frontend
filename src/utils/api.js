const rawBase = (typeof import.meta !== 'undefined' && import.meta.env)
  ? (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8001')
  : 'http://localhost:8001';
const BASE_URL = rawBase.replace(/\/api\/?$/, '');

class ApiClient {
  constructor() {
    this.accessToken = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    this.refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    this.isRefreshing = false;
    this.failedQueue = [];
    this.onSessionExpired = null;

    // Service Layer Modules
    this.auth = {
      login: (credentials) => this.post('/api/auth/login/', credentials),
      logout: () => this.logout(),
      profile: () => this.get('/api/auth/profile/'),
      refresh: (token) => this.post('/api/auth/token/refresh/', { refresh: token }),
    };

    this.domains = {
      list: () => this.get('/api/attacksurface/domains/'),
      add: (domainData) => this.post('/api/attacksurface/domains/', typeof domainData === 'string' ? { domain: domainData } : domainData),
      quickScan: (domain) => this.post('/api/attacksurface/domains/quick-scan/', { domain }),
    };

    this.scans = {
      list: () => this.get('/api/attacksurface/scans/'),
      trigger: (target) => this.post('/api/attacksurface/scan/', { target }),
      adminTrigger: (target, orgId, userId) => this.post('/api/attacksurface/admin-scan/', { target, org_id: orgId, user_id: userId }),
      status: (scanId) => this.get(`/api/attacksurface/scan/${scanId}/`),
      history: () => this.get('/api/attacksurface/scan-history/'),
      report: (scanId) => this.get(`/api/attacksurface/scan/${scanId}/report/`),
      nucleiState: (scanId) => this.get(`/api/attacksurface/scan/${scanId}/nuclei-state/`),
    };

    this.dashboard = {
      executiveSummary: (domain = '') => this.get(`/api/attacksurface/executive-dashboard/?domain=${encodeURIComponent(domain)}`),
    };

    this.subdomains = {
      list: (scanId) => this.get(`/api/attacksurface/subdomains/${scanId ? `?scan=${scanId}` : ''}`),
    };

    this.endpoints = {
      list: (scanId) => this.get(`/api/attacksurface/endpoints/${scanId ? `?scan=${scanId}` : ''}`),
    };

    this.ports = {
      list: (scanId) => this.get(`/api/attacksurface/open-ports/${scanId ? `?scan=${scanId}` : ''}`),
    };

    this.directories = {
      list: (scanId, params = {}) => {
        const q = new URLSearchParams({ scan: scanId || '', ...params }).toString();
        return this.get(`/api/attacksurface/directories/?${q}`);
      },
    };

    this.technologies = {
      list: (scanId) => this.get(`/api/attacksurface/technologies/${scanId ? `?scan=${scanId}` : ''}`),
    };

    this.vulnerabilities = {
      list: (scanId) => this.get(`/api/attacksurface/vulnerabilities/${scanId ? `?scan=${scanId}` : ''}`),
    };

    this.ssl = {
      list: (scanId) => this.get(`/api/attacksurface/ssl-certificates/${scanId ? `?scan=${scanId}` : ''}`),
    };

    this.emailSecurity = {
      list: (scanId) => this.get(`/api/attacksurface/email-security/${scanId ? `?scan=${scanId}` : ''}`),
    };

    this.risk = {
      correlation: (domain = '') => this.get(`/api/attacksurface/risk-correlation/${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`),
    };

    this.recommendations = {
      list: (domain = '') => this.get(`/api/attacksurface/recommendations/${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`),
    };

    this.incidentReports = {
      list: (domain = '') => this.get(`/api/attacksurface/incident-reports/${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`),
      detail: (scanId) => this.get(`/api/attacksurface/incident-reports/${scanId}/`),
      downloadPdfUrl: (scanId) => `${this.baseURL}/api/attacksurface/incident-reports/${scanId}/download-pdf/`,
    };
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    if (typeof localStorage !== 'undefined') {
      if (access) {
        localStorage.setItem('access_token', access);
      } else {
        localStorage.removeItem('access_token');
      }
    }

    if (refresh !== undefined) {
      this.refreshToken = refresh;
      if (typeof localStorage !== 'undefined') {
        if (refresh) {
          localStorage.setItem('refresh_token', refresh);
        } else {
          localStorage.removeItem('refresh_token');
        }
      }
    }
  }

  processQueue(error, token = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
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
        const newAccess = data.access;
        const newRefresh = data.refresh || this.refreshToken;
        this.setTokens(newAccess, newRefresh);
        return newAccess;
      }
    } catch (e) {
      // Ignore network failures during token refresh
    }
    this.setTokens(null, null);
    return null;
  }

  async logout() {
    const refresh = this.refreshToken;
    const access = this.accessToken;
    if (refresh && access) {
      try {
        await fetch(`${BASE_URL}/api/auth/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access}`,
          },
          body: JSON.stringify({ refresh }),
        });
      } catch (e) {
        // Proceed with client cleanup if backend logout call fails
      }
    }
    this.setTokens(null, null);
  }

  async request(path, options = {}) {
    let url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    options.headers = {
      'ngrok-skip-browser-warning': 'true',
      ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }

    if (this.accessToken) {
      options.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, options);

    const isAuthRoute = path.includes('/auth/login/') || path.includes('/auth/token/refresh/') || path.includes('/auth/logout/');

    if (response.status === 401 && !isAuthRoute && !options._retry && this.refreshToken) {
      options._retry = true;

      if (this.isRefreshing) {
        try {
          const newToken = await new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          });
          options.headers['Authorization'] = `Bearer ${newToken}`;
          return await fetch(url, options);
        } catch (err) {
          return response;
        }
      }

      this.isRefreshing = true;

      try {
        const newAccess = await this.refresh();
        if (newAccess) {
          this.processQueue(null, newAccess);
          options.headers['Authorization'] = `Bearer ${newAccess}`;
          response = await fetch(url, options);
        } else {
          const error = new Error('Session expired');
          this.processQueue(error, null);
          if (typeof this.onSessionExpired === 'function') {
            this.onSessionExpired();
          }
        }
      } finally {
        this.isRefreshing = false;
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

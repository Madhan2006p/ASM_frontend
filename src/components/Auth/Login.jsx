import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle,
  ArrowRight, Fingerprint, KeyRound
} from 'lucide-react';
import './Auth.css';
import { api } from '../../utils/api';

const Login = ({ onLogin, onNavigate }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Restore a remembered email so returning users don't retype it
  useEffect(() => {
    const saved = localStorage.getItem('asm_remembered_email');
    if (saved) {
      setFormData((f) => ({ ...f, email: saved }));
      setRememberMe(true);
    }
  }, []);

  const validate = (name, value) => {
    if (name === 'email') {
      if (!value.trim()) return 'Email or username is required';
    }
    if (name === 'password' && !value) return 'Password is required';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: validate(name, value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    let isValid = true;
    Object.keys(formData).forEach(key => {
      const error = validate(key, formData[key]);
      if (error) { newErrors[key] = error; isValid = false; }
    });
    setErrors(newErrors);
    if (!isValid) return;

    try {
      setApiError('');
      setLoading(true);

      if (rememberMe) {
        localStorage.setItem('asm_remembered_email', formData.email.trim());
      } else {
        localStorage.removeItem('asm_remembered_email');
      }

      const res = await api.post('/api/auth/login/', {
        email: formData.email,
        password: formData.password
      });
      if (res.tokens) {
        api.setTokens(res.tokens.access, res.tokens.refresh);
        onLogin(res.user);
      } else {
        setApiError('Authentication failed: Missing security token.');
        setLoading(false);
      }
    } catch (err) {
      const errorMsg = err.message === 'Failed to fetch'
        ? 'Unable to connect to backend server. Please verify the backend service is running on port 8001.'
        : (err.message || 'Invalid credentials provided');
      setApiError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Ambient background layers */}
      <div className="login-aurora" aria-hidden="true">
        <span className="aurora-blob blob-1" />
        <span className="aurora-blob blob-2" />
        <span className="aurora-blob blob-3" />
      </div>
      <div className="login-grid-overlay" aria-hidden="true" />

      <div className="login-shell">
        {/* Brand showcase — full-height cinematic hero */}
        <aside className="brand-panel">
          <div className="hero-bg" aria-hidden="true">              <img
              src="/login/hero-alternative.png"
              alt=""
              className="hero-img"
              fetchPriority="high"
            />
          </div>
          <div className="hero-overlay" aria-hidden="true" />
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-vignette" aria-hidden="true" />

          <div className="hero-content">
            <div className="hero-brand">
              <div className="brand-mark">
                <ShieldCheck size={22} strokeWidth={2.2} />
              </div>
              <div className="brand-wordmark">
                <span className="brand-name">ASM</span>
                <span className="brand-sub">Attack Surface Management</span>
              </div>
            </div>

            <div className="hero-text">
              <h1 className="hero-title">
                See Your Attack Surface.
                <br />
                <span className="hero-title-accent">Secure What Matters.</span>
              </h1>
              <p className="hero-subtitle">
                Continuously discover, monitor, and protect every asset across
                your digital environment.
              </p>
            </div>

            <div className="hero-status">
              <span className="hero-status-dot" />
              <span>Continuous Attack Surface Monitoring</span>
            </div>
          </div>
        </aside>

        {/* Sign-in panel */}
        <main className="form-panel">
          <div className="login-card fade-in-up">
            <div className="lc-kicker"><Fingerprint size={13} /> SECURE ACCESS</div>
            <h2 className="lc-title">Welcome back</h2>
            <p className="lc-subtitle">Sign in to your command center to continue.</p>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {successMsg && (
                <div className="auth-alert success">
                  <CheckCircle2 size={16} /> <span>{successMsg}</span>
                </div>
              )}
              {apiError && (
                <div className="auth-alert error">
                  <AlertCircle size={16} /> <span>{apiError}</span>
                </div>
              )}

              <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                <label htmlFor="login-email">Email or username</label>
                <div className="input-wrap">
                  <Mail size={16} className="input-icon" />
                  <input
                    id="login-email"
                    type="text"
                    name="email"
                    placeholder="you@company.com or username"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="username"
                  />
                </div>
                {errors.email && <span className="error-msg">{errors.email}</span>}
              </div>

              <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
                <label htmlFor="login-password">Password</label>
                <div className="input-wrap">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span className="error-msg">{errors.password}</span>}
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkmark" />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="forgot-link"
                  title="Contact your administrator to reset your password"
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={17} className="spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            <div className="lc-footer">
              <p>
                New to ASM?{' '}
                <button type="button" onClick={() => onNavigate && onNavigate('landing')}>
                  Request access
                </button>
              </p>
            </div>

            <div className="lc-trust">
              <KeyRound size={12} /> 256-bit encryption · Your session is protected end-to-end
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;

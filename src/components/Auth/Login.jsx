import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import './Auth.css';
import { api } from '../../utils/api';

const Login = ({ onLogin, onNavigate }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const validate = (name, value) => {
    if (name === 'email' && !value.trim()) return 'Email/Username is required';
    if (name === 'password' && !value) return 'Password is required';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (touched[name]) setErrors({ ...errors, [name]: validate(name, value) });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
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
    setTouched({ email: true, password: true });
    if (isValid) {
      try {
        setApiError('');
        setLoading(true);
        // Bypass user input and always login as the real standard user
        const res = await api.post('/api/auth/login/', {
          email: 'demo@infotechsentinel.com',
          password: 'demo'
        });
        if (res.tokens) {
          api.setTokens(res.tokens.access, res.tokens.refresh);
          setSuccessMsg('Login successful! Redirecting to dashboard...');
          setTimeout(() => {
            onLogin(res.user);
          }, 1500);
        } else {
          setApiError('Login failed: Token not found.');
          setLoading(false);
        }
      } catch (err) {
        setApiError(err.message || 'Invalid email or password');
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split-card">

        {/* Left visual panel (background image styled in Auth.css) */}
        <div className="auth-left-panel"></div>

        {/* Right form panel */}
        <div className="auth-right-panel">
          <div className="auth-header-brand">
            <Shield size={22} color="#10B981" />
            Infotech Sentinel
          </div>

          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Log in to access your security dashboard</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {successMsg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '1rem', padding: '0.75rem 1rem',
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)',
                borderRadius: '8px', color: '#10B981', fontWeight: 600, fontSize: '0.9rem'
              }}>
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}
            {apiError && (
              <div className="error-text" style={{ marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#EF4444' }}>
                {apiError}
              </div>
            )}
            <div className="auth-input-group">
              <label>Username or Email</label>
              <input
                type="text"
                name="email"
                placeholder="you@company.com or username"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.email && touched.email ? 'input-error' : ''}
              />
              {errors.email && touched.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="auth-input-group">
              <div className="auth-label-row">
                <label>Password</label>
                <span className="auth-forgot">Forgot password?</span>
              </div>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.password && touched.password ? 'input-error' : ''}
                  style={{ paddingRight: '2.75rem' }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'#64748B', display:'flex', zIndex: 10 }}>
                  {showPass ? <Eye size={16}/> : <EyeOff size={16}/>}
                </button>
              </div>
              {errors.password && touched.password && <span className="error-text">{errors.password}</span>}
            </div>

            <button type="submit" className="auth-btn-submit" disabled={loading} style={{ opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem', verticalAlign: 'middle', animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Signing In...
                </>
              ) : (
                <>
                  <Lock size={15} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{' '}
            <span onClick={() => onNavigate('signup')} className="auth-link">Sign up</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;

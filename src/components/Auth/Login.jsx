import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, CheckCircle, Mail, ArrowRight, Activity, X } from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validate = (name, value) => {
    if (name === 'email') {
      if (!value.trim()) return 'Email is required';
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) return 'Invalid email address';
    }
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
        const res = await api.post('/api/auth/login/', {
          email: formData.email,
          password: formData.password
        });
        if (res.tokens) {
          api.setTokens(res.tokens.access, res.tokens.refresh);
          setSuccessMsg('Authentication successful. Initializing workspace...');
          setTimeout(() => {
            onLogin(res.user);
          }, 1500);
        } else {
          setApiError('Authentication failed: Missing security token.');
          setLoading(false);
        }
      } catch (err) {
        setApiError(err.message || 'Invalid credentials provided');
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-page-bg">
      <div className={`auth-glass-card ${mounted ? 'fade-in-up' : ''}`}>
        <div className="auth-glass-inner">
          <h1 className="auth-title">Login</h1>

          <form className="auth-form-glass" onSubmit={handleSubmit} noValidate>
            {successMsg && (
              <div className="auth-alert success">
                <CheckCircle size={14} /> <span>{successMsg}</span>
              </div>
            )}
            {apiError && (
              <div className="auth-alert error">
                <Shield size={14} /> <span>{apiError}</span>
              </div>
            )}

            <div className={`glass-input-group ${touched.email && errors.email ? 'has-error' : ''}`}>
              <input
                type="email"
                name="email"
                id="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              <Mail className="input-icon-right" size={16} />
              {touched.email && errors.email && <span className="error-text-glass">{errors.email}</span>}
            </div>

            <div className={`glass-input-group ${touched.password && errors.password ? 'has-error' : ''}`}>
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                id="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              <Lock className="input-icon-right" size={16} onClick={() => setShowPass(!showPass)} style={{cursor: 'pointer'}} />
              {touched.password && errors.password && <span className="error-text-glass">{errors.password}</span>}
            </div>

            <div className="auth-actions-glass">
              <label className="remember-me-glass">
                <input type="checkbox" />
                <span className="checkmark-glass"></span>
                Remember me
              </label>
              <button type="button" className="forgot-pass-glass">Forgot Password?</button>
            </div>

            <button type="submit" className={`btn-login-glass ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="auth-footer-glass">
            <p>Don't have an account? <button className="register-link-glass">Register</button></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

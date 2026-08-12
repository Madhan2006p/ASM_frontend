import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Infinity } from 'lucide-react';
import './Auth.css';
import { api } from '../../utils/api';

const Login = ({ onLogin, onNavigate }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="login-left-content fade-in-up">
          <div className="login-logo">
            <Infinity color="#0EA5E9" size={32} strokeWidth={2.5} />
            <span>ASM Dashboard</span>
          </div>
          
          <h1 className="login-heading">Login Member Area</h1>
          
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {successMsg && (
              <div className="auth-alert success">
                <CheckCircle size={16} /> <span>{successMsg}</span>
              </div>
            )}
            {apiError && (
              <div className="auth-alert error">
                <Shield size={16} /> <span>{apiError}</span>
              </div>
            )}

            <div className="form-group">
              <label>E-mail:</label>
              <input
                type="email"
                name="email"
                placeholder="e.g. John doe@gmail.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
              {errors.email && <span className="error-msg">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              {errors.password && <span className="error-msg">{errors.password}</span>}
              <div className="forgot-password">
                <button type="button">Forgot Password?</button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="login-footer">
            <p>Don't have an Account? <button>Sign Up</button></p>
          </div>
        </div>
      </div>
      
      <div className="login-right">
        {/* Organic wavy divider curve */}
        <svg className="login-wave" viewBox="0 0 100 800" preserveAspectRatio="none">
          <path fill="#020816" d="M100,0 L100,800 L0,800 C60,600 -30,400 80,200 C110,100 40,40 100,0 Z" />
        </svg>
        <img className="login-illustration" src="/login-illustration.jpg" alt="Login Illustration" />
      </div>
    </div>
  );
};

export default Login;

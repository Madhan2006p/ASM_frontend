import React, { useState } from 'react';
import { Shield, Eye, EyeOff, UserPlus, Zap } from 'lucide-react';
import './Auth.css';
import { api } from '../../utils/api';

const SignUp = ({ onLogin, onNavigate }) => {
  const [formData, setFormData] = useState({
    name: '', organization: '', email: '', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPass, setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [apiError, setApiError] = useState('');

  const validate = (name, value, allData = formData) => {
    switch (name) {
      case 'name':
        return !value.trim() ? 'Name is required' : '';
      case 'organization':
        if (!value.trim()) return 'Organization is required';
        if (!/^[A-Za-z\s]+$/.test(value)) return 'Organization can only contain letters and spaces';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) return 'Invalid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/\d/.test(value)) return 'Password must contain at least one numerical digit';
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== allData.password) return 'Passwords do not match';
        return '';
      default: return '';
    }
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'organization') {
      value = value.replace(/[^A-Za-z\s]/g, '');
    }
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validate(name, value, newData) }));
    if (name === 'password' && touched.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: validate('confirmPassword', newData.confirmPassword, newData) }));
    }
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
      const err = validate(key, formData[key]);
      if (err) { newErrors[key] = err; isValid = false; }
    });
    setErrors(newErrors);
    setTouched(Object.keys(formData).reduce((a, k) => ({ ...a, [k]: true }), {}));
    if (isValid) {
      try {
        setApiError('');
        // Map fullName/name to Django User first_name and last_name (or username)
        const nameParts = formData.name.trim().split(/\s+/);
        const username = formData.email.split('@')[0];
        
        const res = await api.post('/api/auth/register/', {
          username: username,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          organization: formData.organization,
          // Custom profile fields
          phone: ''
        });

        if (res.tokens) {
          api.setTokens(res.tokens.access, res.tokens.refresh);
          onLogin(res.user);
        } else {
          setApiError('Registration failed: no tokens returned.');
        }
      } catch (err) {
        setApiError(err.message || 'Registration failed. Try again.');
      }
    }
  };

  const PasswordInput = ({ name, placeholder, show, onToggle }) => (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type={show ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        value={formData[name]}
        onChange={handleChange}
        onBlur={handleBlur}
        className={errors[name] && touched[name] ? 'input-error' : ''}
        style={{ paddingRight: '2.75rem' }}
      />
      <button type="button" onClick={onToggle}
        style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)',
          background:'none', border:'none', cursor:'pointer', color:'#64748B', display:'flex', zIndex: 10 }}>
        {show ? <Eye size={16}/> : <EyeOff size={16}/>}
      </button>
    </div>
  );

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

          <div className="auth-header" style={{ marginBottom: '1.5rem' }}>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Start monitoring your attack surface today</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate style={{ gap: '0.875rem' }}>
            {apiError && (
              <div className="error-text" style={{ marginBottom: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: '#EF4444' }}>
                {apiError}
              </div>
            )}
            <div className="auth-input-group">
              <label>Full Name</label>
              <input type="text" name="name" placeholder="John Doe"
                value={formData.name} onChange={handleChange} onBlur={handleBlur}
                className={errors.name && touched.name ? 'input-error' : ''} />
              {errors.name && touched.name && <span className="error-text">{errors.name}</span>}
            </div>
            <div className="auth-input-group">
              <label>Organization</label>
              <input type="text" name="organization" placeholder="Acme Corp"
                value={formData.organization} onChange={handleChange} onBlur={handleBlur}
                className={errors.organization && touched.organization ? 'input-error' : ''} />
              {errors.organization && touched.organization && <span className="error-text">{errors.organization}</span>}
            </div>

            <div className="auth-input-group">
              <label>Email Address</label>
              <input type="email" name="email" placeholder="you@company.com"
                value={formData.email} onChange={handleChange} onBlur={handleBlur}
                className={errors.email && touched.email ? 'input-error' : ''} />
              {errors.email && touched.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <PasswordInput name="password" placeholder="Strong password"
                show={showPass} onToggle={() => setShowPass(p => !p)} />
              {errors.password && touched.password && <span className="error-text">{errors.password}</span>}
            </div>
            <div className="auth-input-group">
              <label>Confirm Password</label>
              <PasswordInput name="confirmPassword" placeholder="Confirm password"
                show={showConfirm} onToggle={() => setShowConfirm(p => !p)} />
              {errors.confirmPassword && touched.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            <button type="submit" className="auth-btn-submit" style={{ marginTop: '0.25rem' }}>
              <UserPlus size={15} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Create Account
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <span onClick={() => onNavigate('login')} className="auth-link">Sign in</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SignUp;

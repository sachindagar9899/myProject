import React, { useState } from 'react';
import { LogIn, KeyRound, Smartphone, User, CheckCircle2, XCircle, UserPlus, ArrowLeft, RotateCcw } from 'lucide-react';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [step, setStep] = useState(1); // 1: Mobile, 2: OTP, 3: Details

  const [mobile, setMobile] = useState('');
  const [identifier, setIdentifier] = useState(''); // For Login
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validations = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password)
  };
  const isPasswordValid = Object.values(validations).every(Boolean);

  const switchMode = (newMode) => {
    setMode(newMode);
    setStep(1);
    setError('');
    setOtp('');
    setPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your identifier and password');
      return;
    }
    setLoading(true);
    setError('');

    let finalIdentifier = identifier.trim();
    if (/^[6-9]\d{9}$/.test(finalIdentifier)) {
      finalIdentifier = '+91' + finalIdentifier;
    }

    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: finalIdentifier, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onLogin(data.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(mobile)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '+91' + mobile })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert(`[DEV MODE] Since we don't have a paid SMS provider, here is your Mock OTP: ${data.mockOtp}`);
      setOtp(data.mockOtp); // AUTO-FILL
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '+91' + mobile, otp: otp.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (mode === 'signup') {
        if (data.userExists) {
          setError('Account already exists with this number. Please log in.');
          setTimeout(() => switchMode('login'), 2000);
        } else {
          setStep(3);
        }
      } else if (mode === 'forgot') {
        if (!data.userExists) {
          setError('No account found with this number. Please sign up.');
          setTimeout(() => switchMode('signup'), 2000);
        } else {
          setStep(3);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim() || !isPasswordValid) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '+91' + mobile, username: username.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onLogin(data.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '+91' + mobile, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert('Password updated successfully! You can now log in.');
      switchMode('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ValidationItem = ({ label, isValid }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isValid ? 'var(--accent)' : 'var(--text-muted)', marginBottom: '4px' }}>
      {isValid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="auth-container">
      <div className="blob-bg"></div>
      <div className="auth-card">
        <div className="auth-header">
          <h1>NexusChat</h1>
          <p className="text-muted">
            {mode === 'login' && "Welcome back! Please log in."}
            {mode === 'signup' && step === 1 && "Create a new account."}
            {mode === 'signup' && step === 2 && "Verify your mobile number."}
            {mode === 'signup' && step === 3 && "Secure your account."}
            {mode === 'forgot' && step === 1 && "Reset your password."}
            {mode === 'forgot' && step === 2 && "Verify your identity."}
            {mode === 'forgot' && step === 3 && "Create a new password."}
          </p>
        </div>
        
        {error && <div className="error-msg">{error}</div>}
        
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="identifier">Mobile Number or Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  id="identifier"
                  type="text" 
                  className="input" 
                  style={{ paddingLeft: '40px' }}
                  placeholder="9876543210 or @username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="login-password">Password</label>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer' }}
                  onClick={() => switchMode('forgot')}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  id="login-password"
                  type="password" 
                  className="input" 
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              <LogIn size={18} />
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
              <span className="text-muted">Don't have an account? </span>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => switchMode('signup')}
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {(mode === 'signup' || mode === 'forgot') && step === 1 && (
          <form onSubmit={handleSendOTP}>
            <div className="input-group">
              <label htmlFor="mobile">Mobile Number</label>
              <div style={{ position: 'relative' }}>
                <Smartphone size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <span style={{ position: 'absolute', left: '40px', top: '12px', color: 'var(--text-main)', fontWeight: 500 }}>+91</span>
                <input 
                  id="mobile"
                  type="tel" 
                  className="input" 
                  style={{ paddingLeft: '80px', letterSpacing: '2px' }}
                  placeholder="9876543210"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {mode === 'signup' ? <UserPlus size={18} /> : <Smartphone size={18} />}
              {loading ? 'Sending OTP...' : (mode === 'signup' ? 'Sign Up' : 'Send OTP')}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
              <button 
                type="button" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => switchMode('login')}
              >
                <ArrowLeft size={16} /> Back to Login
              </button>
            </div>
          </form>
        )}

        {(mode === 'signup' || mode === 'forgot') && step === 2 && (
          <form onSubmit={handleVerifyOTP}>
            <div className="input-group">
              <label htmlFor="otp">Enter 6-Digit OTP</label>
              <input 
                id="otp"
                type="text" 
                className="input" 
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem' }}
                autoFocus
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                (Check the alert popup for your OTP)
              </p>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setStep(1)}
              >
                Change Mobile Number
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && step === 3 && (
          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label htmlFor="username">Choose a Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  id="username"
                  type="text" 
                  className="input" 
                  style={{ paddingLeft: '40px' }}
                  placeholder="@username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Create Secure Password</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  id="password"
                  type="password" 
                  className="input" 
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
              <ValidationItem label="At least 8 characters" isValid={validations.length} />
              <ValidationItem label="One lowercase letter (a-z)" isValid={validations.lowercase} />
              <ValidationItem label="One uppercase letter (A-Z)" isValid={validations.uppercase} />
              <ValidationItem label="One number (0-9)" isValid={validations.number} />
              <ValidationItem label="One special character (@$!%*?&)" isValid={validations.special} />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading || !isPasswordValid}>
              <UserPlus size={18} />
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {mode === 'forgot' && step === 3 && (
          <form onSubmit={handleResetPassword}>
            <div className="input-group">
              <label htmlFor="password">Enter New Password</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  id="password"
                  type="password" 
                  className="input" 
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
              <ValidationItem label="At least 8 characters" isValid={validations.length} />
              <ValidationItem label="One lowercase letter (a-z)" isValid={validations.lowercase} />
              <ValidationItem label="One uppercase letter (A-Z)" isValid={validations.uppercase} />
              <ValidationItem label="One number (0-9)" isValid={validations.number} />
              <ValidationItem label="One special character (@$!%*?&)" isValid={validations.special} />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading || !isPasswordValid}>
              <RotateCcw size={18} />
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

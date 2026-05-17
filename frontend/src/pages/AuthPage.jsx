import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [forgotStep, setForgotStep] = useState(0);
  const [resetData, setResetData] = useState({ identifier: '', otp: '', newPassword: '' });
  const { login, register, verifyOtp, forgotPassword, resetPassword, loading, error } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      await login(formData.email, formData.password);
    } else {
      const response = await register(formData.username, formData.email, formData.password);
      if (response && response.requireOtp) {
        setOtpCode('');
        setShowOtpScreen(true);
      } else if (response && !response.error) {
        setIsLogin(true); // Fallback for some reason
      }
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    await verifyOtp(formData.email, otpCode);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (forgotStep === 1) {
      const response = await forgotPassword(resetData.identifier);
      if (response) {
        setResetData((prev) => ({ ...prev, otp: '' }));
        setForgotStep(2);
      }
    } else if (forgotStep === 2) {
      const success = await resetPassword(resetData.identifier, resetData.otp, resetData.newPassword);
      if (success) {
        setForgotStep(0);
        setIsLogin(true);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      {/* Background Neon Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-neon-purple)] rounded-full blur-[120px] opacity-20" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-neon-blue)] rounded-full blur-[120px] opacity-20" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-md p-8 rounded-2xl z-10 border border-[#ffffff1a] shadow-[0_0_50px_rgba(176,38,255,0.1)]"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] uppercase tracking-widest mb-2">
            AntiGravity
          </h1>
          <p className="text-gray-400 text-sm">Enter the nexus.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {forgotStep > 0 ? (
          <form className="space-y-4" onSubmit={handleForgotSubmit}>
            <div className="text-center mb-6 text-gray-300 text-sm">
              {forgotStep === 1
                ? 'Enter your email to receive a reset code.'
                : 'Enter the 6-digit code from your email and your new password.'}
            </div>
            
            {forgotStep === 1 ? (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={resetData.identifier}
                  onChange={(e) => setResetData({ ...resetData, identifier: e.target.value })}
                  className="w-full bg-[#ffffff0a] border border-[#ffffff1a] rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 outline-none focus:border-[var(--color-neon-blue)] transition-colors"
                  required
                />
              </div>
            ) : (
              <>
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="0 0 0 0 0 0" 
                  value={resetData.otp}
                  onChange={(e) => setResetData({ ...resetData, otp: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-[#ffffff0a] border border-[var(--color-neon-purple)] rounded-xl py-4 text-center text-3xl tracking-[1em] text-white placeholder-gray-600 outline-none focus:shadow-[0_0_15px_rgba(176,38,255,0.4)] transition-all mb-4"
                  required
                />
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input 
                    type="password" 
                    placeholder="New Password" 
                    value={resetData.newPassword}
                    onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                    className="w-full bg-[#ffffff0a] border border-[#ffffff1a] rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 outline-none focus:border-[var(--color-neon-pink)] transition-colors"
                    required
                  />
                </div>
              </>
            )}

            <button 
              type="submit"
              disabled={loading || (forgotStep === 2 && resetData.otp.length !== 6)}
              className="w-full py-3 mt-6 rounded-xl font-bold bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] hover:shadow-[0_0_20px_rgba(176,38,255,0.4)] transition-all flex justify-center items-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : (forgotStep === 1 ? 'Send Code' : 'Reset Password')}
            </button>
            <p className="text-center text-sm text-gray-500 mt-4 cursor-pointer hover:text-white" onClick={() => setForgotStep(0)}>Back to Login</p>
          </form>
        ) : showOtpScreen ? (
          <form className="space-y-4" onSubmit={handleOtpSubmit}>
            <motion.div className="text-center mb-6 text-gray-300 text-sm">
              We&apos;ve sent a 6-digit verification code to your email <br />
              <span className="font-bold text-[var(--color-neon-blue)]">{formData.email}</span>
              <p className="text-xs text-gray-500 mt-2">Check inbox and spam. Code is only sent by email.</p>
            </motion.div>
            
            <input 
              type="text" 
              maxLength="6"
              placeholder="0 0 0 0 0 0" 
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-[#ffffff0a] border border-[var(--color-neon-purple)] rounded-xl py-4 text-center text-3xl tracking-[1em] text-white placeholder-gray-600 outline-none focus:shadow-[0_0_15px_rgba(176,38,255,0.4)] transition-all"
              required
            />

            <button 
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3 mt-6 rounded-xl font-bold bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] hover:shadow-[0_0_20px_rgba(176,38,255,0.4)] transition-all flex justify-center items-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Verify Code'}
            </button>
            <p className="text-center text-sm text-gray-500 mt-4 cursor-pointer hover:text-white" onClick={() => setShowOtpScreen(false)}>Back to Sign Up</p>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Username" 
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-[#ffffff0a] border border-[#ffffff1a] rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 outline-none focus:border-[var(--color-neon-purple)] transition-colors"
                required={!isLogin}
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#ffffff0a] border border-[#ffffff1a] rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 outline-none focus:border-[var(--color-neon-blue)] transition-colors"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="password" 
              placeholder="Password" 
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-[#ffffff0a] border border-[#ffffff1a] rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 outline-none focus:border-[var(--color-neon-pink)] transition-colors"
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full py-3 mt-4 rounded-xl font-bold bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] hover:shadow-[0_0_20px_rgba(176,38,255,0.4)] transition-all flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Login' : 'Sign Up')}
          </button>
          
          {isLogin && (
            <p className="text-center text-sm text-gray-400 mt-4 cursor-pointer hover:text-[var(--color-neon-blue)] transition-colors" onClick={() => setForgotStep(1)}>
              Forgot Password?
            </p>
          )}
          </form>
        )}

        {!showOtpScreen && forgotStep === 0 && (
          <p className="text-center text-sm text-gray-400 mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
              className="text-[var(--color-neon-blue)] cursor-pointer hover:underline"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </span>
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage;

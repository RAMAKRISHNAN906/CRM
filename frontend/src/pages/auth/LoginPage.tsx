import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, Zap, Shield, Globe } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: <Zap size={16} />, text: 'Lightning-fast performance' },
  { icon: <Shield size={16} />, text: 'Enterprise-grade security' },
  { icon: <Globe size={16} />, text: 'Works offline with PWA' },
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (type: 'admin' | 'user') => {
    if (type === 'admin') { setEmail('admin@crm.com'); setPassword('Admin@123'); }
    else { setEmail('user@crm.com'); setPassword('User@123'); }
  };

  return (
    <div className="min-h-screen bg-surface flex relative overflow-hidden">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col w-1/2 relative overflow-hidden p-12"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-accent-rgb) / 0.15) 0%, rgb(var(--surface)) 50%, rgb(67 56 202 / 0.1) 100%)' }}
      >
        {/* Background effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl bg-accent-10" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgb(67 56 202 / 0.08)' }} />

        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow-accent">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-xl">Sample CRM</span>
              <span className="block text-xs text-gray-500">Enterprise Edition</span>
            </div>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            The CRM your<br />
            <span className="gradient-text-accent">team will love</span>
          </h1>
          <p className="text-lg text-gray-400 mb-12 leading-relaxed">
            Streamline your sales pipeline, manage relationships, and grow your revenue with our premium CRM platform.
          </p>

          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-gray-300"
              >
                <div className="w-8 h-8 rounded-lg bg-accent-10 border border-accent-20 flex items-center justify-center text-accent-muted">
                  {f.icon}
                </div>
                <span className="text-sm">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 mt-auto grid grid-cols-3 gap-6"
        >
          {[['10K+', 'Users'], ['99.9%', 'Uptime'], ['2M+', 'Deals closed']].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-white">{val}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px] space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl">Sample CRM</span>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white">Welcome back</h2>
            <p className="text-gray-400 mt-2">Sign in to your account to continue</p>
          </div>

          {/* Demo credentials */}
          <div className="flex gap-2">
            <button
              onClick={() => fillDemo('admin')}
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-accent-10 border border-accent-20 text-accent-muted hover:bg-accent-20 transition-colors"
            >
              Demo Admin
            </button>
            <button
              onClick={() => fillDemo('user')}
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              Demo User
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={16} />}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              iconRight={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              required
              autoComplete="current-password"
            />

            <Button type="submit" fullWidth loading={isLoading} size="lg" iconRight={<ArrowRight size={16} />}>
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-muted hover:text-accent-light font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

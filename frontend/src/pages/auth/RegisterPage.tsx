import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (formData.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setIsLoading(true);
    try {
      await register(formData.name, formData.email, formData.password);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = (() => {
    const p = formData.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[440px] space-y-8 relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow-accent">
            <Sparkles size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">Sample CRM</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-white">Create your account</h2>
          <p className="text-gray-400 mt-2">Start your 14-day free trial, no credit card required</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange('name')}
            icon={<User size={16} />}
            required
            autoComplete="name"
          />
          <Input
            label="Email address"
            type="email"
            placeholder="you@company.com"
            value={formData.email}
            onChange={handleChange('email')}
            icon={<Mail size={16} />}
            required
            autoComplete="email"
          />
          <div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={formData.password}
              onChange={handleChange('password')}
              icon={<Lock size={16} />}
              iconRight={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              required
              autoComplete="new-password"
            />
            {formData.password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-surface-elevated'}`} />
                  ))}
                </div>
                <p className="text-xs text-gray-500">Strength: <span className={`font-medium ${passwordStrength >= 3 ? 'text-green-400' : 'text-orange-400'}`}>{strengthLabels[passwordStrength]}</span></p>
              </div>
            )}
          </div>
          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Repeat password"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            icon={<Lock size={16} />}
            error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : undefined}
            required
            autoComplete="new-password"
          />

          <Button type="submit" fullWidth loading={isLoading} size="lg" iconRight={<ArrowRight size={16} />}>
            Create account
          </Button>
        </form>

        <p className="text-xs text-center text-gray-600">
          By creating an account, you agree to our{' '}
          <span className="text-accent-muted cursor-pointer hover:underline">Terms of Service</span> and{' '}
          <span className="text-accent-muted cursor-pointer hover:underline">Privacy Policy</span>
        </p>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-muted hover:text-accent-light font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { connectSocket } from '@/lib/socket';
import BackgroundEffects from '@/components/ui/BackgroundEffects';

const schema = z.object({ email: z.string().email('Invalid email'), password: z.string().min(1, 'Required') });
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try { setError('');
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      connectSocket(); navigate('/');
    } catch (err: any) { setError(err.response?.data?.error || 'Login failed'); }
  };

  const inputStyles = "w-full px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all duration-300 text-[15px]";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] } }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#020202]">
      <BackgroundEffects />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-[440px] p-10 rounded-[32px] glass-deep border border-white/10 relative z-10 overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <motion.div variants={item} className="text-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 bg-gradient-to-br from-primary via-primary to-blue-600 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(78,114,250,0.3)] relative group cursor-pointer"
          >
            <div className="absolute inset-0 rounded-[24px] bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
            <span className="text-white font-extrabold text-4xl italic tracking-tighter">T</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground/60 text-sm mt-2">The pulse of connection awaits you.</p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="px-4 py-3 rounded-2xl bg-destructive/10 text-destructive text-sm border border-destructive/20 text-center"
            >
              {error}
            </motion.div>
          )}

          <motion.div variants={item} className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground/80 ml-1">Email Address</label>
            <input {...register('email')} type="email" className={inputStyles} placeholder="name@teamer.app" />
            {errors.email && <p className="text-destructive text-xs mt-1.5 ml-1">{errors.email.message}</p>}
          </motion.div>

          <motion.div variants={item} className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground/80 ml-1">Password</label>
            <input {...register('password')} type="password" className={inputStyles} placeholder="••••••••" />
            {errors.password && <p className="text-destructive text-xs mt-1.5 ml-1">{errors.password.message}</p>}
          </motion.div>

          <motion.div variants={item} className="pt-2">
            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }} 
              whileTap={{ scale: 0.98, y: 0 }} 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-[0_20px_40px_rgba(78,114,250,0.25)] hover:shadow-[0_20px_40px_rgba(78,114,250,0.35)] transition-all duration-300 disabled:opacity-50 relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating...</>
                ) : 'Sign In'}
              </span>
            </motion.button>
          </motion.div>

          <motion.p variants={item} className="text-sm text-muted-foreground/60 text-center pt-2">
            New to the pulse? <Link to="/register" className="text-primary hover:text-primary/80 font-semibold transition-colors">Create account</Link>
          </motion.p>
        </form>
        
        <motion.div variants={item} className="flex items-center justify-center gap-2 mt-10">
          <div className="h-[1px] w-8 bg-white/5" />
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">Designed by REAPXR</p>
          <div className="h-[1px] w-8 bg-white/5" />
        </motion.div>
      </motion.div>
    </div>
  );
}


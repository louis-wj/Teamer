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

const schema = z.object({
  email: z.string().email(), username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(64), password: z.string().min(8), confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try { setError('');
      const { confirmPassword, ...body } = data;
      const res = await api.post('/auth/register', body);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      connectSocket(); navigate('/');
    } catch (err: any) { setError(err.response?.data?.error || 'Registration failed'); }
  };

  const inputStyles = "w-full px-5 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all duration-300 text-sm";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] } }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#020202]">
      <BackgroundEffects />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-[520px] p-8 md:p-10 rounded-[40px] glass-deep border border-white/10 relative z-10 overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <motion.div variants={item} className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Create your account</h1>
          <p className="text-muted-foreground/60 text-sm mt-2">Join the pulse of the future.</p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="px-4 py-3 rounded-2xl bg-destructive/10 text-destructive text-sm border border-destructive/20 text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <motion.div variants={item} className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground/80 ml-1 uppercase tracking-wider">Username</label>
              <input {...register('username')} className={inputStyles} placeholder="solaris" />
              {errors.username && <p className="text-destructive text-[10px] mt-1 ml-1">{errors.username.message}</p>}
            </motion.div>
            <motion.div variants={item} className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground/80 ml-1 uppercase tracking-wider">Display Name</label>
              <input {...register('displayName')} className={inputStyles} placeholder="Solaris Prime" />
              {errors.displayName && <p className="text-destructive text-[10px] mt-1 ml-1">{errors.displayName.message}</p>}
            </motion.div>
          </div>

          <motion.div variants={item} className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground/80 ml-1 uppercase tracking-wider">Email Address</label>
            <input {...register('email')} type="email" className={inputStyles} placeholder="name@teamer.app" />
            {errors.email && <p className="text-destructive text-[10px] mt-1 ml-1">{errors.email.message}</p>}
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <motion.div variants={item} className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground/80 ml-1 uppercase tracking-wider">Password</label>
              <input {...register('password')} type="password" className={inputStyles} placeholder="••••••••" />
              {errors.password && <p className="text-destructive text-[10px] mt-1 ml-1">{errors.password.message}</p>}
            </motion.div>
            <motion.div variants={item} className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground/80 ml-1 uppercase tracking-wider">Confirm</label>
              <input {...register('confirmPassword')} type="password" className={inputStyles} placeholder="••••••••" />
              {errors.confirmPassword && <p className="text-destructive text-[10px] mt-1 ml-1">{errors.confirmPassword.message}</p>}
            </motion.div>
          </div>

          <motion.div variants={item} className="pt-4">
            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }} 
              whileTap={{ scale: 0.98, y: 0 }} 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-[0_20px_40px_rgba(78,114,250,0.25)] hover:shadow-[0_20px_40px_rgba(78,114,250,0.35)] transition-all duration-300 disabled:opacity-50 relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative z-10 flex items-center justify-center gap-2 text-base">
                {isSubmitting ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Pulse...</>
                ) : 'Join Now'}
              </span>
            </motion.button>
          </motion.div>

          <motion.p variants={item} className="text-sm text-muted-foreground/60 text-center pt-2">
            Already pulsed? <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign in here</Link>
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


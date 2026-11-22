import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2, Users, IndianRupee, Shield, Bed, BarChart3, Utensils, Megaphone, MessageSquare, Bell, ChevronDown, Check, Smartphone, Globe, Zap, ArrowRight, Star, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FEATURES = [
  { icon: Building2, title: 'Multi-Building Management', desc: 'Manage unlimited buildings, floors, rooms & beds with real-time occupancy and visual maps.', color: 'from-blue-500 to-cyan-500' },
  { icon: Users, title: 'Complete Resident Lifecycle', desc: 'Check-in to checkout — KYC, documents, transfers, complaints, payment history all in one profile.', color: 'from-violet-500 to-purple-500' },
  { icon: Bed, title: 'Visual Bed Map', desc: 'See occupancy at a glance. Blue for boys, pink for girls. Assign with one click.', color: 'from-pink-500 to-rose-500' },
  { icon: IndianRupee, title: 'Smart Rent Collection', desc: 'Auto-generate rent, UPI proof submission, admin confirmation. Partial payments & late fees.', color: 'from-emerald-500 to-green-500' },
  { icon: Shield, title: 'Roles & Access Control', desc: 'Custom staff roles with granular permissions. Staff sees only what you allow.', color: 'from-amber-500 to-orange-500' },
  { icon: MessageSquare, title: 'Complaint Resolution', desc: 'Residents raise, staff responds. Full thread, priority levels, assignment & resolution tracking.', color: 'from-sky-500 to-blue-500' },
  { icon: Utensils, title: 'Food Menu Management', desc: 'Weekly menus per building. Breakfast, lunch, snacks, dinner. Residents see it in their app.', color: 'from-teal-500 to-cyan-500' },
  { icon: Megaphone, title: 'Promotions & Partner Deals', desc: 'Tie-up with laundry, food, gym services. Show deals to residents with photos & contact.', color: 'from-fuchsia-500 to-pink-500' },
  { icon: BarChart3, title: 'Finance Analytics', desc: 'Income, expenses, rent collection, profit — full financial visibility with date filters.', color: 'from-indigo-500 to-violet-500' },
  { icon: Bell, title: 'Real-time Notifications', desc: 'Payment proofs, complaints, OTP login alerts — everything pushed to your app instantly.', color: 'from-red-500 to-orange-500' },
];

const HIGHLIGHTS = [
  'No SMS cost — OTP shown directly in your app',
  'Works on mobile (Tenant App + Resident App)',
  'Cloudinary-powered document & photo storage',
  'Multi-tenant SaaS — each PG is isolated',
  'Dark mode supported everywhere',
  'Swagger API documentation included',
];

function AnimatedCounter({ end, suffix = '' }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <span>{count}{suffix}</span>;
}

export default function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signupForm, setSignupForm] = useState({
    businessName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Phone validation: must be digits only and exactly 10 digits
    if (!/^\d{10}$/.test(signupForm.phone)) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    // Password length validation
    if (signupForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    // Confirm password check
    if (signupForm.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', signupForm);
      setAuth(data.data);
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Registration failed';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const openSignIn = () => {
    setMode('signin');
    setError('');
    setShowSignInPassword(false);
    setShowLogin(true);
  };

  const openSignUp = () => {
    setMode('signup');
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowLogin(true);
  };

  return (
    <div className="min-h-screen bg-[#fafbff] dark:bg-[#0a0e1a]">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-white/70 dark:bg-[#0a0e1a]/80 border-b border-slate-200/30 dark:border-slate-800/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-lg text-white shadow-lg shadow-blue-500/30">E</div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">EzeHub</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="hidden sm:block text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 font-medium transition-colors">Features</a>
            <a href="#why" className="hidden sm:block text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 font-medium transition-colors">Why EzeHub</a>
            <Button variant="ghost" onClick={openSignIn} className="text-sm font-semibold hover:text-blue-600">
              Sign In
            </Button>
            <Button onClick={openSignUp} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-500/30 px-6 hover:shadow-xl hover:shadow-blue-500/40 transition-all">
              Sign Up
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-28 pb-24 px-6 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-[10%] w-[500px] h-[500px] bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-20 right-[10%] w-[400px] h-[400px] bg-gradient-to-r from-cyan-400/15 to-blue-400/15 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-400/10 to-pink-400/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-800/50 px-5 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-300 mb-8 shadow-sm">
            <Zap className="h-4 w-4" /> India's Smartest PG Management Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.05] mb-7 tracking-tight">
            Your PG, <br/>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">Managed Brilliantly</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
            Buildings, residents, rent, staff, food, complaints — the complete toolkit for PGs, hostels, and co-living spaces. <span className="font-medium text-slate-800 dark:text-slate-200">Zero hassle.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button onClick={openSignUp} size="lg" className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-full shadow-2xl shadow-blue-500/30 h-14 px-10 text-lg font-semibold hover:shadow-blue-500/50 transition-all hover:scale-[1.02]">
              Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <a href="#features">
              <Button variant="outline" size="lg" className="rounded-full h-14 px-10 text-lg font-semibold border-2 border-slate-300 dark:border-slate-700 hover:border-blue-400 transition-all">
                Explore Features <ChevronDown className="h-5 w-5 ml-1" />
              </Button>
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> Free to start</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> Mobile apps included</span>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto mt-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: 108, suffix: '+', label: 'API Endpoints' },
              { value: 3, suffix: '', label: 'Web Portals' },
              { value: 2, suffix: '', label: 'Mobile Apps' },
              { value: 35, suffix: '+', label: 'Feature Modules' },
            ].map((s, i) => (
              <div key={i} className="text-center p-5 rounded-2xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/30">
                <p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  <AnimatedCounter end={s.value} suffix={s.suffix} />
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Features</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mt-3 mb-5">Everything You Need</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">One platform to run your entire accommodation business — from the first check-in to the last receipt.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="group relative p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/30 hover:border-transparent hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY EZEHUB ═══ */}
      <section id="why" className="py-24 px-6 bg-gradient-to-b from-slate-50/50 to-blue-50/30 dark:from-slate-900/50 dark:to-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Why EzeHub</span>
              <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-3 mb-6">Built Different</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">Not just another software — it's a complete ecosystem designed specifically for Indian PGs and hostels.</p>

              <div className="space-y-4">
                {HIGHLIGHTS.map((h, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{h}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/30 shadow-lg">
                <Globe className="h-8 w-8 text-blue-500 mb-3" />
                <h4 className="font-bold text-slate-800 dark:text-white mb-1">Web Portal</h4>
                <p className="text-xs text-slate-500">Full management dashboard for desktop</p>
              </div>
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/30 shadow-lg mt-8">
                <Smartphone className="h-8 w-8 text-purple-500 mb-3" />
                <h4 className="font-bold text-slate-800 dark:text-white mb-1">Tenant App</h4>
                <p className="text-xs text-slate-500">Manage on the go from your phone</p>
              </div>
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/30 shadow-lg">
                <Smartphone className="h-8 w-8 text-pink-500 mb-3" />
                <h4 className="font-bold text-slate-800 dark:text-white mb-1">Resident App</h4>
                <p className="text-xs text-slate-500">Rent, menu, offers — for your residents</p>
              </div>
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/30 shadow-lg mt-8">
                <Star className="h-8 w-8 text-amber-500 mb-3" />
                <h4 className="font-bold text-slate-800 dark:text-white mb-1">Platform Portal</h4>
                <p className="text-xs text-slate-500">Super admin for multi-tenant control</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-12 md:p-16 rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white relative overflow-hidden shadow-2xl shadow-blue-500/20">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.02] rounded-full"></div>
            <div className="relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Start Managing Today</h2>
              <p className="text-blue-100 text-xl mb-10 max-w-xl mx-auto">Create your account or sign in to access your full management dashboard. Your PG deserves better tools.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={openSignUp} size="lg" className="bg-white text-blue-700 hover:bg-blue-50 rounded-full h-14 px-10 text-lg font-bold shadow-2xl hover:scale-[1.02] transition-all">
                  Create Free Account <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button onClick={openSignIn} variant="outline" size="lg" className="border-2 border-white/40 text-white hover:bg-white/10 rounded-full h-14 px-8 text-lg font-semibold transition-all">
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200/30 dark:border-slate-800/30 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-sm text-white">E</div>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">EzeHub — Smart PG Management</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 EzeHub. Built with ❤️ for PG owners across India.</p>
        </div>
      </footer>

      {/* ═══ AUTH MODAL ═══ */}
      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowLogin(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-blue-500/10 p-8 border border-slate-200/50 dark:border-slate-800/50 animate-in fade-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-xl text-white shadow-xl shadow-blue-500/30 mx-auto mb-3">E</div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                {mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {mode === 'signin' ? 'Sign in to your management dashboard' : 'Get started with EzeHub in less than 2 minutes'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            {mode === 'signin' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="rounded-xl h-11 text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      type={showSignInPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="rounded-xl h-11 text-base pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                      tabIndex={-1}
                      aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    >
                      {showSignInPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-xl h-12 text-base font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all mt-2"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sign In
                </Button>
                <div className="pt-2 text-center text-sm text-slate-500">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(''); }}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Sign up free
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">PG / Business Name</Label>
                  <Input
                    type="text"
                    value={signupForm.businessName}
                    onChange={(e) => setSignupForm({ ...signupForm, businessName: e.target.value })}
                    required
                    placeholder="e.g. Royal Living PG"
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">First Name</Label>
                    <Input
                      type="text"
                      value={signupForm.firstName}
                      onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                      required
                      placeholder="John"
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">Last Name</Label>
                    <Input
                      type="text"
                      value={signupForm.lastName}
                      onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                      required
                      placeholder="Doe"
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">Email</Label>
                    <Input
                      type="email"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                      placeholder="owner@example.com"
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">Phone Number</Label>
                      <span className="text-[11px] text-slate-400 font-mono">{signupForm.phone.length}/10</span>
                    </div>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      value={signupForm.phone}
                      onChange={(e) => {
                        const numericVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setSignupForm({ ...signupForm, phone: numericVal });
                      }}
                      required
                      placeholder="9876543210"
                      className="rounded-xl h-10 text-sm font-mono tracking-wider"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        required
                        minLength={8}
                        placeholder="••••••••"
                        className="rounded-xl h-10 text-sm pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder="••••••••"
                        className="rounded-xl h-10 text-sm pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-xl h-11 text-base font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all mt-3"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Get Started Free
                </Button>
                <div className="pt-1 text-center text-sm text-slate-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(''); }}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}

            <button
              onClick={() => setShowLogin(false)}
              className="mt-5 w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Back to homepage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

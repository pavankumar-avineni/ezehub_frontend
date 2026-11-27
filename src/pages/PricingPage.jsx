import { Link, useNavigate } from 'react-router-dom';
import PricingSection from '@/components/shared/PricingSection';

export default function PricingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#fafbff] dark:bg-[#0a0e1a]">
      <nav className="border-b border-slate-200/30 dark:border-slate-800/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/login" className="text-xl font-extrabold bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">EzeHub</Link>
          <Link to="/login" className="text-sm font-semibold text-blue-600 hover:underline">Sign in</Link>
        </div>
      </nav>
      <section className="py-16 px-6">
        <PricingSection onGetStarted={() => navigate('/login')} />
      </section>
    </div>
  );
}

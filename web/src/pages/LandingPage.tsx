import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Trophy, Users, TrendingUp, CheckCircle, Check, Star,
  Play, Download, ChevronRight, ChevronLeft, Zap, Shield, Clock, Award, PlayCircle,
  Eye, FileText, BrainCircuit, HelpCircle, File
} from 'lucide-react';
import { apiGet, resolvePublicUrl } from '../lib/api';
import type { Exam, SubscriptionPlan, PDF, Quiz } from '../types';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' } }),
};

const softClasses = [
  'bg-blue-50 text-blue-950 border-blue-100 hover:border-blue-300 hover:shadow-blue-100',
  'bg-red-50 text-red-950 border-red-100 hover:border-red-300 hover:shadow-red-100',
  'bg-emerald-50 text-emerald-950 border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100',
  'bg-amber-50 text-amber-950 border-amber-100 hover:border-amber-300 hover:shadow-amber-100',
  'bg-cyan-50 text-cyan-950 border-cyan-100 hover:border-cyan-300 hover:shadow-cyan-100',
  'bg-pink-50 text-pink-950 border-pink-100 hover:border-pink-300 hover:shadow-pink-100',
  'bg-indigo-50 text-indigo-950 border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-100',
  'bg-violet-50 text-violet-950 border-violet-100 hover:border-violet-300 hover:shadow-violet-100'
];

const HoverCard = ({ to, className, children }: { to: string, className: string, children: React.ReactNode }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <Link
      to={to}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {children}
      {isHovering && (
        <div 
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-100 transition duration-300 z-50 mix-blend-overlay"
          style={{
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.7), transparent 40%)`
          }}
        />
      )}
    </Link>
  );
};

const stats = [
  { label: 'Active Students', value: '2,50,000+', icon: Users, color: 'text-primary-600' },
  { label: 'Study PDFs', value: '15,000+', icon: BookOpen, color: 'text-emerald-600' },
  { label: 'Mock Tests', value: '5,000+', icon: Trophy, color: 'text-amber-600' },
  { label: 'Success Rate', value: '94%', icon: TrendingUp, color: 'text-violet-600' },
];

const features = [
  { icon: BookOpen, title: 'Premium PDFs', description: 'Curated study material for every government exam, organized by subject and topic.' },
  { icon: Trophy, title: 'Mock Tests & Quizzes', description: 'Realistic mock tests with timer, negative marking, and detailed performance analytics.' },
  { icon: Zap, title: 'Daily Practice', description: 'Daily quizzes, weekly tests, and live leaderboards to keep you competitive.' },
  { icon: Shield, title: 'Trusted Content', description: 'Expert-verified study material updated regularly to match latest exam patterns.' },
  { icon: Clock, title: 'Study Anywhere', description: 'Access your study material from any device — web, iOS, or Android.' },
  { icon: Award, title: 'Track Progress', description: 'Detailed analytics showing your strengths, weaknesses, and improvement over time.' },
];

const steps = [
  { step: '01', title: 'Choose Your Exam', description: 'Select from 50+ government exams including SSC, UPSC, Banking, Railway, and Police.' },
  { step: '02', title: 'Pick Your Subjects', description: 'Focus on specific subjects or practice all sections with full exam mock tests.' },
  { step: '03', title: 'Study & Practice', description: 'Read premium PDFs and attempt quizzes with instant feedback and explanations.' },
  { step: '04', title: 'Track & Improve', description: 'Monitor your progress with detailed analytics and rank on the leaderboard.' },
];

const testimonials = [
  { name: 'Rahul Verma', exam: 'SSC CGL 2024', text: 'Open E Academy helped me crack SSC CGL in my first attempt. The mock tests are exactly like the real exam!', rating: 5, city: 'Delhi' },
  { name: 'Priya Sharma', exam: 'IBPS PO 2024', text: 'Best platform for banking exams. The PDF quality and quiz explanations are outstanding.', rating: 5, city: 'Mumbai' },
  { name: 'Amit Kumar', exam: 'UP Police 2024', text: 'Affordable plans with excellent content. Cleared UP Police with 89 percentile.', rating: 5, city: 'Lucknow' },
];

const faqs = [
  { q: 'Can I access content offline?', a: 'Currently content is available online. Offline access is coming soon via our mobile app.' },
  { q: 'How many devices can I use?', a: 'You can access Open E Academy on unlimited devices simultaneously with one account.' },
  { q: 'Are there free materials?', a: 'Yes! We offer free preview of 10 pages per PDF and selected free quizzes for every exam.' },
  { q: 'What payment methods are accepted?', a: 'We accept UPI, Debit/Credit Cards, Net Banking, Wallets, and Razorpay.' },
  { q: 'Can I get a refund?', a: 'We offer a 7-day money-back guarantee for all subscription plans.' },
];

export default function LandingPage() {
  const { data: examsData } = useQuery({
    queryKey: ['featured-exams'],
    queryFn: () => apiGet<Exam[]>('/exams', { featured: 'true', limit: '10' }),
  });

  const { data: pdfsData } = useQuery({
    queryKey: ['featured-pdfs'],
    queryFn: () => apiGet<PDF[]>('/pdfs', { limit: '10' }),
  });

  const { data: quizzesData } = useQuery({
    queryKey: ['featured-quizzes'],
    queryFn: () => apiGet<Quiz[]>('/quizzes', { limit: '10' }),
  });

  const { data: plansData } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => apiGet<SubscriptionPlan[]>('/subscriptions/plans'),
  });

  const exams = examsData?.data || [];
  const pdfs = pdfsData?.data || [];
  const quizzes = quizzesData?.data || [];
  const plans = plansData?.data || [];

  const scrollRef = (ref: React.RefObject<HTMLDivElement>, dir: 'left' | 'right') => {
    if (ref.current) {
      ref.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  };

  const examsRef = useRef<HTMLDivElement>(null);
  const pdfsRef = useRef<HTMLDivElement>(null);
  const quizzesRef = useRef<HTMLDivElement>(null);

  return (
    <div className="overflow-hidden">
      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className="relative bg-white pt-24 pb-20 overflow-hidden min-h-[90vh] flex items-center justify-center">
        {/* Background Full Circle */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-start justify-center">
           <div className="w-[150vw] h-[150vw] md:w-[120vw] md:h-[120vw] lg:w-[100vw] lg:h-[100vw] bg-primary-50 rounded-full absolute top-[10%] md:top-[5%]" />
        </div>
        
        {/* Decorative Floating Circles */}
        <div className="absolute top-[20%] left-[8%] md:left-[15%] w-8 h-8 md:w-12 md:h-12 bg-primary-400 rounded-full opacity-60" />
        <div className="absolute top-[30%] right-[10%] md:right-[20%] w-6 h-6 md:w-10 md:h-10 bg-primary-300 rounded-full opacity-60" />
        <div className="absolute bottom-[20%] right-[15%] md:right-[25%] w-3 h-3 md:w-5 md:h-5 bg-primary-500 rounded-full opacity-50" />
        <div className="absolute bottom-[30%] left-[15%] md:left-[25%] w-4 h-4 md:w-6 md:h-6 bg-primary-200 rounded-full opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 flex flex-col items-center w-full h-full justify-center -mt-10 md:-mt-20">
          
          {/* Top layout: Text on left, Illustration in center */}
          <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-center relative mb-4 md:mb-6">
            
            {/* Left Paragraph */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="md:absolute md:left-0 md:top-1/3 max-w-xs text-center md:text-left text-gray-700 font-medium leading-relaxed mb-6 md:mb-0"
            >
              Premium Study Material Designed To Help You Succeed With The Right Government Exams
            </motion.div>

            {/* Center Illustration */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mx-auto flex justify-center w-full max-w-sm md:max-w-md lg:max-w-lg z-10"
            >
              <img 
                src="/hero-illustration.png" 
                alt="Student Illustration" 
                className="w-full h-auto object-contain mix-blend-multiply" 
                style={{ maxHeight: '350px' }}
              />
            </motion.div>
          </div>

          {/* Large Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-tight mb-6 text-center max-w-4xl font-extrabold tracking-tight"
          >
            Get Top Rankings And <br className="hidden md:block"/> Succeed On Exams
          </motion.h1>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link to="/register" className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-medium text-lg transition-colors w-full sm:w-auto text-center shadow-md">
              Get Started Now
            </Link>
            <Link to="/exams" className="bg-white text-primary-700 border-2 border-primary-200 hover:border-primary-600 hover:bg-primary-50 px-8 py-3.5 rounded-xl font-medium text-lg transition-all w-full sm:w-auto text-center shadow-sm">
              Browse Exams
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-center"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 mb-3 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Exams ──────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="section-title text-left mb-1">Popular Exams</h2>
              <p className="section-subtitle text-left mb-0">Target top exams with structured material</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/exams" className="text-sm font-semibold text-primary-600 hover:text-primary-700 mr-2 md:mr-4 hidden sm:block">
                View All
              </Link>
              <button onClick={() => scrollRef(examsRef, 'left')} className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm text-gray-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => scrollRef(examsRef, 'right')} className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm text-gray-600">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div ref={examsRef} className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 pt-2 bleed-both relative z-10 after:content-[''] after:w-4 after:shrink-0">
            <div className="bleed-spacer snap-start" />
            {(exams.length > 0 ? exams : Array.from({ length: 8 }, (_, i) => ({
              id: `${i}`, name: ['SSC CGL', 'UPSC CSE', 'IBPS PO', 'Railway NTPC', 'UP Police', 'NDA', 'Delhi Police', 'CTET'][i],
              slug: ['ssc-cgl', 'upsc-cse', 'banking', 'railway-rrb-ntpc', 'up-police', 'nda', 'delhi-police', 'ctet'][i],
              _count: { subjects: 4, pdfs: 120, quizzes: 50 }
            }))).map((exam: any, i) => {
              const cardColorClass = softClasses[i % softClasses.length];
              
              return (
              <motion.div
                key={exam.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="w-[280px] sm:w-[320px] shrink-0 snap-start"
              >
                <HoverCard
                  to={`/exams/${exam.slug}`}
                  className={`relative overflow-hidden rounded-2xl p-5 flex flex-col h-full group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md min-h-[140px] border ${cardColorClass}`}
                >
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/60 rounded-full blur-xl group-hover:bg-white/80 transition-colors duration-500" />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/40 rounded-full blur-md" />
                  <div className="relative z-10 flex-1 flex flex-col justify-between">
                    <h3 className="font-bold text-lg leading-tight mb-3 group-hover:opacity-80 transition-opacity">{exam.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide bg-white/50 border border-white/40 shadow-sm backdrop-blur-sm">{exam._count?.pdfs || 0} PDFs</span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide bg-white/50 border border-white/40 shadow-sm backdrop-blur-sm">{exam._count?.quizzes || 0} Tests</span>
                    </div>
                  </div>
                </HoverCard>
              </motion.div>
            )}
            )}
          </div>
        </div>
      </section>

      {/* ── Trending Notes/PDFs ──────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="section-title text-left mb-1">Top Study Notes</h2>
              <p className="section-subtitle text-left mb-0">Download high-quality PDFs to boost your preparation</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/library" className="text-sm font-semibold text-primary-600 hover:text-primary-700 mr-2 md:mr-4 hidden sm:block">
                View Library
              </Link>
              <button onClick={() => scrollRef(pdfsRef, 'left')} className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm text-gray-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => scrollRef(pdfsRef, 'right')} className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm text-gray-600">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div ref={pdfsRef} className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 pt-2 bleed-both relative z-10 after:content-[''] after:w-4 after:shrink-0">
            <div className="bleed-spacer snap-start" />
            {(pdfs.length > 0 ? pdfs.slice(0, 8) : Array.from({ length: 8 }, (_, i) => ({
              id: `${i}`, title: 'Ancient History Complete Notes PDF', slug: 'ancient-history-notes',
              subject: { name: 'History' }, totalPages: 124, viewCount: 4520, language: 'ENGLISH'
            }))).map((pdf: any, i) => {
              const cardColorClass = softClasses[(i + 2) % softClasses.length];
              return (
              <motion.div
                key={pdf.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="w-[180px] sm:w-[200px] shrink-0 snap-start h-[320px]"
              >
                <HoverCard
                  to={`/read/${pdf.slug}`}
                  className={`relative overflow-hidden rounded-2xl flex flex-col h-full group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md border ${cardColorClass}`}
                >
                  {/* ── Cover Thumbnail Area ── */}
                  <div className="relative w-full h-[180px] flex-shrink-0 flex items-center justify-center bg-white/50 overflow-hidden">
                    {pdf.thumbnailUrl ? (
                      <img
                        src={resolvePublicUrl(pdf.thumbnailUrl)}
                        alt={pdf.title}
                        className="w-full h-full object-contain p-2 drop-shadow-md"
                        onError={(e) => {
                          const wrapper = (e.currentTarget as HTMLImageElement).parentElement!;
                          wrapper.innerHTML = `<div class="w-full h-full flex items-center justify-center opacity-25"><svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/><polyline points='10 9 9 9 8 9'/></svg></div>`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-25">
                        <FileText className="w-12 h-12" />
                      </div>
                    )}
                  </div>

                  {/* ── Card Body ── */}
                  <div className="flex flex-col flex-1 min-h-0 p-3 pt-2.5">
                    {/* Category + Icon */}
                    <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold tracking-wider uppercase opacity-70 truncate pr-1">{pdf.subject?.name || 'General'}</span>
                      <FileText className="w-3.5 h-3.5 opacity-40 flex-shrink-0" />
                    </div>

                    {/* Title — fixed 2-line height, never expands */}
                    <h3
                      className="font-semibold text-sm leading-snug group-hover:opacity-75 transition-opacity overflow-hidden flex-1"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >{pdf.title}</h3>

                    {/* Divider + Metadata — always pinned to bottom */}
                    <div className="border-t border-black/10 pt-2 mt-2 flex items-center justify-between text-[10px] font-medium opacity-70 flex-shrink-0">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> {pdf.viewCount ?? 0} Views</span>
                      <span className="flex items-center gap-1"><File className="w-3 h-3"/> {pdf.totalPages ?? '—'} Pages</span>
                    </div>
                  </div>
                </HoverCard>
              </motion.div>
            )})}
          </div>
        </div>
      </section>

      {/* ── Featured Quizzes ──────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="section-title text-left mb-1">Practice Quizzes</h2>
              <p className="section-subtitle text-left mb-0">Test your knowledge with daily quizzes and mock tests</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/quizzes" className="text-sm font-semibold text-primary-600 hover:text-primary-700 mr-2 md:mr-4 hidden sm:block">
                All Quizzes
              </Link>
              <button onClick={() => scrollRef(quizzesRef, 'left')} className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm text-gray-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => scrollRef(quizzesRef, 'right')} className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm text-gray-600">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div ref={quizzesRef} className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 pt-2 bleed-both relative z-10 after:content-[''] after:w-4 after:shrink-0">
            <div className="bleed-spacer snap-start" />
            {(quizzes.length > 0 ? quizzes.slice(0, 8) : Array.from({ length: 8 }, (_, i) => ({
              id: `${i}`, title: 'Quantitative Aptitude Mock Test 1', slug: 'quant-mock-1',
              subject: { name: 'Mathematics' }, durationMinutes: 60, _count: { quizQuestions: 50 }, type: 'MOCK_TEST'
            }))).map((quiz: any, i) => {
              const cardColorClass = softClasses[(i + 4) % softClasses.length];
              return (
              <motion.div
                key={quiz.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="w-[280px] sm:w-[320px] shrink-0 snap-start"
              >
                <HoverCard
                  to={`/quiz/${quiz.slug}`}
                  className={`relative overflow-hidden rounded-2xl p-5 flex flex-col h-full group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md border min-h-[160px] ${cardColorClass}`}
                >
                  <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl group-hover:scale-125 transition-transform duration-700" />
                  <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/40 rounded-full blur-md" />
                  <div className="relative z-10 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider bg-white/60 uppercase border border-white/50 shadow-sm backdrop-blur-sm">{quiz.subject?.name || 'General'}</span>
                        <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm group-hover:bg-black/5 transition-colors">
                          <BrainCircuit className="w-4 h-4 opacity-80" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-4 group-hover:opacity-80 transition-opacity">{quiz.title}</h3>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-black/10">
                      <div className="flex gap-3 opacity-80 text-xs font-medium">
                        <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5"/> {quiz._count?.quizQuestions || 0} Qs</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> {quiz.durationMinutes} Min</span>
                      </div>
                      <span className="bg-white/80 w-7 h-7 rounded-full flex items-center justify-center shadow-sm shrink-0 group-hover:bg-black/10 transition-colors">
                        <PlayCircle className="w-4 h-4 ml-0.5 opacity-80" />
                      </span>
                    </div>
                  </div>
                </HoverCard>
              </motion.div>
            )})}
          </div>
        </div>
      </section>


      {/* ── Features ──────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Why Open E Academy?</h2>
            <p className="section-subtitle">Everything you need to crack your exam in one platform</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="card p-6 group hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">How It Works</h2>
            <p className="text-primary-200 mt-2">Get started in minutes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">{step.step}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-primary-200 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Subscription Plans ─────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Layout */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 tracking-tight">Simple, transparent pricing</h2>
              <p className="text-xl text-gray-500">No contracts. No surprise fees.</p>
            </div>
            {/* Toggle */}
            <div className="mt-8 md:mt-0 bg-gray-50 border border-gray-100 p-1.5 rounded-full flex items-center shadow-sm">
              <button className="bg-primary-600 text-white px-8 py-2.5 rounded-full text-sm font-semibold shadow-md transition-colors">Monthly</button>
              <button className="text-gray-500 hover:text-gray-900 px-8 py-2.5 rounded-full text-sm font-semibold transition-colors">Yearly</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center max-w-[1200px] mx-auto">
            {(plans.length > 0 ? plans.slice(0, 4) : [
              { id: '1', name: 'Intro', price: 19, description: 'For most businesses that want to optimize web queries', features: ['All limited links', 'Own analytics platform', 'Chat support', 'Optimize hashtags', 'Unlimited users'], isFeatured: false },
              { id: '2', name: 'Base', price: 39, description: 'For most businesses that want to optimize web queries', features: ['All limited links', 'Own analytics platform', 'Chat support', 'Optimize hashtags', 'Unlimited users'], isFeatured: false },
              { id: '3', name: 'Popular', price: 99, description: 'For most businesses that want to optimize web queries', features: ['All limited links', 'Own analytics platform', 'Chat support', 'Optimize hashtags', 'Unlimited users'], isFeatured: true },
              { id: '4', name: 'Enterprise', price: 199, description: 'For most businesses that want to optimize web queries', features: ['All limited links', 'Own analytics platform', 'Chat support', 'Optimize hashtags', 'Unlimited users'], isFeatured: false },
            ] as any[]).map((plan, i) => {
              const isPopular = plan.isFeatured;
              const isEnterprise = i === 3;
              
              return (
              <motion.div
                key={plan.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`relative rounded-[2rem] p-8 flex flex-col h-full ${isPopular ? 'bg-primary-600 text-white shadow-2xl scale-105 z-10 py-10 shadow-primary-500/20' : 'bg-white text-gray-900 border border-gray-100 shadow-sm hover:shadow-md'}`}
              >
                <h3 className={`text-xl font-medium mb-4 ${isPopular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                
                <div className="flex items-end gap-1 mb-6">
                  <span className={`text-5xl font-semibold tracking-tight ${isPopular ? 'text-white' : 'text-gray-900'}`}>₹{plan.discountedPrice || plan.price}</span>
                  <span className={`text-sm mb-1 ${isPopular ? 'text-primary-100' : 'text-gray-400'}`}>/ Month</span>
                </div>

                <p className={`text-sm leading-relaxed mb-8 pr-4 ${isPopular ? 'text-primary-100' : 'text-gray-500'}`}>
                  {plan.description || 'For most students that want to optimize their preparation.'}
                </p>

                <ul className="space-y-4 mb-10 flex-grow">
                  {(plan.features as string[]).map(f => {
                    // Format ALL_CAPS or snake_case to readable text (e.g., ALL_PDFS -> All pdfs)
                    const formattedF = f.charAt(0).toUpperCase() + f.slice(1).replace(/_/g, ' ').toLowerCase();
                    return (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-white/20' : 'bg-primary-50'}`}>
                        <Check className={`w-3 h-3 ${isPopular ? 'text-white' : 'text-primary-600'}`} strokeWidth={3} />
                      </div>
                      <span className={isPopular ? 'text-primary-50' : 'text-gray-600'}>{formattedF}</span>
                    </li>
                  )})}
                </ul>

                <Link
                  to="/register"
                  className={`block w-full text-center py-3.5 rounded-xl font-medium transition-all mt-auto ${
                    isPopular 
                      ? 'bg-white text-primary-600 hover:bg-primary-50 shadow-md font-semibold' 
                      : isEnterprise 
                        ? 'bg-primary-600 text-white hover:bg-primary-700 font-semibold'
                        : 'bg-white text-primary-600 border-2 border-gray-100 hover:border-primary-600 hover:bg-primary-50/50'
                  }`}
                >
                  Choose Plan
                </Link>
              </motion.div>
            )})}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Success Stories</h2>
            <p className="section-subtitle">Join thousands of students who cracked their dream job</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="card p-6"
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-bold text-sm">{t.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.exam} · {t.city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={faq.q}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="card p-6"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-500">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-extrabold text-white mb-4"
          >
            Ready to Start Your Journey?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-primary-200 text-lg mb-8"
          >
            Join 2,50,000+ students. Start with free preview. No credit card required.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link to="/register" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors text-base">
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/exams" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary-700 text-white font-semibold rounded-xl hover:bg-primary-800 transition-colors text-base">
              <Play className="w-5 h-5" /> Browse Exams
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

'use client'

import Link from 'next/link'
import { PWAInstallButton } from '@/components/PWAInstallButton'
import { motion } from 'framer-motion'
import { 
  Users, 
  Calendar, 
  CreditCard, 
  FileText, 
  Shield, 
  BarChart3, 
  ArrowRight,
  CheckCircle2,
  School,
  Sparkles,
  Star,
  Building2,
  Zap,
  TrendingUp,
  MessageSquare,
  Award
} from 'lucide-react'
import './landing.css'

export default function LandingPage() {
  return (
    <div className="lp-container">
      {/* Navbar */}
      <nav className="navbar">
        <Link href="/" className="logo">
          <School size={32} />
          <span>School<span style={{ color: '#0f172a' }}>ERP</span></span>
        </Link>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#testimonials" className="nav-link">Pilot Stories</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="#pilot" className="nav-link">Pilot Program</a>
          <PWAInstallButton />
          <Link href="/login" className="btn btn-secondary">Login</Link>
          <Link href="/login?signup=true" className="btn btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f5f3ff', color: '#4f46e5', padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2rem' }}>
            <Sparkles size={16} />
            The Autonomous Multi-Tenant School ERP
          </div>
          <h1>The Complete Operating System for <span>Modern Schools</span></h1>
          <p>
            Automate attendance, exams, fees, and multi-channel parent alerts in one unified platform. Powered by Gemini AI, offline-first PWA sync, and multi-tenant security.
          </p>
          <div className="hero-btns">
            <Link href="/login" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
              Start 30-Day Free Pilot <ArrowRight size={20} />
            </Link>
            <Link href="#testimonials" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
              View Case Studies
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Real Impact Metrics Bar */}
      <div className="metrics-bar">
        <div className="metric-item">
          <div className="metric-value">99.4%</div>
          <div className="metric-label">Daily Attendance Accuracy</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">3.2x</div>
          <div className="metric-label">Faster Fee Recovery</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">15+ hrs</div>
          <div className="metric-label">Admin Time Saved Weekly</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">100%</div>
          <div className="metric-label">Data Isolation &amp; White-Label</div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="section-header">
          <h2 style={{ color: '#0f172a' }}>Everything your school needs to excel</h2>
          <p style={{ color: '#64748b', maxWidth: 600, margin: '0 auto' }}>
            Purpose-built modules that eliminate administrative friction so educators can focus on teaching.
          </p>
        </div>
        
        <div className="feature-grid">
          <FeatureCard 
            icon={<Users />}
            title="Student &amp; Batch Management"
            description="Manage full student records with automated Excel/CSV bulk import, roll numbers, and parent accounts."
          />
          <FeatureCard 
            icon={<Calendar />}
            title="Offline-Ready Smart Attendance"
            description="Mark attendance seamlessly even with spotty Wi-Fi via Dexie PWA sync. Auto-triggers WhatsApp alerts for absentees."
          />
          <FeatureCard 
            icon={<CreditCard />}
            title="Automated Fee Collection"
            description="Generate bulk monthly fee slips, track cash/online receipts, and send automated fee reminders."
          />
          <FeatureCard 
            icon={<FileText />}
            title="Exams &amp; PDF Report Cards"
            description="Schedule exams, record subject marks, calculate ranks, and generate 1-click professional PDF report cards."
          />
          <FeatureCard 
            icon={<Zap />}
            title="Autonomous AI Operations Agent"
            description="Conversational bilingual AI (English &amp; Urdu) that marks attendance, creates vouchers, and generates analytics on command."
          />
          <FeatureCard 
            icon={<Shield />}
            title="Multi-Tenant Enterprise Security"
            description="High-security database isolation with dedicated role-based portals for Principals, Teachers, and Parents."
          />
        </div>
      </section>

      {/* Pilot School Case Studies & Testimonials */}
      <section id="testimonials" className="testimonials">
        <div className="section-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4f46e5', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            <Award size={18} /> Verified Pilot Deployments
          </div>
          <h2 style={{ color: '#0f172a' }}>Trusted by Leading School Networks</h2>
          <p style={{ color: '#64748b', maxWidth: 620, margin: '0 auto' }}>
            See how early pilot schools transformed their operational efficiency and fee recovery rates within 30 days.
          </p>
        </div>

        <div className="testimonial-grid">
          <TestimonialCard
            metric="94% Fee Recovery Rate"
            quote="Before this ERP, tracking pending tuition fees was a manual nightmare. With the automated WhatsApp reminders and instant receipts, our fee recovery reached 94% in the very first month."
            author="M. Ashraf Khan"
            role="Principal"
            school="Crescent Horizon Model High School"
            initials="CH"
          />

          <TestimonialCard
            metric="15+ Hours Saved Weekly"
            quote="The AI Operations Agent is like having an extra administrator on staff. I can ask in Urdu or English to check fee dues or send attendance alerts, and it executes immediately."
            author="Dr. Sarah Jenkins"
            role="Academic Director"
            school="Oakwood International Academy"
            initials="OA"
          />

          <TestimonialCard
            metric="Zero Data Loss During Outages"
            quote="Our internet connectivity is sometimes unstable. The offline PWA sync enables teachers to record attendance and exams without pauses, automatically syncing when reconnected."
            author="Farhan Siddiqui"
            role="Head of IT &amp; Academics"
            school="Apex Grammar High School"
            initials="AG"
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="section-header">
          <h2>Simple, Transparent Pricing</h2>
          <p>Flexible plans scaled to your school's student enrollment.</p>
        </div>

        <div className="pricing-grid">
          <PricingCard 
            title="Free"
            price="0"
            description="Core operations for small learning centers."
            features={["Up to 50 Students", "Daily Attendance Tracking", "Basic Fees Module", "Community Support"]}
          />
          <PricingCard 
            title="Basic"
            price="49"
            description="Full-featured management for growing schools."
            features={["Up to 200 Students", "Exams & PDF Report Cards", "Twilio WhatsApp/SMS Alerts", "Dedicated Parent Portal", "Holiday & Leave Management"]}
          />
          <PricingCard 
            title="Pro"
            price="99"
            featured={true}
            description="Autonomous AI & unlimited capacity for top institutions."
            features={["Unlimited Students", "Autonomous AI Operations Agent", "Priority Stripe Billing", "Executive Analytics", "Dedicated Account Manager"]}
          />
        </div>
      </section>

      {/* Pilot Program Invitation Banner */}
      <section id="pilot" style={{ padding: '0 5%' }}>
        <div className="pilot-cta">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '6px 16px', borderRadius: 100, fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            <Sparkles size={16} /> Exclusive 30-Day Institutional Pilot
          </div>
          <h2>Transform Your School Management Today</h2>
          <p>
            Experience the complete Pro tier for 30 days with zero upfront commitment. We provide free student data migration and dedicated 1-on-1 staff onboarding.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" className="btn btn-primary" style={{ background: 'white', color: '#1e1b4b', padding: '1rem 2.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
              Apply for Pilot Program <ArrowRight size={18} />
            </Link>
            <a href="mailto:pilot@schoolerp.com" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)', padding: '1rem 2rem' }}>
              Schedule Walkthrough
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div style={{ marginBottom: '2rem' }}>
          <School size={40} style={{ color: '#4f46e5', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 700, fontSize: '1.25rem', color: '#0f172a', margin: 0 }}>School Management ERP</p>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>The Next-Generation Operating System for Educational Institutions</p>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>© {new Date().getFullYear()} School Management ERP. All rights reserved.</p>
        </div>
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', fontSize: '0.875rem' }}>
          <Link href="/login" className="nav-link">Parent Portal</Link>
          <Link href="/login" className="nav-link">Teacher Portal</Link>
          <Link href="/login" className="nav-link">Admin Login</Link>
          <a href="#pilot" className="nav-link">Pilot Program</a>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      className="feature-card"
      whileHover={{ y: -8 }}
    >
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </motion.div>
  )
}

function TestimonialCard({
  metric,
  quote,
  author,
  role,
  school,
  initials
}: {
  metric: string
  quote: string
  author: string
  role: string
  school: string
  initials: string
}) {
  return (
    <div className="testimonial-card">
      <div>
        <div className="testimonial-badge">
          <TrendingUp size={14} /> {metric}
        </div>
        <div style={{ display: 'flex', gap: 4, color: '#f59e0b', marginBottom: '1rem' }}>
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={16} fill="#f59e0b" />
          ))}
        </div>
        <p className="testimonial-quote">"{quote}"</p>
      </div>

      <div className="testimonial-author">
        <div className="author-avatar">{initials}</div>
        <div className="author-info">
          <h4>{author}</h4>
          <p>{role}, {school}</p>
        </div>
      </div>
    </div>
  )
}

function PricingCard({ title, price, description, features, featured = false }: { title: string, price: string, description: string, features: string[], featured?: boolean }) {
  return (
    <div className={`pricing-card ${featured ? 'featured' : ''}`}>
      <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{title}</h3>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>{description}</p>
      <div className="price">${price}<span>/month</span></div>
      <ul className="pricing-features">
        {features.map((f, i) => (
          <li key={i}><CheckCircle2 size={18} style={{ color: '#10b981' }} /> {f}</li>
        ))}
      </ul>
      <Link href="/login" className={`btn ${featured ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'center' }}>
        Get Started
      </Link>
    </div>
  )
}

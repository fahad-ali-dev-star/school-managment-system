
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
  Sparkles
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
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="#about" className="nav-link">About</a>
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
            The Future of School Management is Here
          </div>
          <h1>The Complete Operating System for <span>Modern Schools</span></h1>
          <p>
            Manage attendance, exams, fees, and communication in one unified platform. Built for principals, teachers, and parents who value excellence.
          </p>
          <div className="hero-btns">
            <Link href="/login" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
              Start Your Free Trial <ArrowRight size={20} />
            </Link>
            <Link href="#features" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
              Watch Demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="section-header">
          <h2 style={{ color: '#0f172a' }}>Everything your school needs</h2>
          <p style={{ color: '#64748b', maxWidth: 600, margin: '0 auto' }}> Powerful tools to help you focus on what matters most: educating the next generation.</p>
        </div>
        
        <div className="feature-grid">
          <FeatureCard 
            icon={<Users />}
            title="Student Management"
            description="Track student profiles, records, and academic progress with ease."
          />
          <FeatureCard 
            icon={<Calendar />}
            title="Smart Attendance"
            description="Real-time attendance tracking with automated SMS/Push alerts to parents."
          />
          <FeatureCard 
            icon={<CreditCard />}
            title="Fee Automation"
            description="Generate invoices, track payments, and send automatic reminders for pending dues."
          />
          <FeatureCard 
            icon={<FileText />}
            title="Exam & Report Cards"
            description="Create custom exams and generate professional report cards in seconds."
          />
          <FeatureCard 
            icon={<Shield />}
            title="Multi-Tenant Security"
            description="Enterprise-grade RLS isolation ensuring your school's data stays yours."
          />
          <FeatureCard 
            icon={<BarChart3 />}
            title="Real-time Analytics"
            description="Get deep insights into school performance and financial health."
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="section-header">
          <h2>Simple, Transparent Pricing</h2>
          <p>Choose the plan that fits your school's scale.</p>
        </div>

        <div className="pricing-grid">
          <PricingCard 
            title="Basic"
            price="49"
            description="Perfect for small schools starting their digital journey."
            features={["Up to 200 Students", "Attendance Tracking", "Basic Fees Module", "Email Support"]}
          />
          <PricingCard 
            title="Professional"
            price="99"
            featured={true}
            description="Advanced tools for growing institutions."
            features={["Unlimited Students", "Smart Attendance + Alerts", "Full Fees & Invoicing", "Exam Management", "Priority Support"]}
          />
          <PricingCard 
            title="Enterprise"
            price="199"
            description="Custom solutions for large school networks."
            features={["Multiple Campuses", "Custom Integrations", "Advanced Analytics", "Dedicated Manager", "White-labeling"]}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div style={{ marginBottom: '2rem' }}>
          <School size={40} style={{ color: '#4f46e5', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 700, fontSize: '1.25rem', color: '#0f172a' }}>SchoolERP</p>
          <p>© {new Date().getFullYear()} Beacon Light Grammar School. All rights reserved.</p>
        </div>
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', fontSize: '0.875rem' }}>
          <a href="#" className="nav-link">Privacy Policy</a>
          <a href="#" className="nav-link">Terms of Service</a>
          <a href="#" className="nav-link">Contact</a>
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

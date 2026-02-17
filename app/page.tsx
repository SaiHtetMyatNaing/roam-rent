import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Clock, Sparkles, Star } from 'lucide-react';

/**
 * FeatureCard Component
 */
const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="flex items-center p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300 w-full max-w-md">
    <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg text-blue-600 mr-4">
      <Icon size={24} strokeWidth={2} />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed mt-1">{description}</p>
    </div>
  </div>
);

/**
 * StatItem Component
 */
const StatItem = ({ value, label, showStar }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-1.5">
      <span className="text-3xl font-extrabold text-slate-900 leading-tight">{value}</span>
      {showStar && <Star size={20} className="fill-slate-900 text-slate-900" />}
    </div>
    <span className="text-sm text-slate-500 font-medium mt-1">{label}</span>
  </div>
);

export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      <main className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Hero Content */}
          <div className="space-y-10">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.05]">
                Rent Your Perfect Car<br className="sm:hidden" />
                <span className="text-blue-600"> Anywhere, Anytime.</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 max-w-xl leading-relaxed">
                Premium vehicles, instant booking, unbeatable prices — drive with confidence.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link href="/vehicles">
                <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 rounded-lg font-semibold transition-all transform active:scale-95 shadow-md shadow-blue-200/30">
                  Browse Vehicles
                  <ArrowRight size={18} />
                </button>
              </Link>

              <Link href="/register">
                <button className="flex items-center justify-center border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-7 py-3.5 rounded-lg font-semibold transition-all transform active:scale-95">
                  Create Free Account
                </button>
              </Link>
            </div>

            {/* Stats Section */}
            <div className="flex flex-wrap gap-10 sm:gap-12 pt-6">
              <StatItem value="50K+" label="Happy Drivers" />
              <StatItem value="4.9" label="Average Rating" showStar />
              <StatItem value="200+" label="Cities Worldwide" />
            </div>
          </div>

          {/* Right Column: Feature Cards */}
          <div className="flex flex-col gap-5 lg:items-end">
            <FeatureCard 
              icon={ShieldCheck} 
              title="Fully Insured" 
              description="Every rental includes comprehensive coverage" 
            />
            <FeatureCard 
              icon={Clock} 
              title="24/7 Support" 
              description="Help whenever you need it" 
            />
            <FeatureCard 
              icon={Sparkles} 
              title="Premium Fleet" 
              description="Luxury & economy vehicles ready to go" 
            />
          </div>

        </div>
      </main>
    </div>
  );
}
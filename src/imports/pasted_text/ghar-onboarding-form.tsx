This React implementation uses Tailwind CSS, Lucide-React for icons, and handles the Resend OTP flow alongside the extensive profile data from your images. It utilizes a "friendly" BodyOS Light aesthetic with soft shadows and rounded corners.

The Technical Setup
API: Resend (via a Supabase Edge Function or Vercel route).

Verification: Domain ghar@knowwhatson.com.

Data: Comprehensive Country/State logic.

Step 1: The Multi-Step Form Logic
JavaScript

import React, { useState } from 'react';
import { ChevronRight, Mail, MapPin, GraduationCap, User, Phone, Globe } from 'lucide-react';

const GHAROnboarding = () => {
  const [step, setStep] = useState(1); // 1: Email/OTP, 2: Personal, 3: Location, 4: Academic
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '', otp: '', firstName: '', lastName: '', dob: '', phone: '',
    citizenship: '', homeState: '', auState: 'NSW',
    university: '', course: '', gradYear: '2027'
  });

  const nextStep = () => setStep(step + 1);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-inter flex flex-col items-center p-6">
      {/* Header */}
      <div className="w-full max-w-md flex flex-col items-center mb-12 mt-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">G.H.A.R.</h1>
        <p className="text-[10px] tracking-[0.2em] text-blue-800 font-light uppercase">
          Endorsed by the High Commission of India
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-50/50 rounded-3xl p-8 border border-slate-100 shadow-sm">
        
        {/* Step 1: Secure Email Verification */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Verify your status</h2>
              <p className="text-sm text-slate-500 font-light">Enter your university email to receive a secure code from ghar@knowwhatson.com</p>
            </div>
            <div className="relative">
              <input 
                type="email" 
                placeholder="student@unsw.edu.au"
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <button 
              onClick={nextStep}
              className="w-full py-4 bg-blue-700 text-white rounded-2xl font-semibold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/10"
            >
              Send Secure Code
            </button>
          </div>
        )}

        {/* Step 2: Personal Information */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User size={20} className="text-orange-500" /> Personal Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                <input className="w-full p-3 bg-white border border-slate-200 rounded-xl" placeholder="Rushi" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                <input className="w-full p-3 bg-white border border-slate-200 rounded-xl" placeholder="Vyas" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">Date of Birth</label>
              <input type="date" className="w-full p-3 bg-white border border-slate-200 rounded-xl" />
            </div>
            <button onClick={nextStep} className="w-full py-4 bg-blue-700 text-white rounded-2xl font-semibold">
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Location Information */}
        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Globe size={20} className="text-orange-500" /> Location Information
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">Citizenship</label>
                <select className="w-full p-3 bg-white border border-slate-200 rounded-xl appearance-none">
                  <option>India</option>
                  <option>Australia</option>
                  <option>Nepal</option>
                  {/* Map over full country list here */}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">AU State</label>
                  <select className="w-full p-3 bg-white border border-slate-200 rounded-xl">
                    <option>NSW</option>
                    <option>VIC</option>
                    <option>QLD</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">Home State</label>
                  <input className="w-full p-3 bg-white border border-slate-200 rounded-xl" placeholder="Gujarat" />
                </div>
              </div>
            </div>
            <button onClick={nextStep} className="w-full py-4 bg-blue-700 text-white rounded-2xl font-semibold">
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Academic Information */}
        {step === 4 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <GraduationCap size={20} className="text-orange-500" /> Academic Details
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">University</label>
                <input className="w-full p-3 bg-white border border-slate-200 rounded-xl" placeholder="University of New South Wales" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">Course Name</label>
                <input className="w-full p-3 bg-white border border-slate-200 rounded-xl" placeholder="MComm Ext." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">Graduation Year</label>
                <select className="w-full p-3 bg-white border border-slate-200 rounded-xl">
                  <option>2026</option>
                  <option>2027</option>
                  <option>2028</option>
                </select>
              </div>
            </div>
            <button className="w-full py-4 bg-orange-500 text-white rounded-2xl font-semibold shadow-lg shadow-orange-500/20">
              Complete Profile
            </button>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="flex gap-2 mt-8">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className={`h-1.5 w-8 rounded-full transition-all duration-300 ${step >= i ? 'bg-orange-500' : 'bg-slate-200'}`} 
          />
        ))}
      </div>
    </div>
  );
};

export default GHAROnboarding;
The "Behind-the-Scenes" Logic
Resend API: When Send Secure Code is clicked, a call is made to your backend. It uses the Resend SDK to email a 6-digit OTP.

System Hint: Keep the OTP in a Supabase table with a 5-minute expiry.

State/Country Dropdowns: For the final build, I recommend importing country-state-city via npm. It will dynamically populate the Home State dropdown only after the user selects their Citizenship country.

Address Search: On the next screen (the Dashboard), you'll use a useAddressSearch hook that calls Nominatim.
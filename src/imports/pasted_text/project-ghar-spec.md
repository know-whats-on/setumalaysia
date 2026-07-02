PROJECT GHAR: Genuine Housing Alerts & Ratings
Master Technical Specification & Implementation Prompt

1. EXECUTIVE SUMMARY & AESTHETIC
Product: A high-authority PWA (Progressive Web App) for Indian international students in Australia to manage rental safety, report scams, and prepare legal evidence.

Visual Identity (BodyOS Light): * Palette: Pure White (#FFFFFF), Ghost White (#F8FAFC), Saffron (#EE811A), Crimson (#B91C1C), Navy (#1E40AF).

Typography (Inter Family): * Stats/Confidence: Inter Thin (100).

Body: Inter Light (300).

Logo/Headers: Inter Bold (700).

Labels: Uppercase, 0.18em letter-spacing, Inter Light.

Vibe: Minimalist, editorial, premium. Zero generic "AI" illustrations. Use sharp lines, generous whitespace, and high-contrast text.

2. SYSTEM ARCHITECTURE (SUPABASE)
Initialize the following schema in the SQL Editor:

SQL

-- Profiles: Restricted to .edu.au domain
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  uni_email text unique check (uni_email like '%.edu.au'),
  postcode text,
  is_verified boolean default false,
  created_at timestamp with time zone default now()
);

-- The Core Listings Engine
create table listings (
  id uuid default uuid_generate_v4() primary key,
  listing_id_public text unique, -- Format: GHAR-2026-XXXX
  address text not null,
  postcode text not null,
  lat_long geography(POINT),
  category text check (category in ('scam', 'maintenance', 'legal', 'vibe')),
  status text default 'unresolved' check (status IN ('unresolved', 'resolved', 'contested')),
  confidence_score int default 0, -- Display in Inter Thin (100)
  ai_trajectory_json jsonb, -- Stores the chat logic/evidence
  reported_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

-- Official Bulletins (High Commission Only)
create table bulletins (
  id uuid primary key,
  title text,
  body text,
  postcode_target text,
  is_urgent boolean default false,
  created_at timestamp with time zone default now()
);
3. AI TRIAGE & VOICE (CLAUDE + ELEVENLABS)
The Guardian Agent (System Prompt)
"You are the GHAR Guardian. Your persona is a professional, Indian-accented relocation expert.

Instructions:

Analyze Trajectory: When a student reports an issue, analyze the 'trajectory' of their conversation with the landlord.

Legal Context: Apply 2026 standards (e.g., SA Form A1 mandates, VIC Fixed-Heater standards, NSW 90-day rent increase notices).

Triage Questions: If confidence is low, ask: 'Did they ask for a bond via crypto or gift card?' or 'Is the person on the lease the same as the one you messaged?'

Output: Provide a structured JSON for the database and a 'Case Brief' for legal consults."

Voice Integration
Provider: ElevenLabs API.

Voice: 'Raju' (Indian English).

Logic: Every AI response in the Triage Flow must be converted to audio with low-latency streaming for an authoritative "Embassy" feel.

4. THE USER FLOW & SCREENS
A. Onboarding (The Gatekeeper)
Screen 1: Minimal splash. Logo "GHAR" in Inter Bold (700).

Screen 2: "Verify your Identity." Input field restricted to .edu.au.

Screen 3: "Secure your Suburb." User enters postcode to initialize local safety alerts.

B. The Dashboard (Map-First)
Interface: Full-bleed monochrome map (Leaflet.js).

Pins: * Crimson (#B91C1C): Active Scam/Critical Alert.

Orange: Contested (Landlord has filed a rebuttal).

Saffron (#EE811A): Positive Community Vibes/Life-Hacks.

Action: Large "+" button in Inter Bold.

C. The Triage Center (Action)
Interface: A chat-first experience.

Components: * Waveform visualizer for AI voice output.

"Evidence Box" for uploading screenshots of WhatsApp/Zillow conversations.

Confidence Gauge (Inter Thin 100) that updates in real-time as the student provides more info.

D. The Legal Bridge
Component: "Generate Incident PDF."

Function: Packages timestamps, GPS coordinates of the property, AI transcription, and images into a court-ready PDF.

Monetization: "Book 15-min Partner Consult" (Redirect to Law Firm API).

5. PWA & NOTIFICATION SPECS
VAPID Push Notifications
Trigger: New entry in listings where category = 'scam' and postcode = user_postcode.

Tone: Community-focused. "Fellow student in [Subrub] flagged a potential risk. Check on the community thread."

Offline Mode
Cache the "2026 Renter Rights Checklist" and the last 10 local bulletins.

Allow "Draft Flags" to be saved locally if an inspection is in a basement with no reception.

6. FOLDER STRUCTURE (Vite/React)
Plaintext

/src
  /components
    /ui             <-- Minimal Inter-based components
    /map            <-- Leaflet integration
    /ai             <-- ElevenLabs & Claude hooks
  /features
    /triage         <-- Logic for automated reporting
    /legal          <-- PDF generation & Law firm bridge
  /services
    supabase.ts
    elevenlabs.ts
    vapid.ts
  /pages
    Dashboard.tsx
    Noticeboard.tsx <-- HC Official Bulletins
    Vault.tsx       <-- User's saved evidence
Final Instruction for the Builder AI:
"Build the Dashboard first. Ensure the map is the primary focus and the Inter Thin typography for the confidence score is prominent. Do not use generic icons; use sharp, geometric shapes. Ensure the 'Seal of Authority' for High Commission bulletins looks official (Navy/Gold accent)."
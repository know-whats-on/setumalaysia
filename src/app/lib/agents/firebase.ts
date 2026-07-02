import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
};

let agentsFirebaseApp: FirebaseApp | null = null;
let agentsAuth: Auth | null = null;

export function isAgentsFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey
      && firebaseConfig.authDomain
      && firebaseConfig.projectId
      && firebaseConfig.appId,
  );
}

export function getAgentsFirebaseProjectId() {
  return firebaseConfig.projectId;
}

export function getAgentsFirebaseApp() {
  if (!isAgentsFirebaseConfigured()) return null;
  if (agentsFirebaseApp) return agentsFirebaseApp;
  agentsFirebaseApp = getApps().find((app) => app.name === 'hoodie-for-agents')
    || initializeApp(firebaseConfig, 'hoodie-for-agents');
  return agentsFirebaseApp;
}

export function getAgentsAuth() {
  if (agentsAuth) return agentsAuth;
  const app = getAgentsFirebaseApp();
  if (!app) return null;
  agentsAuth = getAuth(app);
  void setPersistence(agentsAuth, browserLocalPersistence).catch(() => undefined);
  return agentsAuth;
}

export function subscribeAgentsAuth(callback: (user: User | null) => void) {
  const auth = getAgentsAuth();
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}

export function signInAgentWithPassword(email: string, password: string) {
  const auth = getAgentsAuth();
  if (!auth) throw new Error('Firebase Auth is not configured for Hoodie for Agents.');
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

export async function sendAgentEmailLink(email: string) {
  const auth = getAgentsAuth();
  if (!auth) throw new Error('Firebase Auth is not configured for Hoodie for Agents.');
  const cleanEmail = email.trim().toLowerCase();
  await sendSignInLinkToEmail(auth, cleanEmail, {
    url: `${window.location.origin}/agents`,
    handleCodeInApp: true,
  });
  window.localStorage.setItem('hoodie_agents_email_link_email', cleanEmail);
}

export async function completeAgentEmailLinkIfPresent() {
  const auth = getAgentsAuth();
  if (!auth || !isSignInWithEmailLink(auth, window.location.href)) return null;
  const email = window.localStorage.getItem('hoodie_agents_email_link_email') || window.prompt('Confirm your email');
  if (!email) return null;
  const result = await signInWithEmailLink(auth, email.trim().toLowerCase(), window.location.href);
  window.localStorage.removeItem('hoodie_agents_email_link_email');
  window.history.replaceState({}, document.title, '/agents');
  return result.user;
}

export async function getAgentFirebaseToken(user: User | null) {
  if (!user) return '';
  return user.getIdToken();
}

export async function signOutAgent() {
  const auth = getAgentsAuth();
  if (!auth) return;
  await signOut(auth);
}

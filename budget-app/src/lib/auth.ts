import { supabase } from './supabase';

export function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
}

export function getSession() {
  return supabase.auth.getSession();
}

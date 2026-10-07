import { supabase } from '../lib/supabase';

// user sign up
export async function signUpWithEmail(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  if (error) throw error;
  return data;
}

// sign user in
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// sign user out
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
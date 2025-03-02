import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Please click the "Connect to Supabase" button in the top right to set up your Supabase project.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return { error: authError };
  }

  if (authData.user) {
    const { error: profileError } = await supabase
      .from('teachers')
      .insert([{ id: authData.user.id, email, full_name: fullName }]);

    if (profileError) {
      return { error: profileError };
    }
  }

  return { data: authData, error: null };
}

export async function signOut() {
  return await supabase.auth.signOut();
}
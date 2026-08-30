import { createClient } from '@supabase/supabase-js';
import { getWriterSessionToken } from './writerSessionToken';

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

  let finalError: Error | typeof error = error;
  if (!error && data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.role === 'teacher') {
      const { data: membership } = await supabase
        .from('class_memberships')
        .select('class_id')
        .eq('user_id', data.user.id)
        .limit(1)
        .maybeSingle();

      if (membership?.class_id) {
        const { data: lockResult, error: lockError } = await supabase.rpc(
          'acquire_class_write_session',
          {
            requested_class_id: membership.class_id,
            requested_session_token: getWriterSessionToken(),
          }
        );
        if (lockError || !lockResult?.[0]?.acquired) {
          const holder = lockResult?.[0]?.holder_name;
          finalError = new Error(
            holder
              ? `هذه الشعبة مستخدمة الآن بواسطة ${holder}. يرجى المحاولة بعد انتهاء الجلسة.`
              : 'هذه الشعبة مستخدمة الآن في جلسة أخرى. يرجى المحاولة لاحقاً.'
          );
          await supabase.auth.signOut();
        }
      }
    }
  }

  await supabase.rpc('log_auth_activity', {
    requested_event: 'login',
    requested_success: !finalError,
    requested_reason: finalError?.message || null,
    requested_email: email,
  });
  return { data, error: finalError };
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError) {
    return { error: authError };
  }

  return { data: authData, error: null };
}

export async function signOut() {
  await supabase.rpc('log_auth_activity', {
    requested_event: 'logout',
    requested_success: true,
  });
  await supabase.rpc('release_all_class_write_sessions', {
    requested_session_token: getWriterSessionToken(),
  });
  return await supabase.auth.signOut();
}

import { supabase } from './supabase';
import { getWriterSessionToken } from './writerSessionToken';

export interface ClassWriteSessionResult {
  acquired: boolean;
  holderName: string | null;
  message: string | null;
}

export async function acquireClassWriteSession(
  classId: string
): Promise<ClassWriteSessionResult> {
  const { data, error } = await supabase.rpc('acquire_class_write_session', {
    requested_class_id: classId,
    requested_session_token: getWriterSessionToken(),
  });

  if (error) {
    return { acquired: false, holderName: null, message: error.message };
  }

  const result = data?.[0];
  if (!result?.acquired) {
    return {
      acquired: false,
      holderName: result?.holder_name || null,
      message: result?.holder_name
        ? `هذه الشعبة قيد التعديل الآن بواسطة ${result.holder_name}. يمكنك القراءة فقط حتى انتهاء الجلسة.`
        : 'هذه الشعبة قيد التعديل الآن في جلسة أخرى. يمكنك القراءة فقط.',
    };
  }
  return { acquired: true, holderName: result.holder_name || null, message: null };
}

export async function releaseClassWriteSession(classId: string) {
  await supabase.rpc('release_class_write_session', {
    requested_class_id: classId,
    requested_session_token: getWriterSessionToken(),
  });
}

export async function logAuthActivity(
  eventType: 'login' | 'logout',
  success = true,
  reason: string | null = null,
  email: string | null = null
) {
  await supabase.rpc('log_auth_activity', {
    requested_event: eventType,
    requested_success: success,
    requested_reason: reason,
    requested_email: email,
  });
}

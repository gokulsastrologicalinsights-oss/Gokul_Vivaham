import { supabase } from '@/lib/supabase';
import { serverLogger } from './server-logger';

export const activityLogger = {
  async log(action: string, userId: string | null, details: Record<string, any> = {}, ipAddress?: string) {
    try {
      // In production, log to supabase audit table
      // If supabase is not configured or in placeholder mode, log to server console
      if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
        serverLogger.info(`[AUDIT] Action: ${action} | User: ${userId || 'Anonymous'}`, { details, ipAddress });
        return;
      }

      const { error } = await supabase.from('activity_logs').insert({
        action,
        user_id: userId,
        ip_address: ipAddress || '127.0.0.1',
        activity_details: details,
      });

      if (error) {
        serverLogger.error('Failed to write audit activity log to database', error);
      }
    } catch (err) {
      serverLogger.error('Unexpected error writing audit activity log', err);
    }
  },
};

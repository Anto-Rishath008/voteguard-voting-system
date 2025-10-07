// Supabase-based authentication alternative
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  roles: string[];
  email_verified: boolean;
  failed_login_attempts: number;
  locked_until?: string;
}

export class SupabaseAuthService {
  public supabaseAdmin = supabaseAdmin;
  
  async getUserWithRolesByEmail(email: string): Promise<User | null> {
    try {
      // Get user
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        return null;
      }

      // Get user roles
      const { data: rolesData, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('role_name')
        .eq('user_id', userData.user_id);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return null;
      }

      const roles = rolesData?.map(r => r.role_name) || [];

      return {
        user_id: userData.user_id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        status: userData.status,
        roles,
        email_verified: userData.email_verified,
        failed_login_attempts: userData.failed_login_attempts || 0,
        locked_until: userData.locked_until
      };

    } catch (error) {
      console.error('Error in getUserWithRolesByEmail:', error);
      return null;
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('users')
        .update({ 
          last_login: new Date().toISOString(),
          failed_login_attempts: 0 
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    try {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('failed_login_attempts')
        .eq('user_id', userId)
        .single();

      const attempts = (user?.failed_login_attempts || 0) + 1;
      const locked_until = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await supabaseAdmin
        .from('users')
        .update({ 
          failed_login_attempts: attempts,
          locked_until 
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error incrementing failed login attempts:', error);
    }
  }

  async logSecurityEvent(event: {
    action: string;
    details: any;
    ip_address: string;
    user_agent: string;
    user_id?: string;
  }): Promise<void> {
    try {
      await supabaseAdmin
        .from('security_events')
        .insert([{
          event_type: 'FailedLogin',
          user_id: event.user_id || null,
          description: `${event.action}: ${JSON.stringify(event.details)}`,
          event_data: {
            ip_address: event.ip_address,
            user_agent: event.user_agent,
            ...event.details
          },
          severity_level: 'Medium',
          timestamp: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export const supabaseAuth = new SupabaseAuthService();
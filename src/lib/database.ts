// Import the real enhanced database for backward compatibility
import { getDatabase as getRealDatabase } from './enhanced-database';
import { supabaseAuth } from './supabase-auth';

// Export the real getDatabase function
export const getDatabase = getRealDatabase;

// Re-export EnhancedDatabase class for compatibility
export { EnhancedDatabase } from './enhanced-database';

// Functional DatabaseUtils with Supabase implementations
export class DatabaseUtils {
  static async checkUserRole(userId: string, role: string): Promise<boolean> {
    try {
      // Use Supabase to check user role
      const { data: roles, error } = await supabaseAuth.supabaseAdmin
        .from('user_roles')
        .select('role_name')
        .eq('user_id', userId)
        .in('role_name', ['Admin', 'SuperAdmin']);

      if (error) {
        console.error('Error checking user role:', error);
        return false;
      }

      return roles && roles.length > 0;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  static async createAuditLog(data: any): Promise<void> {
    try {
      await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .insert([{
          user_id: data.userId || null,
          operation_type: data.action || 'UNKNOWN',
          table_name: data.resourceType || null,
          record_id: data.resourceId || null,
          new_values: data.details || {},
          ip_address: data.ipAddress || null,
          user_agent: data.userAgent || null,
          timestamp: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  static async getUser(userId: string): Promise<any> {
    try {
      const { data: user, error } = await supabaseAuth.supabaseAdmin
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error getting user:', error);
        return null;
      }

      return user || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  static async updateUser(userId: string, data: any): Promise<any> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: updatedUser, error } = await supabaseAuth.supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return null;
      }

      return updatedUser || null;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  static async deleteUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAuth.supabaseAdmin
        .from('users')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
}

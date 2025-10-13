// Import the real enhanced database for backward compatibility// Import the real enhanced database

import { getDatabase as getRealDatabase } from './enhanced-database';import { getDatabase as getRealDatabase } from './enhanced-database';

import { supabaseAuth } from './supabase-auth';

// Export the real getDatabase function

// Export the real getDatabase functionexport const getDatabase = getRealDatabase;

export const getDatabase = getRealDatabase;

// Re-export EnhancedDatabase class for compatibility

// Re-export EnhancedDatabase class for compatibilityexport { EnhancedDatabase } from './enhanced-database';

export { EnhancedDatabase } from './enhanced-database';

// Functional DatabaseUtils with real implementations

// Functional DatabaseUtils with Supabase implementationsexport class DatabaseUtils {

export class DatabaseUtils {  static async checkUserRole(userId: string, role: string): Promise<boolean> {

  static async checkUserRole(userId: string, role: string): Promise<boolean> {    try {

    try {      const db = getRealDatabase();

      // Use Supabase to check user role      const result = await db.query(

      const { data: roles, error } = await supabaseAuth.supabaseAdmin        "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",

        .from('user_roles')        [userId]

        .select('role_name')      );

        .eq('user_id', userId)      return result.rows.length > 0;

        .in('role_name', ['Admin', 'SuperAdmin']);    } catch (error) {

      console.error('Error checking user role:', error);

      if (error) {      return false;

        console.error('Error checking user role:', error);    }

        return false;  }

      }

  static async createAuditLog(data: any): Promise<void> {

      return roles && roles.length > 0;    try {

    } catch (error) {      const db = getRealDatabase();

      console.error('Error checking user role:', error);      await db.query(

      return false;        `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent)

    }         VALUES ($1, $2, $3, $4, $5, $6, $7)`,

  }        [

          data.userId || null,

  static async createAuditLog(data: any): Promise<void> {          data.action || 'UNKNOWN',

    try {          data.resourceType || null,

      await supabaseAuth.supabaseAdmin          data.resourceId || null,

        .from('audit_log')          JSON.stringify(data.details || {}),

        .insert([{          data.ipAddress || null,

          user_id: data.userId || null,          data.userAgent || null

          operation_type: data.action || 'UNKNOWN',        ]

          table_name: data.resourceType || null,      );

          record_id: data.resourceId || null,    } catch (error) {

          new_values: data.details || {},      console.error('Error creating audit log:', error);

          ip_address: data.ipAddress || null,    }

          user_agent: data.userAgent || null,  }

          timestamp: new Date().toISOString()

        }]);  static async getUser(userId: string): Promise<any> {

    } catch (error) {    try {

      console.error('Error creating audit log:', error);      const db = getRealDatabase();

    }      const result = await db.query(

  }        "SELECT * FROM users WHERE user_id = $1",

        [userId]

  static async getUser(userId: string): Promise<any> {      );

    try {      return result.rows[0] || null;

      const { data: user, error } = await supabaseAuth.supabaseAdmin    } catch (error) {

        .from('users')      console.error('Error getting user:', error);

        .select('*')      return null;

        .eq('user_id', userId)    }

        .single();  }



      if (error) {  static async updateUser(userId: string, data: any): Promise<any> {

        console.error('Error getting user:', error);    try {

        return null;      const db = getRealDatabase();

      }      const fields = Object.keys(data);

      const values = Object.values(data);

      return user || null;      const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

    } catch (error) {      

      console.error('Error getting user:', error);      const result = await db.query(

      return null;        `UPDATE users SET ${setClause}, updated_at = NOW() WHERE user_id = $1 RETURNING *`,

    }        [userId, ...values]

  }      );

      return result.rows[0] || null;

  static async updateUser(userId: string, data: any): Promise<any> {    } catch (error) {

    try {      console.error('Error updating user:', error);

      const updateData = {      return null;

        ...data,    }

        updated_at: new Date().toISOString()  }

      };

  static async deleteUser(userId: string): Promise<boolean> {

      const { data: updatedUser, error } = await supabaseAuth.supabaseAdmin    try {

        .from('users')      const db = getRealDatabase();

        .update(updateData)      const result = await db.query(

        .eq('user_id', userId)        "DELETE FROM users WHERE user_id = $1",

        .select()        [userId]

        .single();      );

      return (result.rowCount || 0) > 0;

      if (error) {    } catch (error) {

        console.error('Error updating user:', error);      console.error('Error deleting user:', error);

        return null;      return false;

      }    }

  }

      return updatedUser || null;}
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

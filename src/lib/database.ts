// Import the real enhanced database for backward compatibility// Import the real enhanced database for backward compatibility// Import the real enhanced database

import { getDatabase as getRealDatabase } from './enhanced-database';

import { supabaseAuth } from './supabase-auth';import { getDatabase as getRealDatabase } from './enhanced-database';import { getDatabase as getRealDatabase } from './enhanced-database';



// Export the real getDatabase functionimport { supabaseAuth } from './supabase-auth';

export const getDatabase = getRealDatabase;

// Export the real getDatabase function

// Re-export EnhancedDatabase class for compatibility

export { EnhancedDatabase } from './enhanced-database';// Export the real getDatabase functionexport const getDatabase = getRealDatabase;



// Functional DatabaseUtils with Supabase implementationsexport const getDatabase = getRealDatabase;

export class DatabaseUtils {

  static async checkUserRole(userId: string, role: string): Promise<boolean> {// Re-export EnhancedDatabase class for compatibility

    try {

      // Use Supabase to check user role// Re-export EnhancedDatabase class for compatibilityexport { EnhancedDatabase } from './enhanced-database';

      const { data: roles, error } = await supabaseAuth.supabaseAdmin

        .from('user_roles')export { EnhancedDatabase } from './enhanced-database';

        .select('role_name')

        .eq('user_id', userId)// Functional DatabaseUtils with real implementations

        .in('role_name', ['Admin', 'SuperAdmin']);

// Functional DatabaseUtils with Supabase implementationsexport class DatabaseUtils {

      if (error) {

        console.error('Error checking user role:', error);export class DatabaseUtils {  static async checkUserRole(userId: string, role: string): Promise<boolean> {

        return false;

      }  static async checkUserRole(userId: string, role: string): Promise<boolean> {    try {



      return roles && roles.length > 0;    try {      const db = getRealDatabase();

    } catch (error) {

      console.error('Error checking user role:', error);      // Use Supabase to check user role      const result = await db.query(

      return false;

    }      const { data: roles, error } = await supabaseAuth.supabaseAdmin        "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",

  }

        .from('user_roles')        [userId]

  static async createAuditLog(data: any): Promise<void> {

    try {        .select('role_name')      );

      await supabaseAuth.supabaseAdmin

        .from('audit_log')        .eq('user_id', userId)      return result.rows.length > 0;

        .insert([{

          user_id: data.userId || null,        .in('role_name', ['Admin', 'SuperAdmin']);    } catch (error) {

          operation_type: data.action || 'UNKNOWN',

          table_name: data.resourceType || null,      console.error('Error checking user role:', error);

          record_id: data.resourceId || null,

          new_values: data.details || {},      if (error) {      return false;

          ip_address: data.ipAddress || null,

          user_agent: data.userAgent || null,        console.error('Error checking user role:', error);    }

          timestamp: new Date().toISOString()

        }]);        return false;  }

    } catch (error) {

      console.error('Error creating audit log:', error);      }

    }

  }  static async createAuditLog(data: any): Promise<void> {



  static async getUser(userId: string): Promise<any> {      return roles && roles.length > 0;    try {

    try {

      const { data: user, error } = await supabaseAuth.supabaseAdmin    } catch (error) {      const db = getRealDatabase();

        .from('users')

        .select('*')      console.error('Error checking user role:', error);      await db.query(

        .eq('user_id', userId)

        .single();      return false;        `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent)



      if (error) {    }         VALUES ($1, $2, $3, $4, $5, $6, $7)`,

        console.error('Error getting user:', error);

        return null;  }        [

      }

          data.userId || null,

      return user || null;

    } catch (error) {  static async createAuditLog(data: any): Promise<void> {          data.action || 'UNKNOWN',

      console.error('Error getting user:', error);

      return null;    try {          data.resourceType || null,

    }

  }      await supabaseAuth.supabaseAdmin          data.resourceId || null,



  static async updateUser(userId: string, data: any): Promise<any> {        .from('audit_log')          JSON.stringify(data.details || {}),

    try {

      const updateData = {        .insert([{          data.ipAddress || null,

        ...data,

        updated_at: new Date().toISOString()          user_id: data.userId || null,          data.userAgent || null

      };

          operation_type: data.action || 'UNKNOWN',        ]

      const { data: updatedUser, error } = await supabaseAuth.supabaseAdmin

        .from('users')          table_name: data.resourceType || null,      );

        .update(updateData)

        .eq('user_id', userId)          record_id: data.resourceId || null,    } catch (error) {

        .select()

        .single();          new_values: data.details || {},      console.error('Error creating audit log:', error);



      if (error) {          ip_address: data.ipAddress || null,    }

        console.error('Error updating user:', error);

        return null;          user_agent: data.userAgent || null,  }

      }

          timestamp: new Date().toISOString()

      return updatedUser || null;

    } catch (error) {        }]);  static async getUser(userId: string): Promise<any> {

      console.error('Error updating user:', error);

      return null;    } catch (error) {    try {

    }

  }      console.error('Error creating audit log:', error);      const db = getRealDatabase();



  static async deleteUser(userId: string): Promise<boolean> {    }      const result = await db.query(

    try {

      const { error } = await supabaseAuth.supabaseAdmin  }        "SELECT * FROM users WHERE user_id = $1",

        .from('users')

        .delete()        [userId]

        .eq('user_id', userId);

  static async getUser(userId: string): Promise<any> {      );

      if (error) {

        console.error('Error deleting user:', error);    try {      return result.rows[0] || null;

        return false;

      }      const { data: user, error } = await supabaseAuth.supabaseAdmin    } catch (error) {



      return true;        .from('users')      console.error('Error getting user:', error);

    } catch (error) {

      console.error('Error deleting user:', error);        .select('*')      return null;

      return false;

    }        .eq('user_id', userId)    }

  }

}        .single();  }




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

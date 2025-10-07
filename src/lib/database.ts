// Import the real enhanced database
import { getDatabase as getRealDatabase } from './enhanced-database';

// Export the real getDatabase function
export const getDatabase = getRealDatabase;

// Re-export EnhancedDatabase class for compatibility
export { EnhancedDatabase } from './enhanced-database';

// Functional DatabaseUtils with real implementations
export class DatabaseUtils {
  static async checkUserRole(userId: string, role: string): Promise<boolean> {
    try {
      const db = getRealDatabase();
      const result = await db.query(
        "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
        [userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  static async createAuditLog(data: any): Promise<void> {
    try {
      const db = getRealDatabase();
      await db.query(
        `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          data.userId || null,
          data.action || 'UNKNOWN',
          data.resourceType || null,
          data.resourceId || null,
          JSON.stringify(data.details || {}),
          data.ipAddress || null,
          data.userAgent || null
        ]
      );
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  static async getUser(userId: string): Promise<any> {
    try {
      const db = getRealDatabase();
      const result = await db.query(
        "SELECT * FROM users WHERE user_id = $1",
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  static async updateUser(userId: string, data: any): Promise<any> {
    try {
      const db = getRealDatabase();
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
      
      const result = await db.query(
        `UPDATE users SET ${setClause}, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
        [userId, ...values]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  static async deleteUser(userId: string): Promise<boolean> {
    try {
      const db = getRealDatabase();
      const result = await db.query(
        "DELETE FROM users WHERE user_id = $1",
        [userId]
      );
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
}
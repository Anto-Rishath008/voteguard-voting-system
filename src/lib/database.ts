// Temporary compatibility layer to make build pass
export class DatabaseUtils {
  static async checkUserRole(userId: string, role: string): Promise<boolean> {
    return false;
  }

  static async createAuditLog(data: any): Promise<void> {
    // No-op for now
  }

  static async getUser(userId: string): Promise<any> {
    return null;
  }

  static async updateUser(userId: string, data: any): Promise<any> {
    return null;
  }

  static async deleteUser(userId: string): Promise<boolean> {
    return false;
  }
}
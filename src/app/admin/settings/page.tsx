"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  ArrowLeft,
  Settings,
  Database,
  Shield,
  Bell,
  Mail,
  Server,
  Key,
} from "lucide-react";

interface SystemSettings {
  siteName: string;
  adminEmail: string;
  enableNotifications: boolean;
  enableEmailVerification: boolean;
  enableAuditLogging: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requirePasswordUppercase: boolean;
  requirePasswordNumbers: boolean;
  requirePasswordSymbols: boolean;
}

export default function AdminSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: "VoteGuard",
    adminEmail: "admin@voteguard.com",
    enableNotifications: true,
    enableEmailVerification: true,
    enableAuditLogging: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requirePasswordUppercase: true,
    requirePasswordNumbers: true,
    requirePasswordSymbols: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && (!user || !user.roles?.includes("Admin") && !user.roles?.includes("SuperAdmin"))) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would call an API to save settings
      // For now, we'll just simulate a save operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAlert({
        type: "success",
        message: "Settings saved successfully"
      });
      setIsEditing(false);
    } catch (error) {
      setAlert({
        type: "error",
        message: "Failed to save settings"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // In a real implementation, you'd reload the settings from the server
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (!user.roles?.includes("Admin") && !user.roles?.includes("SuperAdmin"))) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Settings className="h-8 w-8 mr-3 text-blue-600" />
                  System Settings
                </h1>
                <p className="mt-2 text-gray-600">
                  Configure system-wide settings and preferences
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Settings
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <Alert
            type={alert.type}
            onClose={() => setAlert(null)}
          >
            {alert.message}
          </Alert>
        )}

        {/* Settings Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <Server className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site Name
                  </label>
                  <Input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => setSettings(prev => ({...prev, siteName: e.target.value}))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Email
                  </label>
                  <Input
                    type="email"
                    value={settings.adminEmail}
                    onChange={(e) => setSettings(prev => ({...prev, adminEmail: e.target.value}))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Timeout (minutes)
                  </label>
                  <Input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings(prev => ({...prev, sessionTimeout: parseInt(e.target.value)}))}
                    disabled={!isEditing}
                    min="1"
                    max="1440"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Login Attempts
                  </label>
                  <Input
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => setSettings(prev => ({...prev, maxLoginAttempts: parseInt(e.target.value)}))}
                    disabled={!isEditing}
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Minimum Length
                  </label>
                  <Input
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => setSettings(prev => ({...prev, passwordMinLength: parseInt(e.target.value)}))}
                    disabled={!isEditing}
                    min="4"
                    max="128"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.requirePasswordUppercase}
                      onChange={(e) => setSettings(prev => ({...prev, requirePasswordUppercase: e.target.checked}))}
                      disabled={!isEditing}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Require uppercase letters</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.requirePasswordNumbers}
                      onChange={(e) => setSettings(prev => ({...prev, requirePasswordNumbers: e.target.checked}))}
                      disabled={!isEditing}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Require numbers</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.requirePasswordSymbols}
                      onChange={(e) => setSettings(prev => ({...prev, requirePasswordSymbols: e.target.checked}))}
                      disabled={!isEditing}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Require symbols</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Settings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <Bell className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Feature Settings</h2>
              </div>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => setSettings(prev => ({...prev, enableNotifications: e.target.checked}))}
                    disabled={!isEditing}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Enable system notifications</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.enableEmailVerification}
                    onChange={(e) => setSettings(prev => ({...prev, enableEmailVerification: e.target.checked}))}
                    disabled={!isEditing}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Require email verification</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.enableAuditLogging}
                    onChange={(e) => setSettings(prev => ({...prev, enableAuditLogging: e.target.checked}))}
                    disabled={!isEditing}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Enable audit logging</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Database Settings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <Database className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Database Settings</h2>
              </div>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p><strong>Connection Status:</strong> <span className="text-green-600">Connected</span></p>
                  <p><strong>Database Type:</strong> PostgreSQL</p>
                  <p><strong>Last Backup:</strong> {new Date().toLocaleDateString()}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" disabled={!isEditing}>
                    Test Connection
                  </Button>
                  <Button variant="outline" size="sm" disabled={!isEditing}>
                    Create Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
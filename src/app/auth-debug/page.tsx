"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthDebugPage() {
  const { user, loading, hasRole, isAdmin, isSuperAdmin } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [profileInfo, setProfileInfo] = useState<any>(null);

  useEffect(() => {
    // Fetch profile info directly from API
    fetch('/api/auth/profile', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setProfileInfo(data))
      .catch(err => setProfileInfo({ error: err.message }));

    // Check diagnostic endpoint
    fetch('/api/diagnostics/check-auth', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setTokenInfo(data))
      .catch(err => setTokenInfo({ error: err.message }));
  }, []);

  if (loading) {
    return <div className="p-8">Loading authentication info...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-4">Authentication Debug Info</h1>
        
        {/* Auth Context User */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-3">Auth Context User</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
          <div className="mt-4 space-y-2">
            <p><strong>Has Voter Role:</strong> {hasRole("Voter") ? "✅ Yes" : "❌ No"}</p>
            <p><strong>Has Admin Role:</strong> {hasRole("Admin") ? "✅ Yes" : "❌ No"}</p>
            <p><strong>Has SuperAdmin Role:</strong> {hasRole("SuperAdmin") ? "✅ Yes" : "❌ No"}</p>
            <p><strong>isAdmin:</strong> {isAdmin ? "✅ Yes" : "❌ No"}</p>
            <p><strong>isSuperAdmin:</strong> {isSuperAdmin ? "✅ Yes" : "❌ No"}</p>
          </div>
        </div>

        {/* Profile API Response */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-3">Profile API Response</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(profileInfo, null, 2)}
          </pre>
        </div>

        {/* Diagnostic Check */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-3">Diagnostic Check</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(tokenInfo, null, 2)}
          </pre>
        </div>

        {/* Cookies */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-3">Browser Cookies</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {typeof document !== 'undefined' ? document.cookie : 'N/A'}
          </pre>
        </div>
      </div>
    </div>
  );
}

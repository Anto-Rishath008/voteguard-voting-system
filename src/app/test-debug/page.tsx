"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export default function TestPage() {
  const { user, loading } = useAuth();
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    // Test the profile API directly
    async function testProfile() {
      try {
        const response = await fetch('/api/auth/profile', {
          credentials: 'include'
        });
        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        console.error('Profile API error:', error);
      }
    }

    if (!loading) {
      testProfile();
    }
  }, [loading]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>User Data Debug</h1>
      
      <h2>From AuthContext:</h2>
      <pre style={{ background: '#f0f0f0', padding: '10px' }}>
        {JSON.stringify(user, null, 2)}
      </pre>

      <h2>From Profile API:</h2>
      <pre style={{ background: '#f0f0f0', padding: '10px' }}>
        {JSON.stringify(profileData, null, 2)}
      </pre>

      {user && (
        <div>
          <h2>User Properties:</h2>
          <ul>
            <li>user.firstName: {user.firstName || 'undefined'}</li>
            <li>user.lastName: {user.lastName || 'undefined'}</li>
            <li>user.email: {user.email || 'undefined'}</li>
            <li>user.userId: {user.userId || 'undefined'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
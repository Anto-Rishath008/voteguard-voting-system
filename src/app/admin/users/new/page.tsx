"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import {
  ArrowLeft,
  UserPlus,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  roles: string[];
}

export default function NewUserPage() {
  const router = useRouter();
  const { hasRole, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    roles: ["Voter"], // Default role
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Available roles
  const availableRoles = ["Voter", "Admin", "SuperAdmin"];

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    // Redirect if not admin or superadmin
    if (!hasRole("Admin") && !hasRole("SuperAdmin")) {
      router.push("/dashboard");
      return;
    }
  }, [authLoading, hasRole, router]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleRoleToggle = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      throw new Error("First name is required");
    }
    if (!formData.last_name.trim()) {
      throw new Error("Last name is required");
    }
    if (!formData.email.trim()) {
      throw new Error("Email is required");
    }
    if (!formData.email.includes("@")) {
      throw new Error("Please enter a valid email address");
    }
    if (!formData.password) {
      throw new Error("Password is required");
    }
    if (formData.password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
    if (formData.password !== formData.confirmPassword) {
      throw new Error("Passwords do not match");
    }
    if (formData.roles.length === 0) {
      throw new Error("At least one role must be selected");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      validateForm();

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.first_name,
          lastName: formData.last_name,
          password: formData.password,
          roles: formData.roles,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create user");
      }

      const data = await response.json();
      setSuccess(`User "${formData.email}" created successfully!`);
      
      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        confirmPassword: "",
        roles: ["Voter"],
      });

      // Redirect back to users list after a short delay
      setTimeout(() => {
        router.push("/admin/users");
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "SuperAdmin":
        return "text-purple-700 bg-purple-100";
      case "Admin":
        return "text-blue-700 bg-blue-100";
      case "Voter":
        return "text-green-700 bg-green-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin/users">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
            <p className="mt-1 text-sm text-gray-600">
              Add a new user to the system with appropriate roles and permissions
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6">
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <div className="mt-2 text-sm text-green-700">{success}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Name *
                          </label>
                          <Input
                            type="text"
                            value={formData.first_name}
                            onChange={(e) => handleInputChange("first_name", e.target.value)}
                            required
                            placeholder="Enter first name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name *
                          </label>
                          <Input
                            type="text"
                            value={formData.last_name}
                            onChange={(e) => handleInputChange("last_name", e.target.value)}
                            required
                            placeholder="Enter last name"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          required
                          placeholder="Enter email address"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Password
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password *
                          </label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={(e) => handleInputChange("password", e.target.value)}
                              required
                              placeholder="Enter password"
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            At least 6 characters
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password *
                          </label>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              value={formData.confirmPassword}
                              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                              required
                              placeholder="Confirm password"
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Roles */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        User Roles *
                      </h3>
                      <div className="space-y-2">
                        {availableRoles.map((role) => (
                          <label key={role} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.roles.includes(role)}
                              onChange={() => handleRoleToggle(role)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{role}</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Select at least one role for the user
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div>
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Selected Roles
                  </h3>
                  
                  <div className="space-y-2">
                    {formData.roles.length > 0 ? (
                      formData.roles.map((role, index) => (
                        <span 
                          key={index}
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(role)}`}
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No roles selected</p>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <>
                          <Settings className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create User
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-gray-500">
                      The user will receive login credentials and can access the system based on their assigned roles.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
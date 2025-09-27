"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import { Vote, Mail, Lock, User, Shield, UserCheck } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "voter",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    try {
      await signUp(
        formData.email,
        formData.password,
        formData.confirmPassword,
        formData.firstName,
        formData.lastName,
        formData.role
      );
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <Vote className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Create your VoteGuard account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        {/* Registration Form */}
        <Card>
          <CardContent className="p-6">
            {error && (
              <Alert type="error" className="mb-4">
                {error}
              </Alert>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  leftIcon={<User className="h-5 w-5" />}
                  placeholder="First name"
                />

                <Input
                  label="Last Name"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  leftIcon={<User className="h-5 w-5" />}
                  placeholder="Last name"
                />
              </div>

              <Input
                label="Email address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                leftIcon={<Mail className="h-5 w-5" />}
                placeholder="Enter your email"
              />

              <Input
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                leftIcon={<Lock className="h-5 w-5" />}
                placeholder="Choose a password"
                helpText="Must be at least 8 characters long"
              />

              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                leftIcon={<Lock className="h-5 w-5" />}
                placeholder="Confirm your password"
              />

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Account Type
                </label>
                <div className="relative">
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none bg-white pl-12"
                    required
                  >
                    <option value="voter">
                      👤 Voter - Can participate in elections
                    </option>
                    <option value="admin">
                      🛡️ Admin - Can manage elections and users
                    </option>
                    <option value="super_admin">
                      ⚡ Super Admin - Full system access
                    </option>
                  </select>
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    {formData.role === "voter" && <UserCheck className="h-5 w-5 text-gray-400" />}
                    {formData.role === "admin" && <Shield className="h-5 w-5 text-gray-400" />}
                    {formData.role === "super_admin" && <Shield className="h-5 w-5 text-purple-600" />}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Choose the type of account you want to create
                </p>
              </div>

              <Button type="submit" className="w-full" isLoading={loading}>
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              By creating an account, you agree to our{" "}
              <Link
                href="/terms"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Privacy Policy
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <Link
            href="/"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

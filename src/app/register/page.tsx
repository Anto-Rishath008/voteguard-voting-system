"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type EnhancedRegistrationData } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import { 
  Vote, Mail, Lock, User, Shield, UserCheck, 
  Phone, CreditCard, Fingerprint, FileText, 
  CheckCircle, ArrowRight, ArrowLeft, Eye, 
  Smartphone, IdCard, University, AlertTriangle,
  Send, RefreshCw
} from "lucide-react";

// Security Questions Bank
const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "In which city were you born?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favorite movie?",
  "What was the model of your first car?",
  "What is your favorite food?",
  "What is the name of your best friend from childhood?",
  "In which year did you graduate from college?",
  "What is your favorite book?"
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "voter",
    
    // Contact & Verification
    phoneNumber: "",
    emailOtp: "",
    phoneOtp: "",
    
    // ID Verification
    aadhaarNumber: "",
    collegeId: "",
    instituteName: "",
    
    // Security Questions (role-based)
    securityQuestions: [
      { question: "", answer: "" },
      { question: "", answer: "" },
      { question: "", answer: "" }
    ],
    
    // Biometric (for Admin/SuperAdmin)
    fingerprintData: null as string | null,
    faceData: null as string | null,
    
    // Additional Security (SuperAdmin)
    referenceCode: "",
    authorizedBy: "",
    reason: "",
    
    // Terms Agreement
    agreedToTerms: false
  });
  
  const [stepValidation, setStepValidation] = useState({
    1: false, 2: false, 3: false, 4: false, 5: false
  });
  
  const [otpStates, setOtpStates] = useState({
    emailSent: false,
    phoneSent: false,
    emailVerified: false,
    phoneVerified: false,
    emailLoading: false,
    phoneLoading: false
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fingerprintSupported, setFingerprintSupported] = useState(false);

  const { signUp, signUpEnhanced } = useAuth();
  const router = useRouter();

  // Check biometric support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
      setFingerprintSupported(true);
    }
  }, []);

  // Get security requirements based on role - ALL USERS NOW REQUIRE ENHANCED SECURITY
  const getSecurityLevel = () => {
    switch(formData.role) {
      case 'voter':
        return {
          steps: 5,
          requiresFingerprint: true,
          securityQuestions: 2,
          requiresReference: false,
          verificationLevel: 'Enhanced'
        };
      case 'admin':
        return {
          steps: 5,
          requiresFingerprint: true,
          securityQuestions: 2,
          requiresReference: false,
          verificationLevel: 'Enhanced'
        };
      case 'super_admin':
        return {
          steps: 5,
          requiresFingerprint: true,
          securityQuestions: 3,
          requiresReference: true,
          verificationLevel: 'Maximum'
        };
      default:
        return {
          steps: 5,
          requiresFingerprint: true,
          securityQuestions: 2,
          requiresReference: false,
          verificationLevel: 'Enhanced'
        };
    }
  };

  const securityLevel = getSecurityLevel();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Reset step validation when role changes
    if (name === 'role') {
      setStepValidation({ 1: false, 2: false, 3: false, 4: false, 5: false });
      setCurrentStep(1);
    }
  };

  const handleSecurityQuestionChange = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      securityQuestions: prev.securityQuestions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const validateStep = (step: number): boolean => {
    switch(step) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email && 
                 formData.password && formData.confirmPassword && formData.role &&
                 formData.password === formData.confirmPassword && formData.password.length >= 8);
      case 2:
        return !!(formData.phoneNumber && otpStates.emailVerified && otpStates.phoneVerified);
      case 3:
        // ALL users now require Aadhaar verification
        if (!formData.aadhaarNumber) return false;
        // Admin/SuperAdmin also need college ID and institution
        const idValid = formData.role === 'voter' ? 
          !!(formData.aadhaarNumber) :
          !!(formData.aadhaarNumber && formData.collegeId && formData.instituteName);
        return idValid;
      case 4:
        const requiredQuestions = securityLevel.securityQuestions;
        const answeredQuestions = formData.securityQuestions.slice(0, requiredQuestions)
          .filter(q => q.question && q.answer.length >= 3);
        return answeredQuestions.length === requiredQuestions;
      case 5:
        // All users now require fingerprint (or acknowledge if not supported)
        const hasFingerprint = !!(formData.fingerprintData || !fingerprintSupported);
        if (formData.role === 'super_admin') {
          return hasFingerprint && !!(formData.referenceCode && formData.authorizedBy && formData.reason);
        }
        return hasFingerprint;
      default:
        return false;
    }
  };

  const sendEmailOTP = async () => {
    setOtpStates(prev => ({ ...prev, emailLoading: true }));
    setError("");
    
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          type: 'email'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setOtpStates(prev => ({ ...prev, emailSent: true, emailLoading: false }));
        
        // Show development OTP in non-production
        if (data.devOtp) {
          setError(`Development Mode: Use OTP ${data.devOtp} (expires in 5 minutes)`);
        }
      } else {
        throw new Error(data.error || 'Failed to send email OTP');
      }
    } catch (error: any) {
      setError(error.message || "Failed to send email OTP");
      setOtpStates(prev => ({ ...prev, emailLoading: false }));
    }
  };

  const sendPhoneOTP = async () => {
    setOtpStates(prev => ({ ...prev, phoneLoading: true }));
    setError("");
    
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.phoneNumber, // Using phone number in email field for this API
          type: 'phone'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setOtpStates(prev => ({ ...prev, phoneSent: true, phoneLoading: false }));
        
        // Show development OTP in non-production
        if (data.devOtp) {
          setError(`Development Mode: Use OTP ${data.devOtp} (expires in 5 minutes)`);
        }
      } else {
        throw new Error(data.error || 'Failed to send SMS OTP');
      }
    } catch (error: any) {
      setError(error.message || "Failed to send SMS OTP");
      setOtpStates(prev => ({ ...prev, phoneLoading: false }));
    }
  };

  const verifyEmailOTP = async () => {
    if (!formData.emailOtp) {
      setError("Please enter the OTP");
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.emailOtp,
          type: 'email'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setOtpStates(prev => ({ ...prev, emailVerified: true }));
        setError(""); // Clear any errors
      } else {
        throw new Error(data.error || 'Invalid email OTP');
      }
    } catch (error: any) {
      setError(error.message || "Invalid email OTP");
    }
  };

  const verifyPhoneOTP = async () => {
    if (!formData.phoneOtp) {
      setError("Please enter the SMS code");
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.phoneNumber, // Using phone number in email field for this API
          otp: formData.phoneOtp,
          type: 'phone'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setOtpStates(prev => ({ ...prev, phoneVerified: true }));
        setError(""); // Clear any errors
      } else {
        throw new Error(data.error || 'Invalid SMS code');
      }
    } catch (error: any) {
      setError(error.message || "Invalid SMS code");
    }
  };

  const handleFingerprintRegister = async () => {
    if (!fingerprintSupported) {
      setError("Fingerprint authentication not supported on this device");
      return;
    }
    
    try {
      // Mock fingerprint registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      setFormData(prev => ({ ...prev, fingerprintData: "fingerprint_registered" }));
    } catch (error) {
      setError("Failed to register fingerprint");
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setStepValidation(prev => ({ ...prev, [currentStep]: true }));
      setCurrentStep(prev => Math.min(prev + 1, securityLevel.steps));
      setError("");
    } else {
      setError("Please complete all required fields for this step");
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    // Final validation
    if (!validateStep(currentStep)) {
      setError("Please complete all required fields");
      setLoading(false);
      return;
    }

    try {
      // Submit enhanced registration data
      const registrationData: EnhancedRegistrationData = {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        aadhaarNumber: formData.aadhaarNumber,
        collegeId: formData.collegeId,
        securityQuestions: formData.securityQuestions,
        fingerprintData: formData.fingerprintData || "",
        agreedToTerms: formData.agreedToTerms
      };

      await signUpEnhanced(registrationData);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {Array.from({ length: securityLevel.steps }, (_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepValidation[stepNum as keyof typeof stepValidation];
          
          return (
            <div key={stepNum} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                ${isCompleted ? 'bg-green-500 text-white' : 
                  isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}
              `}>
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : stepNum}
              </div>
              {stepNum < securityLevel.steps && (
                <div className={`w-12 h-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Step content renderers
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Basic Information</h3>
        <p className="text-sm text-gray-600">Let's start with your basic details</p>
      </div>

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

      {/* Role Selection with Security Level Display */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Account Type & Security Level
        </label>
        <div className="space-y-3">
          {(['voter', 'admin', 'super_admin'] as const).map((role) => {
            const roleConfig = {
              voter: { 
                icon: <UserCheck className="h-5 w-5" />, 
                title: "Voter", 
                desc: "Can participate in elections",
                security: "Enhanced Security: Email + Phone + Aadhaar + Fingerprint + 2 Security Questions",
                color: "blue"
              },
              admin: { 
                icon: <Shield className="h-5 w-5" />, 
                title: "Admin", 
                desc: "Can manage elections and users",
                security: "Enhanced Security: All Voter requirements + Institution Verification",
                color: "orange"
              },
              super_admin: { 
                icon: <Shield className="h-5 w-5" />, 
                title: "Super Admin", 
                desc: "Full system access",
                security: "Maximum Security: All Admin requirements + Reference Code + 3 Security Questions",
                color: "red"
              }
            };
            
            const config = roleConfig[role];
            const isSelected = formData.role === role;
            
            return (
              <div
                key={role}
                className={`
                  border-2 rounded-lg p-4 cursor-pointer transition-all
                  ${isSelected ? 
                    `border-${config.color}-500 bg-${config.color}-50` : 
                    'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => handleChange({ target: { name: 'role', value: role } } as any)}
              >
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 ${isSelected ? `text-${config.color}-600` : 'text-gray-400'}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{config.title}</h4>
                      {isSelected && <CheckCircle className="h-4 w-4 text-green-500" />}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{config.desc}</p>
                    <p className="text-xs text-gray-500 mt-2 font-medium">{config.security}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Contact Verification</h3>
        <p className="text-sm text-gray-600">Verify your phone number and email address</p>
      </div>

      <Input
        label="Phone Number"
        name="phoneNumber"
        type="tel"
        value={formData.phoneNumber}
        onChange={handleChange}
        required
        leftIcon={<Phone className="h-5 w-5" />}
        placeholder="+91 9876543210"
        helpText="Include country code"
      />

      {/* Email OTP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Email Verification</label>
          {!otpStates.emailSent && (
            <Button 
              onClick={sendEmailOTP} 
              size="sm" 
              variant="outline"
              isLoading={otpStates.emailLoading}
              disabled={!formData.email}
            >
              <Send className="h-4 w-4 mr-1" />
              Send OTP
            </Button>
          )}
        </div>
        
        {otpStates.emailSent && !otpStates.emailVerified && (
          <div className="flex space-x-2">
            <Input
              name="emailOtp"
              placeholder="Enter 6-digit OTP"
              value={formData.emailOtp}
              onChange={handleChange}
              maxLength={6}
            />
            <Button onClick={verifyEmailOTP} size="sm">
              Verify
            </Button>
          </div>
        )}
        
        {otpStates.emailVerified && (
          <div className="flex items-center text-green-600 text-sm">
            <CheckCircle className="h-4 w-4 mr-1" />
            Email verified successfully
          </div>
        )}
      </div>

      {/* Phone OTP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Phone Verification</label>
          {!otpStates.phoneSent && (
            <Button 
              onClick={sendPhoneOTP} 
              size="sm" 
              variant="outline"
              isLoading={otpStates.phoneLoading}
              disabled={!formData.phoneNumber}
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Send SMS
            </Button>
          )}
        </div>
        
        {otpStates.phoneSent && !otpStates.phoneVerified && (
          <div className="flex space-x-2">
            <Input
              name="phoneOtp"
              placeholder="Enter 6-digit SMS code"
              value={formData.phoneOtp}
              onChange={handleChange}
              maxLength={6}
            />
            <Button onClick={verifyPhoneOTP} size="sm">
              Verify
            </Button>
          </div>
        )}
        
        {otpStates.phoneVerified && (
          <div className="flex items-center text-green-600 text-sm">
            <CheckCircle className="h-4 w-4 mr-1" />
            Phone verified successfully
          </div>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Real OTP Verification Required</p>
            <p>You will receive a 6-digit code via email and SMS. Both verifications are mandatory for account security.</p>
            <p className="mt-1 text-xs text-blue-700">
              📧 Email OTP expires in 5 minutes | 📱 SMS OTP expires in 5 minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Identity Verification</h3>
        <p className="text-sm text-gray-600">Provide your identification details</p>
      </div>

      {/* Aadhaar Number - NOW MANDATORY FOR ALL USERS */}
      <Input
        label="Aadhaar Number (Required for All Users)"
        name="aadhaarNumber"
        type="text"
        value={formData.aadhaarNumber}
        onChange={handleChange}
        required={true}
        leftIcon={<IdCard className="h-5 w-5" />}
        placeholder="1234 5678 9012"
        helpText="12-digit unique identification number - Required for enhanced security"
        maxLength={14}
      />

      {/* College/Institution ID */}
      <Input
        label={formData.role === 'voter' ? "College ID (Optional)" : "College/Institution ID"}
        name="collegeId"
        type="text"
        value={formData.collegeId}
        onChange={handleChange}
        required={formData.role !== 'voter'}
        leftIcon={<University className="h-5 w-5" />}
        placeholder="Student/Employee ID"
      />

      {/* Institution Name (Required for Admin/SuperAdmin) */}
      {formData.role !== 'voter' && (
        <Input
          label="Institution/College Name"
          name="instituteName"
          type="text"
          value={formData.instituteName}
          onChange={handleChange}
          required
          leftIcon={<University className="h-5 w-5" />}
          placeholder="Full institution name"
        />
      )}

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Identity Verification</p>
            <p>
              {formData.role === 'voter' 
                ? "Provide at least one form of identification (Aadhaar or College ID)."
                : "Both Aadhaar and institutional identification are required for admin roles."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Security Questions</h3>
        <p className="text-sm text-gray-600">
          Answer {securityLevel.securityQuestions} security question{securityLevel.securityQuestions > 1 ? 's' : ''} for account recovery
        </p>
      </div>

      {Array.from({ length: securityLevel.securityQuestions }, (_, index) => (
        <div key={index} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Security Question {index + 1}
          </label>
          
          <select
            value={formData.securityQuestions[index]?.question || ''}
            onChange={(e) => handleSecurityQuestionChange(index, 'question', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a security question</option>
            {SECURITY_QUESTIONS.filter(q => 
              !formData.securityQuestions.some((sq, i) => i !== index && sq.question === q)
            ).map((question, qIndex) => (
              <option key={qIndex} value={question}>
                {question}
              </option>
            ))}
          </select>

          {formData.securityQuestions[index]?.question && (
            <Input
              label="Your Answer"
              value={formData.securityQuestions[index]?.answer || ''}
              onChange={(e) => handleSecurityQuestionChange(index, 'answer', e.target.value)}
              placeholder="Enter your answer"
              required
              helpText="Minimum 3 characters"
              minLength={3}
            />
          )}
        </div>
      ))}

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start space-x-2">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Security Guidelines</p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>Choose questions you'll remember easily</li>
              <li>Provide honest and memorable answers</li>
              <li>These will be used for account recovery</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          {formData.role === 'voter' ? 'Final Step' : 'Advanced Security'}
        </h3>
        <p className="text-sm text-gray-600">
          {formData.role === 'voter' 
            ? 'Review your information and create your account'
            : 'Complete biometric registration and additional verification'
          }
        </p>
      </div>

      {/* Biometric Registration - NOW REQUIRED FOR ALL USERS */}
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2 mb-3">
            <Fingerprint className="h-6 w-6 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Enhanced Security: Biometric Registration</h4>
              <p className="text-sm text-blue-800">All VoteGuard users now require fingerprint registration for maximum security</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <Fingerprint className="h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">Fingerprint Registration</h4>
              <p className="text-sm text-gray-600">
                {formData.role === 'voter' ? 'Required for secure voting access' : 
                 formData.role === 'admin' ? 'Required for admin privileges' : 
                 'Required for super admin access'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleFingerprintRegister}
            variant={formData.fingerprintData ? "outline" : "primary"}
            size="sm"
            disabled={!fingerprintSupported}
          >
            {formData.fingerprintData ? (
              <>
                <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                Registered
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4 mr-1" />
                Register Now
              </>
            )}
          </Button>
        </div>

        {!fingerprintSupported && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <p className="text-orange-800 font-medium">Fingerprint Not Available</p>
                <p className="text-orange-700">
                  Biometric authentication is not supported on this device. You can set this up later from your profile settings.
                  For now, you can proceed with other security measures.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SuperAdmin Reference Code */}
      {formData.role === 'super_admin' && (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Super Admin Verification Required</p>
                <p>Super Admin accounts require additional verification and approval.</p>
              </div>
            </div>
          </div>

          <Input
            label="Reference Code"
            name="referenceCode"
            type="text"
            value={formData.referenceCode}
            onChange={handleChange}
            required
            leftIcon={<CreditCard className="h-5 w-5" />}
            placeholder="Authorization reference code"
            helpText="Provided by system administrator"
          />

          <Input
            label="Authorized By"
            name="authorizedBy"
            type="text"
            value={formData.authorizedBy}
            onChange={handleChange}
            required
            leftIcon={<User className="h-5 w-5" />}
            placeholder="Name of authorizing person"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Reason for Super Admin Access
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={(e) => handleChange(e as any)}
              required
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Explain why you need super admin access..."
            />
          </div>
        </div>
      )}

      {/* Summary for all roles */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h4 className="font-medium text-gray-900">Registration Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="ml-2 font-medium">{formData.firstName} {formData.lastName}</span>
          </div>
          <div>
            <span className="text-gray-600">Role:</span>
            <span className="ml-2 font-medium capitalize">{formData.role.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="text-gray-600">Email:</span>
            <span className="ml-2 font-medium">{formData.email}</span>
          </div>
          <div>
            <span className="text-gray-600">Phone:</span>
            <span className="ml-2 font-medium">{formData.phoneNumber}</span>
          </div>
        </div>
        <div className="pt-2 border-t">
          <span className="text-gray-600">Security Level:</span>
          <span className="ml-2 font-medium text-blue-600">{securityLevel.verificationLevel}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <Vote className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Create your VoteGuard account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {formData.role && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                {securityLevel.verificationLevel} Security Level
              </span>
            )}
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Registration Form */}
        <Card>
          <CardContent className="p-8">
            {error && (
              <Alert type="error" className="mb-6">
                {error}
              </Alert>
            )}

            {/* Step Content */}
            <div className="min-h-[400px]">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              {currentStep < securityLevel.steps ? (
                <Button
                  onClick={nextStep}
                  disabled={!validateStep(currentStep)}
                  className="flex items-center"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  isLoading={loading}
                  disabled={!validateStep(currentStep)}
                  className="flex items-center bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Create Account
                </Button>
              )}
            </div>

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

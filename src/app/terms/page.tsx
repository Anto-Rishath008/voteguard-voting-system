import Link from "next/link";
import { Vote, Scale, Users, Shield, AlertTriangle, CheckCircle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Vote className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-lg text-gray-600">
            Legal terms and conditions for using the VoteGuard platform
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: September 27, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          {/* Acceptance */}
          <section>
            <div className="flex items-center mb-4">
              <Scale className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">Acceptance of Terms</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              By creating an account or using the VoteGuard electronic voting platform, you agree to be bound by these 
              Terms of Service ("Terms"). If you do not agree to these Terms, you may not use our services.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-blue-800 text-sm">
                <strong>Important:</strong> These terms constitute a legal agreement between you and VoteGuard. 
                Please read them carefully before proceeding.
              </p>
            </div>
          </section>

          {/* Eligibility */}
          <section>
            <div className="flex items-center mb-4">
              <Users className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">Eligibility & Account Requirements</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">General Requirements</h3>
                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                  <li>Must be at least 18 years old</li>
                  <li>Must provide accurate and truthful information</li>
                  <li>Must have a valid email address and phone number</li>
                  <li>Must complete identity verification process</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Enhanced Security Requirements</h3>
                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                  <li>Valid Aadhaar number for identity verification</li>
                  <li>Biometric fingerprint registration</li>
                  <li>Multi-factor authentication setup</li>
                  <li>Security questions for account recovery</li>
                </ul>
              </div>
            </div>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Responsibilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Account Security</h3>
                    <p className="text-gray-700 text-sm">Keep your login credentials secure and confidential</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Accurate Information</h3>
                    <p className="text-gray-700 text-sm">Provide truthful and up-to-date personal information</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Lawful Use</h3>
                    <p className="text-gray-700 text-sm">Use the platform only for legitimate voting purposes</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Privacy Respect</h3>
                    <p className="text-gray-700 text-sm">Respect the privacy and rights of other users</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Report Issues</h3>
                    <p className="text-gray-700 text-sm">Report any suspicious activity or technical problems</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Follow Guidelines</h3>
                    <p className="text-gray-700 text-sm">Adhere to all voting procedures and deadlines</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Prohibited Activities */}
          <section>
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">Prohibited Activities</h2>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium mb-3">The following activities are strictly prohibited:</p>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                <li>Attempting to vote multiple times in the same election</li>
                <li>Creating fake or duplicate accounts</li>
                <li>Sharing login credentials with others</li>
                <li>Attempting to hack, compromise, or manipulate the system</li>
                <li>Interfering with other users' voting rights</li>
                <li>Providing false identity information</li>
                <li>Vote buying, selling, or coercion</li>
                <li>Distributing malware or viruses</li>
              </ul>
            </div>
          </section>

          {/* Voting Rules */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Voting Rules & Procedures</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Voting Process</h3>
                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                  <li>You may vote only once per election/contest</li>
                  <li>Votes must be cast within the specified voting period</li>
                  <li>All votes are final and cannot be changed after submission</li>
                  <li>You must complete the entire voting process in one session</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Election Integrity</h3>
                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                  <li>All votes are anonymous and cannot be traced back to individuals</li>
                  <li>The system maintains comprehensive audit trails</li>
                  <li>Results are tamper-proof and cryptographically secured</li>
                  <li>Independent verification mechanisms ensure accuracy</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Service Availability */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Service Availability</h2>
            <p className="text-gray-700 mb-4">
              We strive to maintain high availability of our services, but we cannot guarantee uninterrupted access.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                <strong>Service Interruptions:</strong> We may temporarily suspend service for maintenance, 
                security updates, or emergency situations. We will provide advance notice when possible.
              </p>
            </div>
          </section>

          {/* Data & Privacy */}
          <section>
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">Data Protection & Privacy</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Your privacy is paramount to us. We collect and process personal data in accordance with our Privacy Policy
              and applicable data protection laws.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-700 text-sm">All personal data is encrypted and securely stored</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-700 text-sm">Voting choices are completely anonymous</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-700 text-sm">Data is used only for election purposes</span>
              </div>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              To the maximum extent permitted by law, VoteGuard shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages arising from your use of our services.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 text-sm">
                Our total liability shall not exceed the amount paid by you for our services, 
                or $100, whichever is greater.
              </p>
            </div>
          </section>

          {/* Account Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Account Termination</h2>
            <div className="space-y-3">
              <p className="text-gray-700">
                We reserve the right to suspend or terminate accounts that violate these Terms or engage in prohibited activities.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Grounds for Termination</h3>
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                    <li>Violation of Terms of Service</li>
                    <li>Fraudulent activity or false information</li>
                    <li>Security threats or system abuse</li>
                    <li>Inactivity for extended periods</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Your Rights</h3>
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                    <li>Request account data before termination</li>
                    <li>Appeal termination decisions</li>
                    <li>Delete account at any time</li>
                    <li>Receive notice of termination</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We may update these Terms from time to time. We will notify you of significant changes via email 
              or prominent notices on our platform.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                Continued use of our services after changes constitute acceptance of the new Terms.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about these Terms or need support, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>VoteGuard Legal Team</strong><br />
                Email: legal@voteguard.com<br />
                Phone: +1 (555) 123-4567<br />
                Address: 123 Democracy Street, Civic Center, DC 20001
              </p>
            </div>
          </section>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
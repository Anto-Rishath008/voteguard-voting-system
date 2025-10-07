import Link from "next/link";
import { Vote, Shield, Lock, Eye, Database } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Vote className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-lg text-gray-600">
            How VoteGuard protects your personal information and voting privacy
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: September 27, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">Our Commitment to Privacy</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              VoteGuard is committed to protecting your privacy and ensuring the security of your personal information.
              This Privacy Policy explains how we collect, use, protect, and disclose information when you use our
              electronic voting platform.
            </p>
          </section>

          {/* Information Collection */}
          <section>
            <div className="flex items-center mb-4">
              <Database className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">Information We Collect</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                  <li>Name, email address, and phone number</li>
                  <li>Government-issued ID numbers (Aadhaar, etc.) for identity verification</li>
                  <li>Institutional information (college/organization details)</li>
                  <li>Biometric data (fingerprints) for enhanced security verification</li>
                  <li>Security questions and answers for account recovery</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Voting Information</h3>
                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                  <li>Voting preferences and selections (anonymized and encrypted)</li>
                  <li>Voting timestamps and session information</li>
                  <li>Device and browser information for security purposes</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Verify voter identity and eligibility</li>
              <li>Process and record votes securely</li>
              <li>Prevent fraud and ensure election integrity</li>
              <li>Provide customer support and technical assistance</li>
              <li>Generate anonymized voting statistics and reports</li>
              <li>Comply with legal and regulatory requirements</li>
            </ul>
          </section>

          {/* Voting Privacy */}
          <section>
            <div className="flex items-center mb-4">
              <Lock className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">Voting Privacy & Anonymity</h2>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium mb-2">🔒 Your Vote is Secret and Anonymous</p>
              <ul className="list-disc list-inside text-green-700 space-y-1">
                <li>Votes are encrypted and separated from voter identity</li>
                <li>No one can trace your vote back to you after submission</li>
                <li>Ballot contents are stored separately from voter records</li>
                <li>End-to-end encryption protects your voting choices</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Encryption</h3>
                <p className="text-blue-800 text-sm">All data is encrypted in transit and at rest using industry-standard encryption protocols.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Access Control</h3>
                <p className="text-blue-800 text-sm">Strict access controls ensure only authorized personnel can access sensitive information.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Audit Trails</h3>
                <p className="text-blue-800 text-sm">Comprehensive logging and monitoring detect and prevent unauthorized access.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Data Backup</h3>
                <p className="text-blue-800 text-sm">Regular backups ensure data integrity and availability during emergencies.</p>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700 font-medium">Personal Information</span>
                <span className="text-gray-600">7 years after last election participation</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700 font-medium">Voting Records (Anonymized)</span>
                <span className="text-gray-600">Permanent (for historical records)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700 font-medium">Audit Logs</span>
                <span className="text-gray-600">10 years for compliance</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700 font-medium">Biometric Data</span>
                <span className="text-gray-600">Until account deletion or 7 years</span>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center mb-4">
              <Eye className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">Your Rights</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Access & Portability</h3>
                <p className="text-gray-700 text-sm">Request a copy of your personal data in a machine-readable format.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Correction</h3>
                <p className="text-gray-700 text-sm">Request correction of inaccurate or incomplete personal information.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Deletion</h3>
                <p className="text-gray-700 text-sm">Request deletion of your personal data (subject to legal requirements).</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Notification</h3>
                <p className="text-gray-700 text-sm">Be notified of any data breaches that may affect your information.</p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>VoteGuard Privacy Team</strong><br />
                Email: privacy@voteguard.com<br />
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
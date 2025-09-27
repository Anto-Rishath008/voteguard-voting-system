"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { CheckCircle, Vote, ArrowRight, FileText, Shield } from "lucide-react";

export default function VotedPage() {
  const params = useParams();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            {/* Success Icon */}
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Ballot Cast Successfully!
              </h1>
              <p className="text-lg text-gray-600">
                Your vote has been recorded securely
              </p>
            </div>

            {/* Confirmation Details */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-4">
                <Shield className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div className="text-left">
                  <h3 className="font-semibold text-green-800 mb-2">
                    Your Vote is Secure
                  </h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Your ballot has been encrypted and recorded</li>
                    <li>
                      • Your identity is protected through cryptographic
                      techniques
                    </li>
                    <li>• Your vote cannot be changed or tampered with</li>
                    <li>
                      • The election results will reflect your choices
                      accurately
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-2">Important:</p>
                <p>
                  You have successfully voted in this election. You cannot vote
                  again or change your selections. Keep this confirmation for
                  your records.
                </p>
              </div>
            </div>

            {/* Timestamp */}
            <p className="text-sm text-gray-500 mb-8">
              Vote cast on {new Date().toLocaleString()}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.push(`/elections/${params.id}/results`)}
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Results
              </Button>

              <Button onClick={() => router.push("/dashboard")}>
                <Vote className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>

              <Button
                onClick={() => router.push("/elections")}
                variant="outline"
              >
                All Elections
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Footer Note */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Thank you for participating in the democratic process. Your
                voice matters.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

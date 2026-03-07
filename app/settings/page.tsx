"use client";

import { UserProfile } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <div className="h-4 w-px bg-gray-300" />
          <h1 className="text-sm font-semibold text-gray-900">Account Settings</h1>
        </div>
      </header>

      {/* Clerk UserProfile */}
      <div className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-sm border border-gray-200 rounded-xl",
            },
          }}
        />
      </div>
    </div>
  );
}
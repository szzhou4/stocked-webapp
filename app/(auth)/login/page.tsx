"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChefHat, AlertTriangle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot-password state
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/recipes");
    });
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/recipes");
      router.refresh();
    }
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setResetError(error.message);
      setResetLoading(false);
    } else {
      setResetSent(true);
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm mb-3">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stocked</h1>
          <p className="text-gray-500 text-sm mt-1">Your kitchen, organized.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {!showForgot ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sign in</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setResetEmail(email); setError(""); }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                No account?{" "}
                <Link href="/signup" className="text-indigo-600 font-medium hover:underline">
                  Sign up
                </Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Reset password</h2>
              <p className="text-sm text-gray-500 mb-4">
                Enter your email and we&apos;ll send you a link to set a new password.
              </p>
              {resetSent ? (
                <div className="text-center py-4">
                  <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    Check your inbox — a reset link is on its way to <strong>{resetEmail}</strong>.
                  </p>
                  <button
                    onClick={() => { setShowForgot(false); setResetSent(false); setResetEmail(""); }}
                    className="mt-4 text-sm text-indigo-600 hover:underline"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  {resetError && <p className="text-red-600 text-sm">{resetError}</p>}
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {resetLoading ? "Sending…" : "Send reset link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(false); setResetError(""); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
                  >
                    Back to sign in
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Testing disclaimer */}
        <div className="mt-4 flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Testing mode:</strong> This app is under active development. While we take reasonable precautions with your data, please choose a unique password you don&apos;t use anywhere else.
          </p>
        </div>
      </div>
    </div>
  );
}

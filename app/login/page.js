"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const isRecovery = searchParams.get("type") === "recovery";
  const urlError = searchParams.get("error");
  const displayError = error ?? (urlError ? decodeURIComponent(urlError) : null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const next = searchParams.get("next");
    const redirectTo =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/";
    router.refresh();
    router.push(redirectTo);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email to reset your password.");
      return;
    }
    setError(null);
    setMessage(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/login?type=recovery`,
      }
    );

    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Check your email for the password reset link.");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <main className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Bill Tracker
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
              aria-label="Email address"
              aria-invalid={!!displayError}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isRecovery ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
              aria-label="Password"
              aria-invalid={!!displayError}
            />
          </div>

          {displayError && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
            >
              {displayError}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/50 dark:text-green-200"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-400 dark:focus:ring-offset-zinc-900"
            aria-busy={isLoading}
            aria-label="Sign in"
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isLoading}
            className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-zinc-400"
            aria-label="Send password reset email"
          >
            Forgot password?
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            Sign up
          </Link>
        </p>
      </main>
    </div>
  );
}

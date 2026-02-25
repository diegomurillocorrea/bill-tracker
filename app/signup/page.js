"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setMessage(
      "Check your email to confirm your account, then sign in below."
    );
  };

  const inputClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 py-8 dark:bg-zinc-950">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-xl tablet:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:text-3xl">
            Bill Tracker
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Create your account
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
              className={inputClass}
              aria-label="Email address"
              aria-invalid={!!error}
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              disabled={isLoading}
              className={inputClass}
              aria-label="Password"
              aria-invalid={!!error}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 font-medium text-white transition-all duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-offset-zinc-900"
            aria-busy={isLoading}
            aria-label="Create account"
          >
            {isLoading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}

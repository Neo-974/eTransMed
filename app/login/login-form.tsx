"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { emailFromLogin } from "@/lib/login-id";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailFromLogin(identifiant),
      password,
    });
    setLoading(false);
    if (error) {
      setError("Identifiant ou mot de passe incorrect.");
      return;
    }
    router.push("/accueil");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-bold text-brand-dark">eTransMed</h1>
      <p className="mb-6 text-sm text-slate-500">Connexion</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Identifiant</label>
          <input
            required
            placeholder="Votre nom / identifiant"
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Mot de passe</label>
          <input
            type="password"
            required
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-brand underline">
          Créer / rejoindre un cabinet
        </Link>
      </p>
    </main>
  );
}

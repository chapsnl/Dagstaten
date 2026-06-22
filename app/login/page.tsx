"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Onjuist wachtwoord.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="card">
        <div className="card-header">Inloggen</div>
        <div className="card-body space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="password">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                autoFocus
                className="field-input w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-dark w-full">
              {loading ? "Bezig..." : "Inloggen"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

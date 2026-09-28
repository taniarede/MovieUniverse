import { useState, type SubmitEvent } from "react";

export type LoggedInUser = {
  id: string;
  username: string;
};

export type LoginSession = {
  token: string;
  user: LoggedInUser;
};

type LoginFormProps = Readonly<{
  onLogin: (session: LoginSession) => void;
}>;

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login recusado");
      }

      const session = (await response.json()) as LoginSession;
      setPassword("");
      onLogin(session);
    } catch {
      setError("Não foi possível iniciar sessão. Confirma o email e a palavra-passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Iniciar sessão</h2>

      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <label htmlFor="login-password">Palavra-passe</label>
      <input
        id="login-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? "A entrar…" : "Entrar"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
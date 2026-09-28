import { useState, type SubmitEvent } from "react";

export function RegisterForm({ onRegistered }: Readonly<{ onRegistered?: () => void }>) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleRegister(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (response.status === 409) {
        setMessage("O nome de utilizador ou o email já está registado.");
        return;
      }

      if (!response.ok) {
        throw new Error("Registo recusado");
      }

      setMessage("Conta criada. Já podes iniciar sessão acima.");
      setUsername("");
      setEmail("");
      setPassword("");
      onRegistered?.();
    } catch {
      setMessage("Não foi possível criar a conta. Confirma os dados e tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleRegister} className="register-form">
      <h2>Criar conta</h2>

      <label htmlFor="register-username">Nome de utilizador</label>
      <input
        id="register-username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        minLength={3}
        maxLength={50}
        required
      />

      <label htmlFor="register-email">Email</label>
      <input
        id="register-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <label htmlFor="register-password">Palavra-passe</label>
      <input
        id="register-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={12}
        maxLength={128}
        required
      />

      <button type="submit" disabled={saving}>
        {saving ? "A criar…" : "Criar conta"}
      </button>
      {message && <output>{message}</output>}
    </form>
  );
}

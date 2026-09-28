import { useEffect, useState, type SubmitEvent } from "react";

type MyRating = {
  score: string;
  review: string | null;
};

type RatingResponse = {
  myRating: MyRating | null;
};

type RatingFormProps = Readonly<{
  tmdbId: number;
  onSaved: () => void;
}>;

export function RatingForm({ tmdbId, onSaved }: RatingFormProps) {
  const [score, setScore] = useState("");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRating() {
      try {
        const response = await fetch(`/api/ratings/${tmdbId}`, {
          
        });

        if (!response.ok) {
          throw new Error("Falha ao consultar avaliação");
        }

        const data = (await response.json()) as RatingResponse;
        if (active && data.myRating) {
          setScore(data.myRating.score);
          setReview(data.myRating.review ?? "");
        }
      } catch {
        if (active) setMessage("Não foi possível carregar a tua avaliação.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRating();

    return () => {
      active = false;
    };
  }, [tmdbId]);

  async function handleSave(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/ratings/${tmdbId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score: Number(score), review }),
      });

      if (!response.ok) {
        throw new Error("Falha ao guardar avaliação");
      }

      setMessage("Avaliação guardada.");
      onSaved();
    } catch {
      setMessage("Não foi possível guardar a avaliação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="rating-form">
      <h3>A tua avaliação</h3>

      <label htmlFor="rating-score">Nota de 1 a 10</label>
      <input
        id="rating-score"
        type="number"
        min="1"
        max="10"
        step="0.1"
        value={score}
        onChange={(event) => setScore(event.target.value)}
        required
        disabled={loading}
      />

      <label htmlFor="rating-review">Comentário (opcional)</label>
      <textarea
        id="rating-review"
        value={review}
        onChange={(event) => setReview(event.target.value)}
        maxLength={2000}
        disabled={loading}
      />

      <button type="submit" disabled={loading || saving}>
        {saving ? "A guardar…" : "Guardar avaliação"}
      </button>
      {loading && <p>A carregar a tua avaliação…</p>}
      {message && <output>{message}</output>}
    </form>
  );
}
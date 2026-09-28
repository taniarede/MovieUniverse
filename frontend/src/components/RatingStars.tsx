import "./RatingStars.css";

type RatingStarsProps = Readonly<{
  score: number | null;
}>;

export function RatingStars({ score }: RatingStarsProps) {
  if (score === null) return null;

  const fill = Math.max(0, Math.min(100, (score / 10) * 100));

  return (
    <span className="rating-stars" aria-hidden="true">
      <span className="rating-stars__empty">★★★★★</span>
      <span
        className="rating-stars__filled"
        style={{ width: `${fill}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}
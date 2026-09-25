type RatingData = {
  tmdbRating: number;
  tmdbVotes: number;
  appAverage: number | null;
  appVotes: number;
};

export function calculateCombinedRating(data: RatingData): number | null {
  const { tmdbRating, tmdbVotes, appAverage, appVotes } = data;

  if (tmdbVotes === 0 && appVotes === 0) {
    return null;
  }

  const referenceRating = 6.5;
  const referenceVotes = 1000;
  const tmdbWeight = 20;

  const adjustedTmdb =
    (tmdbRating * tmdbVotes + referenceRating * referenceVotes) /
    (tmdbVotes + referenceVotes);

  const localTotal = appAverage === null ? 0 : appAverage * appVotes;

  const combined =
    (adjustedTmdb * tmdbWeight + localTotal) /
    (tmdbWeight + appVotes);

  return Math.round(combined * 100) / 100;
}
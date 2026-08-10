function createdAtEpoch(evaluation) {
  const timestamp = new Date(String(evaluation?.createdAt || "")).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function selectLatestScoreboardEvaluation(evaluations) {
  const available = Array.isArray(evaluations) ? evaluations.filter(Boolean) : [];
  const current = available.filter((evaluation) => evaluation.status !== "Archived");
  const candidates = current.length ? current : available;
  const dated = candidates
    .map((evaluation, index) => ({ evaluation, index, timestamp: createdAtEpoch(evaluation) }))
    .filter((item) => item.timestamp > 0);

  if (dated.length) {
    return dated.reduce((latest, candidate) => (
      candidate.timestamp > latest.timestamp ||
      (candidate.timestamp === latest.timestamp && candidate.index > latest.index)
        ? candidate
        : latest
    )).evaluation;
  }

  return candidates[candidates.length - 1] || null;
}

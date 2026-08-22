type PodiumParticipant = {
  rank: number;
  name: string;
  branch?: string;
  score: number;
  time?: string;
};

const medals: Record<number, string> = {
  1: "🏆",
  2: "🥈",
  3: "🥉",
};

export default function PodiumLeaderboard({
  participants,
}: {
  participants: PodiumParticipant[];
}) {
  return (
    <section className="premium-podium" aria-label="Top performers leaderboard">
      {participants.slice(0, 3).map((participant) => (
        <article
          key={`${participant.rank}-${participant.name}`}
          className={`premium-podium-card podium-rank-${participant.rank}`}
          aria-label={`${participant.rank} place: ${participant.name}`}
        >
          <span className="premium-podium-medal">
            {medals[participant.rank] ?? `#${participant.rank}`}
          </span>
          <div className="premium-podium-avatar">
            {participant.name.charAt(0).toUpperCase()}
          </div>
          <h3>{participant.name}</h3>
          {participant.branch && <p>{participant.branch}</p>}
          <strong>{participant.score}%</strong>
          {participant.time && <small>{participant.time}</small>}
          <div className="premium-podium-base" aria-hidden="true" />
        </article>
      ))}
    </section>
  );
}

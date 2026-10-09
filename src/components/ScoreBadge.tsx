import type { LeadScore } from '../../api/_lib/score'

const TIER = { hot: 'Hot', warm: 'Warm', cold: 'Cold' } as const

export function ScoreBadge({ score }: { score: LeadScore }) {
  return (
    <span className={`score score-${score.tier}`} title={score.reasons.join(' · ')} aria-label={`Lead score ${score.score} of 100, ${TIER[score.tier]}`}>
      <strong>{score.score}</strong>
      <span>{TIER[score.tier]}</span>
    </span>
  )
}

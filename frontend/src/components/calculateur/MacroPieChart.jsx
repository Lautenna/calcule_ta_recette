export function MacroPieChart({ perPortion }) {
  const lipCal = (perPortion.graisses || 0) * 9
  const gluCal = (perPortion.glucides || 0) * 4
  const proCal = (perPortion.proteines || 0) * 4
  const totalCal = lipCal + gluCal + proCal

  const kcalPortion = Math.round(perPortion.energie_kcal || 0)
  const isEmpty = totalCal === 0

  const RADIUS = 70
  const STROKE = 28
  const CX = 100
  const CY = 100
  const C = 2 * Math.PI * RADIUS

  // Vert forêt / sauge / terracotta — palette harmonisée
  const slices = [
    { label: 'Lipides',   cal: lipCal, color: '#3D8B65', grams: perPortion.graisses || 0 },
    { label: 'Glucides',  cal: gluCal, color: '#6ABFA0', grams: perPortion.glucides  || 0 },
    { label: 'Protéines', cal: proCal, color: '#C8845A', grams: perPortion.proteines || 0 },
  ]

  let offset = 0
  const segments = slices.map((s) => {
    const proportion = isEmpty ? 0 : s.cal / totalCal
    const seg = { ...s, proportion, offset }
    offset += proportion
    return seg
  })

  return (
    <div className="pie-zone-inner">
      <div className="pie-svg-wrapper">
        <svg
          viewBox="0 0 200 200"
          width="240"
          style={{ display: 'block' }}
          aria-label={`Répartition macros : ${kcalPortion} kcal par portion`}
        >
          {/* Piste de fond */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />

          {!isEmpty && segments.map((seg, i) => (
            <circle
              key={seg.label}
              className="pie-segment"
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeDasharray={`${seg.proportion * C} ${C}`}
              strokeDashoffset={-seg.offset * C}
              transform={`rotate(-90, ${CX}, ${CY})`}
              style={{
                '--dash-end': `${-(seg.offset) * C - C + seg.proportion * C}`,
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}

          {/* Valeur kcal au centre */}
          <text
            x={CX}
            y={CY - 7}
            textAnchor="middle"
            dominantBaseline="auto"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '24px',
              fontWeight: 600,
              fill: 'var(--text-h)',
            }}
          >
            {kcalPortion}
          </text>
          <text
            x={CX}
            y={CY + 9}
            textAnchor="middle"
            dominantBaseline="hanging"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '9px',
              letterSpacing: '0.07em',
              fill: 'var(--text)',
            }}
          >
            kcal / portion
          </text>
        </svg>
      </div>

      <div className="pie-legend">
        {isEmpty ? (
          <p className="pie-empty-msg">
            Entrez des valeurs nutritionnelles pour voir la répartition
          </p>
        ) : (
          segments.map((seg) => {
            const pct = totalCal > 0 ? Math.round((seg.cal / totalCal) * 100) : 0
            return (
              <div key={seg.label} className="legend-item">
                <span className="legend-swatch" style={{ background: seg.color }} />
                <span className="legend-label">{seg.label}</span>
                <span className="legend-detail">{seg.grams.toFixed(1)} g</span>
                <span className="legend-pct">{pct}&thinsp;%</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

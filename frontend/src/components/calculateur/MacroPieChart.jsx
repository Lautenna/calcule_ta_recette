import { Group, Stack, Text, Box } from '@mantine/core'
import './pie.css'

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

  const slices = [
    { label: 'Lipides',   cal: lipCal, color: '#3D8B65', grams: perPortion.graisses  || 0 },
    { label: 'Glucides',  cal: gluCal, color: '#6ABFA0', grams: perPortion.glucides   || 0 },
    { label: 'Protéines', cal: proCal, color: '#C8845A', grams: perPortion.proteines  || 0 },
  ]

  let offset = 0
  const segments = slices.map((s) => {
    const proportion = isEmpty ? 0 : s.cal / totalCal
    const seg = { ...s, proportion, offset }
    offset += proportion
    return seg
  })

  return (
    <Group justify="center" align="center" gap={56} wrap="wrap">
      <Box style={{ flexShrink: 0 }}>
        <svg
          viewBox="0 0 200 200"
          width="240"
          style={{ display: 'block' }}
          aria-label={`Répartition macros : ${kcalPortion} kcal par portion`}
        >
          <circle
            cx={CX} cy={CY} r={RADIUS}
            fill="none"
            stroke="var(--mantine-color-default-border)"
            strokeWidth={STROKE}
          />
          {!isEmpty && segments.map((seg, i) => (
            <circle
              key={seg.label}
              className="pie-segment"
              cx={CX} cy={CY} r={RADIUS}
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
          <text
            x={CX} y={CY - 7}
            textAnchor="middle"
            dominantBaseline="auto"
            style={{
              fontFamily: 'var(--mantine-font-family-monospace)',
              fontSize: '24px',
              fontWeight: 600,
              fill: 'var(--mantine-color-text)',
            }}
          >
            {kcalPortion}
          </text>
          <text
            x={CX} y={CY + 9}
            textAnchor="middle"
            dominantBaseline="hanging"
            style={{
              fontFamily: 'var(--mantine-font-family-monospace)',
              fontSize: '9px',
              letterSpacing: '0.07em',
              fill: 'var(--mantine-color-dimmed)',
            }}
          >
            kcal / portion
          </text>
        </svg>
      </Box>

      <Stack gap="lg">
        {segments.map((seg) => {
          const pct = totalCal > 0 ? Math.round((seg.cal / totalCal) * 100) : 0
          return (
            <Group key={seg.label} gap="md" align="center" wrap="nowrap">
              <Box w={14} h={14} style={{ borderRadius: '50%', background: seg.color, flexShrink: 0, opacity: isEmpty ? 0.3 : 1 }} />
              <Text c={isEmpty ? 'dimmed' : undefined} style={{ flex: 1, minWidth: 80 }}>{seg.label}</Text>
              <Text ff="monospace" size="xs" c="dimmed">
                {isEmpty ? '—' : `${seg.grams.toFixed(1)} g`}
              </Text>
              <Text ff="monospace" fz={20} fw={600} miw={56} ta="right" c={isEmpty ? 'dimmed' : undefined}>
                {isEmpty ? '—' : <>{pct}&thinsp;%</>}
              </Text>
            </Group>
          )
        })}
        {isEmpty && (
          <Text size="xs" c="dimmed" ta="center" lh={1.5}>
            Entrez des valeurs nutritionnelles<br />pour voir la répartition
          </Text>
        )}
      </Stack>
    </Group>
  )
}

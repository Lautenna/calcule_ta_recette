import { useState } from 'react'
import { Table, ScrollArea, Button, Group, Text, Box } from '@mantine/core'
import { NUTRIENT_KEYS, NUTRIENT_LABELS, fmt } from '../../utils/nutrition'

const KEY_COLUMNS = ['energie_kcal', 'graisses', 'glucides', 'proteines']
const DETAIL_KEYS  = ['energie_kj', 'graisses_sat', 'sucres', 'sel', 'fibres', 'fer', 'calcium']

const ALL_COLUMNS = [
  { key: 'nom',      label: 'Ingrédient', unit: '',  align: 'left',  detail: false },
  { key: 'quantite', label: 'Qté',         unit: 'g', align: 'right', detail: false },
  ...NUTRIENT_KEYS.map((key) => ({
    key,
    label: NUTRIENT_LABELS[key].label,
    unit:  NUTRIENT_LABELS[key].unit,
    align: 'right',
    detail: DETAIL_KEYS.includes(key),
  })),
]

function fmtCell(key, value) {
  if (key === 'nom') return value || '—'
  if (key === 'quantite') return value > 0 ? value.toFixed(0) : '—'
  return fmt(value)
}

const thStyle = (key) => ({
  fontFamily: 'var(--mantine-font-family-monospace)',
  fontSize: 10,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  background: 'var(--mantine-color-default-hover)',
  color: KEY_COLUMNS.includes(key) ? 'var(--mantine-color-green-7)' : undefined,
  fontWeight: KEY_COLUMNS.includes(key) ? 700 : 500,
})

const tdStyle = (key) => ({
  textAlign: key === 'nom' ? 'left' : 'right',
  fontFamily: key !== 'nom' ? 'var(--mantine-font-family-monospace)' : undefined,
  fontSize: key !== 'nom' ? 13 : 14,
  fontWeight: KEY_COLUMNS.includes(key) ? 600 : undefined,
})

export function NutritionTable({ rows, total, perPortion }) {
  const [showDetail, setShowDetail] = useState(false)
  const columns = ALL_COLUMNS.filter((c) => !c.detail || showDetail)

  return (
    <>
      <Group justify="flex-end" mb="xs">
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          style={{ fontFamily: 'var(--mantine-font-family-monospace)', letterSpacing: '0.06em' }}
          onClick={() => setShowDetail((v) => !v)}
        >
          {showDetail ? '▲ Réduire' : '▼ Détails'} · kJ · graisses sat. · sucres · sel · fibres · fer · calcium
        </Button>
      </Group>

      <Box style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, overflow: 'hidden' }}>
        <ScrollArea>
          <Table style={{ minWidth: 600 }} withRowBorders highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {columns.map(({ key, label, unit, align }) => (
                  <Table.Th key={key} style={{ ...thStyle(key), textAlign: align }}>
                    {label}
                    {unit && (
                      <Text component="span" display="block" fw={400} fz={10} style={{ opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>
                        {unit}
                      </Text>
                    )}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {rows.map((row, i) => (
                <Table.Tr key={i}>
                  {columns.map(({ key }) => (
                    <Table.Td key={key} style={tdStyle(key)}>
                      {fmtCell(key, row[key])}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}

              <Table.Tr style={{ borderTop: '2px solid var(--mantine-color-default-border)', background: 'var(--mantine-color-green-0)' }}>
                {columns.map(({ key }) => (
                  <Table.Td key={key} style={{ ...tdStyle(key), fontWeight: 700 }}>
                    {key === 'nom' ? (
                      <Text ff="monospace" fz={11} tt="uppercase" c="green.7" style={{ letterSpacing: '0.1em' }}>
                        Total recette
                      </Text>
                    ) : (
                      fmtCell(key, total[key])
                    )}
                  </Table.Td>
                ))}
              </Table.Tr>

              <Table.Tr style={{ background: 'rgba(106, 191, 160, 0.12)' }}>
                {columns.map(({ key }) => (
                  <Table.Td key={key} style={tdStyle(key)}>
                    {key === 'nom' ? (
                      <Text ff="monospace" fz={11} tt="uppercase" c="teal" style={{ letterSpacing: '0.1em' }}>
                        {perPortion.nom}
                      </Text>
                    ) : (
                      fmtCell(key, perPortion[key])
                    )}
                  </Table.Td>
                ))}
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Box>
    </>
  )
}

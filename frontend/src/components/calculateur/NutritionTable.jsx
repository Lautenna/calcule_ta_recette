import { useState } from 'react'
import { Table, ScrollArea, Button, Text, Box } from '@mantine/core'
import { NUTRIENT_LABELS, fmt } from '../../utils/nutrition'

const COLUMNS = [
  { key: 'nom',         label: 'Ingrédient', unit: '',    align: 'left'  },
  { key: 'quantite',    label: 'Quantité',   unit: 'g',   align: 'right' },
  { key: 'energie_kcal',label: 'Énergie',    unit: 'kcal',align: 'right' },
  { key: 'graisses',    label: 'Lipides',    unit: 'g',   align: 'right' },
  { key: 'glucides',    label: 'Glucides',   unit: 'g',   align: 'right' },
  { key: 'proteines',   label: 'Protéines',  unit: 'g',   align: 'right' },
]

const KEY_COLS = ['energie_kcal', 'graisses', 'glucides', 'proteines']

function fmtCell(key, value) {
  if (key === 'nom') return value || '—'
  if (key === 'quantite') return value > 0 ? value.toFixed(0) : '—'
  return fmt(value)
}

const thStyle = (key) => ({
  fontFamily: 'var(--mantine-font-family-monospace)',
  fontSize: 11,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  background: 'var(--mantine-color-default-hover)',
  color: KEY_COLS.includes(key) ? 'var(--mantine-color-green-7)' : 'var(--mantine-color-dimmed)',
  fontWeight: KEY_COLS.includes(key) ? 700 : 500,
  padding: '14px 16px',
})

const tdStyle = (key, bold) => ({
  textAlign: key === 'nom' ? 'left' : 'right',
  fontFamily: key !== 'nom' ? 'var(--mantine-font-family-monospace)' : undefined,
  fontSize: key !== 'nom' ? 14 : 14,
  fontWeight: bold || KEY_COLS.includes(key) ? 600 : 400,
  padding: '14px 16px',
  color: key === 'nom' ? undefined : (KEY_COLS.includes(key) ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)'),
})

export function NutritionTable({ rows, total, perPortion }) {
  const [showIngredients, setShowIngredients] = useState(false)

  return (
    <Box style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 10, overflow: 'hidden' }}>
      <ScrollArea>
        <Table style={{ minWidth: 520 }} withRowBorders={false}>
          <Table.Thead>
            <Table.Tr>
              {COLUMNS.map(({ key, label, unit, align }) => (
                <Table.Th key={key} style={{ ...thStyle(key), textAlign: align }}>
                  {label}
                  {unit && (
                    <Text component="span" display="block" fw={400} fz={10} style={{ opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>
                      {unit}
                    </Text>
                  )}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {/* Lignes ingrédients — masquées par défaut */}
            {showIngredients && rows.map((row, i) => (
              <Table.Tr
                key={i}
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)', opacity: 0.75 }}
              >
                {COLUMNS.map(({ key }) => (
                  <Table.Td key={key} style={tdStyle(key, false)}>
                    {fmtCell(key, row[key])}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}

            {/* Séparateur si ingrédients visibles */}
            {showIngredients && (
              <Table.Tr>
                <Table.Td
                  colSpan={COLUMNS.length}
                  style={{ padding: 0, height: 2, background: 'var(--mantine-color-green-2)' }}
                />
              </Table.Tr>
            )}

            {/* Total recette */}
            <Table.Tr style={{ background: 'var(--mantine-color-green-0)' }}>
              {COLUMNS.map(({ key }) => (
                <Table.Td key={key} style={tdStyle(key, true)}>
                  {key === 'nom' ? (
                    <Text ff="monospace" fz={12} tt="uppercase" c="green.7" fw={700} style={{ letterSpacing: '0.12em' }}>
                      Total recette
                    </Text>
                  ) : (
                    fmtCell(key, total[key])
                  )}
                </Table.Td>
              ))}
            </Table.Tr>

            {/* Par portion */}
            <Table.Tr style={{ background: 'rgba(106, 191, 160, 0.12)' }}>
              {COLUMNS.map(({ key }) => (
                <Table.Td key={key} style={tdStyle(key, false)}>
                  {key === 'nom' ? (
                    <Text ff="monospace" fz={12} tt="uppercase" c="teal" fw={600} style={{ letterSpacing: '0.12em' }}>
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

      {/* Toggle détail */}
      <Box
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 0',
          background: 'var(--mantine-color-default-hover)',
        }}
      >
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          style={{ fontFamily: 'var(--mantine-font-family-monospace)', letterSpacing: '0.06em', fontSize: 11 }}
          onClick={() => setShowIngredients((v) => !v)}
        >
          {showIngredients ? '▲ Masquer le détail par ingrédient' : '▼ Voir le détail par ingrédient'}
        </Button>
      </Box>
    </Box>
  )
}

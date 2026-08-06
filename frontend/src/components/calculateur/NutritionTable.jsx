import { useState } from 'react'
import { Table, ScrollArea, Button, Text, Box } from '@mantine/core'
import { fmt } from '../../utils/nutrition'

// `testId` sert de repère aux tests E2E (`data-testid="cellule-<testId>"`) : il
// reprend le vocabulaire affiché (« Lipides ») plutôt que la clé technique
// (`graisses`), et permet de désigner une cellule par son sens au lieu de compter
// les colonnes — l'ordre d'affichage peut changer sans casser les tests.
const COLUMNS = [
  { key: 'nom',          label: 'Ingrédient', unit: '',     align: 'left',  testId: 'ingredient' },
  { key: 'quantite',     label: 'Quantité',   unit: 'g',    align: 'right', testId: 'quantite'   },
  { key: 'energie_kcal', label: 'Énergie',    unit: 'kcal', align: 'right', testId: 'energie'    },
  { key: 'graisses',     label: 'Lipides',    unit: 'g',    align: 'right', testId: 'lipides'    },
  { key: 'glucides',     label: 'Glucides',   unit: 'g',    align: 'right', testId: 'glucides'   },
  { key: 'proteines',    label: 'Protéines',  unit: 'g',    align: 'right', testId: 'proteines'  },
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
  padding: '12px 16px',
})

function per100g(total) {
  const qte = total.quantite || 0
  const result = { quantite: 100 }
  COLUMNS.forEach(({ key }) => {
    if (key === 'nom' || key === 'quantite') return
    result[key] = qte > 0 ? (total[key] || 0) / qte * 100 : 0
  })
  return result
}

export function NutritionTable({ rows, total, perPortion }) {
  const [showIngredients, setShowIngredients] = useState(false)
  const p100 = per100g(total)

  return (
    <Box style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 10, overflow: 'hidden' }}>
      <ScrollArea>
        <Table style={{ minWidth: 520 }} withRowBorders={false} data-testid="tableau-nutritionnel">
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
                data-testid="ligne-ingredient"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                {COLUMNS.map(({ key, testId }) => (
                  <Table.Td
                    key={key}
                    data-testid={`cellule-${testId}`}
                    style={{
                      textAlign: key === 'nom' ? 'left' : 'right',
                      fontFamily: key !== 'nom' ? 'var(--mantine-font-family-monospace)' : undefined,
                      fontSize: 13,
                      padding: '10px 16px',
                      color: 'var(--mantine-color-dimmed)',
                      textTransform: key === 'nom' ? 'capitalize' : undefined,
                    }}
                  >
                    {key === 'nom' ? (
                      <>
                        {row.nom || '—'}
                        {row.isRecette && (
                          <Text component="span" c="green.7" fw={600} fz={11} style={{ textTransform: 'none' }}> (recette)</Text>
                        )}
                      </>
                    ) : (
                      fmtCell(key, row[key])
                    )}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}

            {showIngredients && (
              <Table.Tr>
                <Table.Td
                  colSpan={COLUMNS.length}
                  style={{ padding: 0, height: 2, background: 'var(--mantine-color-green-2)' }}
                />
              </Table.Tr>
            )}

            {/* Total recette + Pour 100g — visibles uniquement en mode détail */}
            {showIngredients && (
              <Table.Tr data-testid="ligne-total" style={{ background: 'var(--mantine-color-default-hover)', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                {COLUMNS.map(({ key, testId }) => (
                  <Table.Td
                    key={key}
                    data-testid={`cellule-${testId}`}
                    style={{
                      textAlign: key === 'nom' ? 'left' : 'right',
                      fontFamily: key !== 'nom' ? 'var(--mantine-font-family-monospace)' : undefined,
                      fontSize: 13,
                      padding: '12px 16px',
                      color: 'var(--mantine-color-dimmed)',
                    }}
                  >
                    {key === 'nom' ? (
                      <Text ff="monospace" fz={11} tt="uppercase" c="dimmed" fw={500} style={{ letterSpacing: '0.1em' }}>
                        Total recette
                      </Text>
                    ) : (
                      fmtCell(key, total[key])
                    )}
                  </Table.Td>
                ))}
              </Table.Tr>
            )}

            {showIngredients && (
              <Table.Tr data-testid="ligne-pour-100g" style={{ background: 'var(--mantine-color-default-hover)', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                {COLUMNS.map(({ key, testId }) => (
                  <Table.Td
                    key={key}
                    data-testid={`cellule-${testId}`}
                    style={{
                      textAlign: key === 'nom' ? 'left' : 'right',
                      fontFamily: key !== 'nom' ? 'var(--mantine-font-family-monospace)' : undefined,
                      fontSize: 13,
                      padding: '12px 16px',
                      color: 'var(--mantine-color-dimmed)',
                    }}
                  >
                    {key === 'nom' ? (
                      <Text ff="monospace" fz={11} tt="uppercase" c="dimmed" fw={500} style={{ letterSpacing: '0.1em' }}>
                        Pour 100g
                      </Text>
                    ) : (
                      fmtCell(key, p100[key])
                    )}
                  </Table.Td>
                ))}
              </Table.Tr>
            )}

            {/* Par portion — mis en avant */}
            <Table.Tr data-testid="ligne-par-portion" style={{ background: 'var(--mantine-color-green-0)' }}>
              {COLUMNS.map(({ key, testId }) => (
                <Table.Td
                  key={key}
                  data-testid={`cellule-${testId}`}
                  style={{
                    textAlign: key === 'nom' ? 'left' : 'right',
                    fontFamily: key !== 'nom' ? 'var(--mantine-font-family-monospace)' : undefined,
                    fontSize: KEY_COLS.includes(key) ? 16 : 14,
                    fontWeight: KEY_COLS.includes(key) ? 700 : 600,
                    padding: '16px 16px',
                    color: KEY_COLS.includes(key) ? 'var(--mantine-color-green-8)' : undefined,
                  }}
                >
                  {key === 'nom' ? (
                    <Text ff="monospace" fz={12} tt="uppercase" c="green.7" fw={700} style={{ letterSpacing: '0.12em' }}>
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

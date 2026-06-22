import { useState } from 'react'
import { NUTRIENT_KEYS, NUTRIENT_LABELS, fmt } from '../../utils/nutrition'

const OPTIONAL_KEYS = ['fibres', 'fer', 'calcium']

const ALL_COLUMNS = [
  { key: 'nom',      label: 'Ingrédient',          unit: '',     align: 'left',  optional: false },
  { key: 'quantite', label: 'Qté',                  unit: 'g',    align: 'right', optional: false },
  ...NUTRIENT_KEYS.map((key) => ({
    key,
    label: NUTRIENT_LABELS[key].label,
    unit:  NUTRIENT_LABELS[key].unit,
    align: 'right',
    optional: OPTIONAL_KEYS.includes(key),
  })),
]

function fmtCell(key, value) {
  if (key === 'nom') return value || '—'
  if (key === 'quantite') return value > 0 ? value.toFixed(0) : '—'
  return fmt(value)
}

function TableRow({ row, className, columns }) {
  return (
    <tr className={className}>
      {columns.map(({ key, unit }) => (
        <td key={key}>
          {fmtCell(key, row[key])}
          {key === 'quantite' && row[key] > 0 ? <span style={{ opacity: 0.5, fontSize: 11, marginLeft: 2 }}>g</span> : null}
        </td>
      ))}
    </tr>
  )
}

export function NutritionTable({ rows, total, perPortion }) {
  const [showOptional, setShowOptional] = useState(false)

  const columns = ALL_COLUMNS.filter((c) => !c.optional || showOptional)

  return (
    <>
      <div className="table-actions">
        <button
          className="btn-toggle-cols"
          onClick={() => setShowOptional((v) => !v)}
        >
          {showOptional ? '▲ Masquer' : '▼ Afficher'} Fibres · Fer · Calcium
        </button>
      </div>
      <div className="table-scroll-wrapper">
        <table className="nutrition-table">
          <thead>
            <tr>
              {columns.map(({ key, label, unit }) => (
                <th key={key}>
                  {label}
                  {unit && <span className="th-unit">{unit}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <TableRow key={i} row={row} columns={columns} />
            ))}
            <TableRow
              row={{ ...total, nom: 'Total recette' }}
              className="row-total"
              columns={columns}
            />
            <TableRow
              row={perPortion}
              className="row-portion"
              columns={columns}
            />
          </tbody>
        </table>
      </div>
    </>
  )
}

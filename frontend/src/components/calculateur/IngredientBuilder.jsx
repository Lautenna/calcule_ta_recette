function IngredientCard({ ingredient, onUpdate, onRemove }) {
  const update = (field) => (e) => onUpdate(ingredient.id, field, e.target.value)

  return (
    <div className="ingredient-card">
      <div className="ingredient-main-row">
        <div className="field-group">
          <label className="field-label" htmlFor={`nom-${ingredient.id}`}>
            Nom du produit
          </label>
          <input
            id={`nom-${ingredient.id}`}
            type="text"
            className="input-text"
            placeholder="ex : Farine T55"
            value={ingredient.nom}
            onChange={update('nom')}
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor={`marque-${ingredient.id}`}>
            Marque
          </label>
          <input
            id={`marque-${ingredient.id}`}
            type="text"
            className="input-text"
            placeholder="Non précisée"
            value={ingredient.marque}
            onChange={update('marque')}
            style={ingredient.marque ? {} : { opacity: 0.6 }}
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor={`qte-${ingredient.id}`}>
            Quantité totale dans la recette (g)
          </label>
          <input
            id={`qte-${ingredient.id}`}
            type="number"
            className="input-number"
            placeholder="0"
            min="0"
            step="1"
            value={ingredient.quantite}
            onChange={update('quantite')}
          />
        </div>
        <button
          className="btn-remove"
          onClick={() => onRemove(ingredient.id)}
          title="Supprimer cet ingrédient"
          aria-label="Supprimer"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export function IngredientBuilder({ ingredients, portions, setPortions, onUpdate, onAdd, onRemove }) {
  return (
    <div className="calculateur-zone">
      <div className="zone-header">
        <p className="zone-eyebrow">Composition de la recette</p>
        <div className="portions-control">
          <label htmlFor="portions">Nombre de portions</label>
          <input
            id="portions"
            type="number"
            className="input-number"
            min="1"
            step="1"
            value={portions}
            onChange={(e) => setPortions(e.target.value)}
          />
        </div>
      </div>

      <div className="ingredient-list">
        {ingredients.map((ingredient) => (
          <IngredientCard
            key={ingredient.id}
            ingredient={ingredient}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </div>

      <button className="btn-add" onClick={onAdd}>
        + Ajouter un ingrédient
      </button>
    </div>
  )
}

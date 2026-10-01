/**
 * Expression régulière ancrée sur un texte donné, pris au pied de la lettre.
 *
 * Sert à filtrer un repère (`data-testid`) sur la DONNÉE qu'il affiche : le
 * repère dit OÙ lire, ce filtre dit LAQUELLE des lignes on vise. L'ancrage rend
 * la comparaison stricte — « Chutney » ne peut pas désigner « Chutney
 * galactique » — et l'échappement met à l'abri les noms qui contiennent des
 * caractères ayant un sens en expression régulière (« Yaourt (nature) »,
 * « Sel + poivre »…), fréquents dans les noms d'aliments.
 */
export function texteExact(valeur) {
  return new RegExp(`^\\s*${String(valeur).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)
}

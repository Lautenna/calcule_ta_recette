/**
 * JDD — profils du calculateur de métabolisme de base.
 *
 * FORMULE DE RÉFÉRENCE (celle du cahier de test, Harris & Benedict) :
 *
 *   Femme : 655,1 + (9,563 × poids) + (1,850 × taille) − (4,676 × âge)
 *   Homme :  66,5 + (13,75 × poids) + (5,003 × taille) − (6,75  × âge)
 *
 *   poids en kg, taille en cm, âge en années, résultat en kcal/jour.
 *
 * Les attendus ci-dessous sont posés À LA MAIN à partir de cette formule, le
 * détail du calcul étant conservé dans le champ `calcul` de chaque profil. Ils
 * ne sont JAMAIS recalculés avec le code de l'application : un test qui
 * réappliquerait la formule de l'application confirmerait n'importe quelle
 * erreur de coefficient au lieu de la détecter.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ARRONDI — pourquoi ces valeurs de mesure, et pas d'autres
 *
 * L'application affiche un entier, et travaille avec les coefficients complets
 * des équations de 1919 (655,0955 / 9,5634 / 1,8496 / 4,6756 côté femme,
 * 66,473 / 13,7516 / 5,0033 / 6,755 côté homme) là où le cahier de test en
 * donne la version arrondie. L'écart entre les deux est infime — moins de
 * 0,2 kcal sur le résultat — mais il suffit à déplacer l'entier affiché de 1
 * quand le résultat exact tombe tout près d'un demi (ex. homme 90 kg / 190 cm /
 * 60 ans : 1849,57 → 1850 attendu, 1849,44 → 1849 affiché).
 *
 * Chaque profil retenu ici donne donc un résultat dont la partie décimale est
 * éloignée de 0,5 d'au moins 0,2 : les deux jeux de coefficients aboutissent au
 * même entier, et l'attendu peut être comparé au strict égal, sans tolérance
 * qui masquerait une vraie erreur de calcul.
 *
 * → Toute mesure ajoutée à ce JDD doit respecter cette contrainte.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Profils enchaînés SUR UNE MÊME PAGE, dans cet ordre.
 *
 * L'ordre fait partie du jeu de données : à partir du 3ᵉ profil, chaque ligne ne
 * modifie qu'UNE donnée par rapport à la précédente (champ `isole`). Le calcul
 * est donc vérifié à la fois sur des profils complets et sur la réaction à un
 * changement isolé — c'est ce qui distingue une valeur réellement recalculée
 * d'une valeur figée depuis la première saisie.
 */
export const profils = [
  {
    cle: 'femme_reference',
    resume: 'une femme de 60 kg, 165 cm, 30 ans',
    isole: 'profil complet',
    sexe: 'Femme',
    poids: '60',
    taille: '165',
    age: '30',
    // 655,1 + 573,78 + 305,25 − 140,28 = 1393,85
    calcul: '655,1 + (9,563 × 60) + (1,850 × 165) − (4,676 × 30) = 1393,85',
    attendu: 1394,
  },
  {
    cle: 'homme_reference',
    resume: 'un homme de 75 kg, 180 cm, 40 ans',
    isole: 'profil complet, sexe et mesures changés',
    sexe: 'Homme',
    poids: '75',
    taille: '180',
    age: '40',
    // 66,5 + 1031,25 + 900,54 − 270 = 1728,29
    calcul: '66,5 + (13,75 × 75) + (5,003 × 180) − (6,75 × 40) = 1728,29',
    attendu: 1728,
  },
  {
    cle: 'femme_35_ans',
    resume: 'une femme de 55 kg, 170 cm, 35 ans',
    isole: 'profil complet, sexe et mesures changés',
    sexe: 'Femme',
    poids: '55',
    taille: '170',
    age: '35',
    // 655,1 + 525,965 + 314,5 − 163,66 = 1331,905
    calcul: '655,1 + (9,563 × 55) + (1,850 × 170) − (4,676 × 35) = 1331,905',
    attendu: 1332,
  },
  {
    cle: 'femme_50_ans',
    resume: 'la même femme, 15 ans de plus (50 ans)',
    // Seul l'âge change : 4,676 × 15 = 70,14 kcal de moins. Un âge ignoré, ou
    // ajouté au lieu d'être soustrait, ne peut pas passer inaperçu ici.
    isole: 'âge seul',
    sexe: 'Femme',
    poids: '55',
    taille: '170',
    age: '50',
    // 655,1 + 525,965 + 314,5 − 233,8 = 1261,765
    calcul: '655,1 + (9,563 × 55) + (1,850 × 170) − (4,676 × 50) = 1261,765',
    attendu: 1262,
  },
  {
    cle: 'homme_50_ans',
    resume: 'un homme de mêmes mesures (55 kg, 170 cm, 50 ans)',
    // Seul le sexe change, à corps identique : le résultat doit basculer sur
    // l'autre équation (+74 kcal). C'est le cas qui démasquerait un sélecteur
    // de sexe purement décoratif.
    isole: 'sexe seul',
    sexe: 'Homme',
    poids: '55',
    taille: '170',
    age: '50',
    // 66,5 + 756,25 + 850,51 − 337,5 = 1335,76
    calcul: '66,5 + (13,75 × 55) + (5,003 × 170) − (6,75 × 50) = 1335,76',
    attendu: 1336,
  },
]

/**
 * Profil partiel : deux mesures sur trois.
 *
 * Sert de garde-fou avant les cas de calcul : tant que l'âge manque, aucune
 * valeur ne doit s'afficher. Une application qui traiterait le champ vide comme
 * un zéro afficherait ici 1496 kcal (655,1 + 525,965 + 314,5, sans rien
 * soustraire) — un chiffre parfaitement plausible à l'œil, et faux de 164 kcal
 * pour une femme de 35 ans, de 234 kcal pour une femme de 50 ans.
 */
export const profilIncomplet = {
  sexe: 'Femme',
  poids: '55',
  taille: '170',
}

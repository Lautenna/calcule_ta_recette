/**
 * JDD — ingrédients manipulés par les tests du calculateur.
 *
 * Comme pour les comptes utilisateurs (fixtures/utilisateurs.js), aucune donnée
 * de test n'est écrite en dur dans les specs : si l'aliment de référence change,
 * on ne corrige qu'ici.
 */

/**
 * Aliment de RÉFÉRENCE, présent dans la table Ciqual (ANSES).
 *
 * Choisi pour une raison précise : `nom=Carotte, crue` ne remonte qu'UN seul
 * résultat (le filtre de l'API cherche « contient »). Un terme plus large comme
 * « carotte » en remonterait une quinzaine, et la suggestion visée pourrait
 * sortir de la page de résultats au fil des mises à jour de la base : le test
 * deviendrait intermittent.
 *
 * Les valeurs nutritionnelles ne sont volontairement PAS recopiées ici. Elles
 * appartiennent au jeu de données de l'ANSES et peuvent changer à chaque
 * réimport : le test les lit dans la réponse de l'API et vérifie que le
 * formulaire affiche exactement ça — c'est précisément le lien à prouver.
 *
 * Précondition : la table `aliment` doit être peuplée
 * (`php bin/console app:import-ciqual` côté backend).
 */
export const alimentCiqual = {
  termeRecherche: 'Carotte, crue',
  nom: 'Carotte, crue',
  groupe: 'légumes crus',
}

/**
 * Correspondance entre les champs obligatoires du formulaire et les propriétés
 * de la ressource `Aliment` de l'API.
 *
 * Le formulaire parle de « Lipides » là où l'API expose `graisses` : ce décalage
 * de vocabulaire est documenté ici plutôt que dispersé dans les assertions.
 */
export const PROPRIETE_API = {
  energie: 'energie_kcal',
  proteines: 'proteines',
  glucides: 'glucides',
  lipides: 'graisses',
}

/**
 * Ingrédient INVENTÉ — il ne doit exister dans aucune base (ni Ciqual, ni
 * OpenFoodFacts).
 *
 * C'est tout l'objet des cas de saisie manuelle : l'utilisateur doit pouvoir
 * décrire un produit que l'application ne connaît pas (une préparation maison,
 * un produit régional…). Le nom est volontairement farfelu et suffisamment long
 * pour qu'aucune recherche « contient » ne puisse le faire correspondre à un
 * aliment réel.
 */
export const ingredientInvente = {
  nom: 'Cassoulet lunaire de Tante Huguette',
  quantite: '75',
  /**
   * Valeurs pour 100 g, saisies à la main (clés = champs du formulaire).
   */
  nutrition: {
    energie: '210',
    proteines: '11',
    glucides: '18',
    lipides: '9',
  },
}

/**
 * Quantité utilisée quand le test a besoin d'une valeur valide sans que le
 * chiffre lui-même ait d'importance.
 */
export const quantiteValide = '150'

/**
 * Deux ingrédients inventés DISTINCTS, pour les scénarios à plusieurs lignes.
 *
 * Les noms doivent être discernables à l'écran : c'est ainsi que le test vérifie
 * que la suppression a bien retiré la bonne ligne — et seulement celle-là.
 */
export const ingredientsMultiples = {
  /** Celui qui doit survivre à la suppression. */
  conserve: {
    nom: 'Velouté martien de Tonton Marcel',
    quantite: '120',
    nutrition: { energie: '95', proteines: '4', glucides: '12', lipides: '3' },
  },
  /** Celui que le test supprime. */
  supprime: {
    nom: 'Beignet sidéral du Père Ernest',
    quantite: '60',
    nutrition: { energie: '410', proteines: '6', glucides: '45', lipides: '22' },
  },
}

/**
 * Ingrédient du parcours « enregistrer dans mes ingrédients ».
 *
 * Nom PROPRE à ce parcours, distinct de `ingredientInvente` : le test le crée
 * réellement en base, et le supprime avant et après son exécution. Un nom
 * partagé avec un autre test rendrait ce nettoyage ambigu.
 */
export const ingredientAEnregistrer = {
  nom: 'Chutney galactique de Mamie Solange',
  quantite: '90',
  /** Premier mot du nom : suffit à retrouver l'ingrédient en suggestion. */
  termeRecherchePartiel: 'Chutney',
  nutrition: { energie: '175', proteines: '3', glucides: '38', lipides: '2' },
}

/**
 * Recette de CALCUL — le jeu de données des cas TC_RECETTE_003 et 004.
 *
 * Contrairement aux autres fixtures, les attendus sont ici écrits en dur : c'est
 * tout l'objet de ces cas de test. Une valeur relue à l'écran ou recalculée avec
 * la même formule que l'application ne prouverait rien — un calcul faux resterait
 * faux « de façon cohérente ». Les chiffres ci-dessous ont donc été posés à la
 * main, et chacun est traçable jusqu'à la saisie.
 *
 * Les nombres sont choisis pour trois raisons :
 *
 *  1. quantités ≠ 100 g (250 et 150) — sinon la mise à l'échelle « pour 100 g »
 *     serait une multiplication par 1, et une application qui l'oublierait
 *     passerait quand même le test ;
 *  2. tous les résultats tombent sur au plus une décimale — l'affichage arrondit
 *     au dixième, l'attendu est donc exactement ce qui doit apparaître ;
 *  3. aucune ligne du tableau n'a les mêmes valeurs qu'une autre (ni entre les
 *     deux ingrédients, ni entre TOTAL, POUR 100 G et PAR PORTION) — un test qui
 *     lirait la mauvaise ligne échoue, au lieu de passer par coïncidence.
 *
 * Aucun compte nécessaire : le calculateur est public.
 */
export const recetteACalculer = {
  ingredients: [
    {
      nom: 'Purée cosmique de Cousine Berthe',
      quantite: '250',
      /** Valeurs pour 100 g saisies dans le formulaire. */
      nutrition: { energie: '200', proteines: '8', glucides: '40', lipides: '4' },
      /** Contribution réelle = valeurs pour 100 g × 250 / 100, soit × 2,5. */
      contribution: { quantite: 250, energie: 500, lipides: 10, glucides: 100, proteines: 20 },
    },
    {
      nom: 'Tourte stellaire de Parrain Aimé',
      quantite: '150',
      nutrition: { energie: '300', proteines: '20', glucides: '20', lipides: '20' },
      /** × 150 / 100, soit × 1,5. */
      contribution: { quantite: 150, energie: 450, lipides: 30, glucides: 30, proteines: 30 },
    },
  ],

  /** Somme des deux contributions : 250 + 150 g, 500 + 450 kcal, etc. */
  total: { quantite: 400, energie: 950, lipides: 40, glucides: 130, proteines: 50 },

  /** Total ramené à 100 g : × 100 / 400, soit ÷ 4. */
  pour100g: { quantite: 100, energie: 237.5, lipides: 10, glucides: 32.5, proteines: 12.5 },

  /**
   * Total ÷ nombre de portions. Deux réglages, dans cet ordre : le second prouve
   * que l'application recalcule quand l'utilisateur change le curseur, au lieu
   * de figer le résultat du premier affichage.
   */
  parPortion: [
    {
      portions: 5,
      attendu: { quantite: 80, energie: 190, lipides: 8, glucides: 26, proteines: 10 },
    },
    {
      portions: 2,
      attendu: { quantite: 200, energie: 475, lipides: 20, glucides: 65, proteines: 25 },
    },
  ],
}

/**
 * Réglage de `recetteACalculer` retenu pour la recette enregistrée — 5 portions.
 *
 * Retrouvé par sa valeur plutôt que par son indice : réordonner `parPortion`
 * n'aura ainsi aucun effet silencieux sur l'attendu ci-dessous.
 */
const PAR_PORTION_ENREGISTREE = recetteACalculer.parPortion.find(({ portions }) => portions === 5)

/**
 * Recette du parcours « enregistrer une recette dans mon profil »
 * (TC_RECETTE_001 et 002).
 *
 * Elle REPREND la composition de `recetteACalculer`, et c'est délibéré : ses
 * totaux sont déjà posés à la main et vérifiés par TC_RECETTE_004. On peut donc
 * s'en servir comme empreinte de la recette — si elle ressort du profil avec le
 * même total et le même « par portion », c'est que rien ne s'est perdu à
 * l'enregistrement.
 *
 * Le nom, lui, est PROPRE à ce parcours : le test crée réellement la recette en
 * base et la supprime avant et après son exécution. Un nom partagé avec un autre
 * test rendrait ce nettoyage ambigu.
 *
 * `portions` vaut volontairement 5, et non 4 : 4 est la valeur par défaut du
 * calculateur, et une application qui n'enregistrerait pas le nombre de portions
 * afficherait quand même le bon chiffre à la réouverture.
 */
export const recetteAEnregistrer = {
  nom: 'Festin galactique de Mamie Solange',
  portions: 5,
  /** Composition : les deux ingrédients de `recetteACalculer`. */
  ingredients: recetteACalculer.ingredients,
  /** Résumé attendu sous le nom, dans « Mes recettes ». */
  resume: '5 portions · 2 ingrédients',
  /** Empreinte de la recette au retour du profil (cf. TC_RECETTE_003 et 004). */
  total: recetteACalculer.total,
  parPortion: PAR_PORTION_ENREGISTREE.attendu,
}

/**
 * La MÊME recette, sous un nom qui ne doit jamais apparaître en base : c'est
 * celle du cas non connecté (TC_RECETTE_002).
 *
 * Nom distinct du cas nominal, pour la raison qui sépare déjà `inscriptionValide`
 * de `nouveauCompte` côté comptes : ce cas prouve une ABSENCE en base, et cette
 * preuve doit tenir même si le cas nominal tourne en parallèle sur un autre
 * poste.
 */
export const recetteRefusee = {
  ...recetteAEnregistrer,
  nom: 'Banquet fantôme de Tonton Léon',
}

/**
 * Recette enregistrée réutilisée COMME ingrédient (parcours « Recette » du
 * calculateur), appartenant à `utilisateurAvecRecette`.
 *
 * La recette est amorcée par seed.sql. Sa composition (150 g + 50 g, valeurs
 * volontairement rondes) est calibrée pour que le profil calculé par
 * l'application pour 100 g tombe juste — l'attendu ci-dessous est donc obtenu à
 * la main, sans reproduire le calcul de l'application :
 *
 *   total 200 g → 300 kcal / P 30 g / G 30 g / L 20 g
 *   pour 100 g  → 150 kcal / P 15 g / G 15 g / L 10 g
 *
 * Le détail du calcul est documenté dans seed.sql, à côté de la composition.
 */
export const recetteEnregistree = {
  nom: 'Base E2E réutilisable',
  quantite: '200',
  profilPour100g: { energie: '150', proteines: '15', glucides: '15', lipides: '10' },
}

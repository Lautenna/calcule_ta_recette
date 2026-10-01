/**
 * JDD — codes-barres et produits OpenFoodFacts manipulés par les tests.
 *
 * Comme pour les autres JDD (fixtures/ingredients.js), rien n'est écrit en dur
 * dans les specs : si le produit de référence change, on ne corrige qu'ici.
 */

/**
 * Produit de RÉFÉRENCE, présent dans OpenFoodFacts (OFF).
 *
 * Le Nutella 400 g est choisi pour sa stabilité : c'est l'un des produits les
 * mieux renseignés de la base (nom, marque, photo et valeurs nutritionnelles
 * complètes), et son code-barres est un EAN-13 valide — indispensable pour le
 * cas « scan », où le test doit produire une image réellement décodable.
 *
 * Les valeurs nutritionnelles ne sont volontairement PAS recopiées : elles
 * appartiennent à OFF et sont modifiables par n'importe quel contributeur. Les
 * tests les lisent dans la réponse de l'API et vérifient que le formulaire
 * affiche exactement ça — c'est précisément le lien à prouver.
 */
export const produitCodeBarres = {
  codeBarres: '3017620422003',
  /**
   * Nom attendu, en souplesse : OFF laisse ses contributeurs le retoucher
   * (« Nutella », « Nutella pâte à tartiner »…). On vérifie donc qu'on parle
   * bien du bon produit, sans dépendre du libellé exact.
   */
  motifNom: /nutella/i,
}

/**
 * Longueur MINIMALE d'un code-barres accepté : 8 chiffres (format EAN-8).
 *
 * Ce seuil est celui de l'application, du bouton de recherche jusqu'au contrôle
 * du backend (`ProduitProvider`, motif `^\d{8,14}$`). Les deux codes ci-dessous
 * en sont dérivés — c'est le MÊME code, tronqué de part et d'autre du seuil :
 * le test aux limites se lit ainsi sans avoir à comparer deux nombres étrangers
 * l'un à l'autre.
 */
export const SEUIL_LONGUEUR_CODE = 8

/** Un chiffre de moins que le seuil : la recherche doit rester impossible. */
export const codeBarresTropCourt = produitCodeBarres.codeBarres.slice(0, SEUIL_LONGUEUR_CODE - 1)

/**
 * Pile le seuil : la recherche doit devenir possible.
 *
 * Peu importe ici ce qu'OpenFoodFacts répond — le cas de test ne vérifie que le
 * franchissement du seuil, c'est-à-dire que l'application interroge l'API.
 */
export const codeBarresAuSeuil = produitCodeBarres.codeBarres.slice(0, SEUIL_LONGUEUR_CODE)

/**
 * Code-barres au format VALIDE mais inconnu d'OpenFoodFacts.
 *
 * Treize zéros : la clé de contrôle (0) est juste, le format passe donc les
 * contrôles du frontend comme du backend. Seul OFF peut dire qu'il ne connaît
 * pas ce produit — c'est exactement le chemin qu'on veut éprouver.
 *
 * Un code « au hasard » ne conviendrait pas : OFF est alimenté par ses
 * contributeurs et connaît des produits jusque dans les codes improbables
 * (9999999999994, par exemple, y désigne un vrai yaourt). Ce code-ci a été
 * vérifié introuvable le 05/08/2026 ; si un contributeur venait à l'enregistrer,
 * le test le signalerait comme une précondition rompue.
 */
export const codeBarresInconnu = '0000000000000'

// ─────────────────────────────────────────────────────────────────────────────
// Encodage EAN-13
//
// Nécessaire au seul cas « scan » : pour que l'application scanne un
// code-barres, il faut lui en présenter un VRAI devant la caméra. On génère donc
// le motif de barres à partir du chiffre, plutôt que d'embarquer une image
// opaque dans le dépôt — un motif calculé se relit, se vérifie, et suit
// automatiquement le JDD ci-dessus.
// ─────────────────────────────────────────────────────────────────────────────

/** Codes des chiffres 0 à 9, moitié gauche, jeu impair (dit « L »). */
const CODES_L = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
]

/** Codes des chiffres 0 à 9, moitié gauche, jeu pair (dit « G »). */
const CODES_G = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
]

/** Codes de la moitié droite (dits « R ») : le complément binaire des « L ». */
const CODES_R = CODES_L.map((code) => code.replace(/[01]/g, (bit) => (bit === '0' ? '1' : '0')))

/**
 * Alternance des jeux L/G des six chiffres de gauche, choisie par le PREMIER
 * chiffre du code. C'est cette alternance qui permet à un lecteur de retrouver
 * ce premier chiffre, qui n'est lui-même dessiné nulle part.
 */
const ALTERNANCES = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
]

const GARDE_LATERALE = '101'
const GARDE_CENTRALE = '01010'

/**
 * Clé de contrôle EAN-13 : les 12 premiers chiffres, pondérés alternativement
 * par 1 et 3, complétés à la dizaine supérieure.
 */
function cleDeControle(code) {
  const somme = [...code.slice(0, 12)]
    .reduce((total, chiffre, rang) => total + Number(chiffre) * (rang % 2 === 0 ? 1 : 3), 0)

  return (10 - (somme % 10)) % 10
}

/**
 * Motif de barres d'un code-barres EAN-13 : 95 modules de même largeur, où 1
 * signifie « barre noire » et 0 « espace blanc ».
 *
 * La validité du code est vérifiée ici (13 chiffres + clé de contrôle) : un JDD
 * mal recopié échoue alors avec un diagnostic clair, plutôt que de produire une
 * image indéchiffrable et un test qui expire sans expliquer pourquoi.
 */
export function motifEan13(code) {
  if (!/^\d{13}$/.test(code)) {
    throw new Error(`JDD invalide : « ${code} » n'est pas un EAN-13 (13 chiffres attendus).`)
  }

  const cleAttendue = cleDeControle(code)
  if (Number(code[12]) !== cleAttendue) {
    throw new Error(
      `JDD invalide : la clé de contrôle de « ${code} » devrait être ${cleAttendue}, `
      + `et non ${code[12]}.`,
    )
  }

  const chiffres = [...code].map(Number)
  const alternance = ALTERNANCES[chiffres[0]]

  const gauche = chiffres.slice(1, 7)
    .map((chiffre, rang) => (alternance[rang] === 'L' ? CODES_L : CODES_G)[chiffre])
    .join('')

  const droite = chiffres.slice(7).map((chiffre) => CODES_R[chiffre]).join('')

  const motif = GARDE_LATERALE + gauche + GARDE_CENTRALE + droite + GARDE_LATERALE

  return [...motif].map(Number)
}

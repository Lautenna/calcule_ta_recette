import { expect } from '@playwright/test'
import { CarteIngredient } from './CarteIngredient'
import { texteExact } from './texteExact'

/**
 * Colonnes du tableau nutritionnel.
 *
 * Ce ne sont pas des indices mais les repères que l'application pose sur ses
 * cellules (`data-testid="cellule-energie"`, cf. NutritionTable.jsx) : une
 * cellule se désigne donc par son sens, et non par son rang. Réordonner les
 * colonnes à l'écran ne casse plus aucun test — et, surtout, ne fait plus lire
 * silencieusement la mauvaise valeur.
 */
const COLONNES = ['ingredient', 'quantite', 'energie', 'lipides', 'glucides', 'proteines']

/**
 * Colonnes chiffrées du tableau : toutes sauf le nom de l'ingrédient. Ce sont
 * les seules qu'un test de calcul peut confronter à un attendu.
 */
const COLONNES_CHIFFREES = COLONNES.filter((colonne) => colonne !== 'ingredient')

/**
 * Convertit une cellule du tableau en nombre. Le tiret cadratin « — » que
 * l'application affiche à la place d'un zéro devient 0 : sans cette conversion,
 * l'absence de valeur serait indiscernable d'une valeur illisible.
 */
function versNombre(texte) {
  const nettoye = texte.trim()
  if (nettoye === '—' || nettoye === '') return 0

  return Number.parseFloat(nettoye.replace(',', '.'))
}

/**
 * Page Object du calculateur (/calculateur).
 *
 * Page publique : aucune session n'est nécessaire pour composer une recette.
 * Les tests de saisie manuelle s'exécutent donc en visiteur anonyme, ce qui les
 * rend indépendants du JDD des comptes utilisateurs.
 */
export class CalculateurPage {
  constructor(page) {
    this.page = page

    /**
     * Titre de la page. Il annonce ce que fait le calculateur, ou le nom de la
     * recette ouverte en modification : un seul repère, deux textes possibles —
     * c'est `titreModification()` qui distingue le second.
     */
    this.titre = page.getByTestId('titre-calculateur')

    /** Toutes les cartes ingrédient de la page, dans l'ordre d'affichage. */
    this.cartes = page.getByTestId('carte-ingredient')

    /**
     * La première carte — la seule présente à l'ouverture de la page.
     * Les scénarios à plusieurs lignes passent par `carte(indice)`.
     */
    this.carteIngredient = this.carte(0)

    this.boutonAjouterIngredient = page.getByTestId('bouton-ajouter-ingredient')

    // ── Enregistrement de la recette ──────────────────────────────────────────
    /**
     * Nom de la recette, dans le bandeau « Composition de la recette ».
     *
     * Repéré par `data-testid` : la fenêtre « Donnez un nom à votre recette »
     * propose un second champ pour la même donnée, et ni le libellé ni le
     * placeholder ne distinguent les deux à coup sûr.
     */
    this.champNomRecette = page.getByTestId('champ-nom-recette')

    this.boutonEnregistrerRecette = page.getByTestId('bouton-enregistrer-recette')

    /**
     * Le même bouton APRÈS un premier enregistrement : l'application change son
     * repère en même temps que son libellé. Son apparition est donc le témoin,
     * côté écran, que l'application a bien retenu QUELLE recette elle vient de
     * créer — sans quoi un second clic en créerait un doublon.
     */
    this.boutonMettreAJour = page.getByTestId('bouton-mettre-a-jour')

    /** Proposé une fois une recette en cours d'édition : repartir de zéro. */
    this.boutonNouvelleRecette = page.getByTestId('bouton-nouvelle-recette')

    /**
     * Bandeau de notification (rôle ARIA « alert ») : l'application y annonce le
     * résultat d'une action — enregistrement réussi, échec…
     *
     * Pas de `data-testid` ici : le rôle « alert » n'est pas qu'un moyen de
     * trouver l'élément, c'est ce qui fait annoncer le message par un lecteur
     * d'écran. Le vérifier fait partie du test.
     */
    this.notification = page.getByRole('alert')

    /**
     * Mention affichée au visiteur anonyme : l'application annonce elle-même
     * qu'une connexion sera proposée s'il tente de mémoriser un ingrédient.
     *
     * Le repère dit OÙ regarder, sans rien supposer de la formulation ; c'est le
     * test qui, s'il tient à la promesse faite à l'utilisateur, en confronte le
     * texte à son attendu.
     */
    this.mentionConnexionProposee = page.getByTestId('mention-connexion-proposee')

    // ── Tableau nutritionnel ──────────────────────────────────────────────────
    /**
     * Le tableau nutritionnel, et la racine de toutes ses lignes : un repère de
     * ligne ne peut donc jamais désigner autre chose qu'une ligne DE ce tableau.
     */
    this.tableau = page.getByTestId('tableau-nutritionnel')

    /**
     * Ligne « PAR PORTION » du tableau : la seule toujours visible (le détail par
     * ingrédient est replié par défaut). C'est le résultat que l'utilisateur
     * vient chercher, donc le bon endroit pour vérifier qu'une saisie est
     * réellement prise en compte dans le calcul.
     */
    this.ligneParPortion = this.tableau.getByTestId('ligne-par-portion')

    /**
     * Ligne « Total recette » : le poids et les macros de la recette entière,
     * avant division par le nombre de portions. Visible uniquement une fois le
     * détail déplié (cf. `afficherDetailParIngredient`).
     */
    this.ligneTotal = this.tableau.getByTestId('ligne-total')

    /** Ligne « Pour 100g » : le total ramené à 100 g. Idem, détail déplié. */
    this.lignePour100g = this.tableau.getByTestId('ligne-pour-100g')

    /** Les lignes de détail, une par ingrédient de la recette. */
    this.lignesIngredient = this.tableau.getByTestId('ligne-ingredient')

    /**
     * Bascule d'affichage du détail par ingrédient (replié par défaut).
     *
     * Un seul bouton, mais deux repères selon l'état du tableau : ce que les
     * tests observent, c'est le basculement, pas la flèche ni le libellé.
     */
    this.boutonVoirDetail = page.getByTestId('bouton-voir-detail')
    this.boutonMasquerDetail = page.getByTestId('bouton-masquer-detail')

    /**
     * Curseur « Nombre de portions ».
     *
     * Le `data-testid` délimite le composant ; à l'intérieur, la poignée reste
     * cherchée par son rôle ARIA `slider`. Ce n'est pas un repli sur l'ancien
     * sélecteur : c'est ce rôle qui porte la valeur courante (`aria-valuenow`)
     * et rend le réglage possible au clavier — donc testable sans simuler un
     * glisser-déposer à la souris, dont le résultat dépendrait de la largeur de
     * la fenêtre. Le vérifier fait partie du test.
     */
    this.curseurPortions = page.getByTestId('curseur-portions').getByRole('slider')

    /** Réglage courant rappelé au-dessus du curseur. */
    this.valeurPortions = page.getByTestId('portions-valeur')
  }

  /**
   * Page Object de la n-ième carte ingrédient (0 = la première).
   *
   * Chaque carte a le sien : les sélecteurs d'une carte ne peuvent alors pas
   * déborder sur une voisine, et un test à plusieurs lignes désigne celle qu'il
   * manipule au lieu de compter sur le fait qu'une seule est ouverte à la fois.
   */
  carte(indice = 0) {
    return new CarteIngredient(this.page, indice)
  }

  /** Ouvre le calculateur et attend que la page soit utilisable. */
  async aller() {
    await this.page.goto('/calculateur')
    await expect(this.titre).toBeVisible()
  }

  /**
   * Titre affiché quand le calculateur est ouvert SUR une recette existante
   * (arrivée depuis « Mes recettes »). Il nomme la recette : c'est le repère qui
   * distingue une consultation d'une nouvelle saisie.
   */
  titreModification(nom) {
    return this.titre.filter({ hasText: texteExact(`Modifier « ${nom} »`) })
  }

  /**
   * Compose une recette entière : une carte par ingrédient, chacune renseignée
   * puis validée.
   *
   * Préalable commun à plusieurs cas, et la saisie n'y est jamais l'objet du
   * test : elle est déjà couverte par TC_INGREDIENT_001 à 005. Chaque ingrédient
   * est saisi dans SA carte (`carte(indice)`), ce qui garantit qu'aucune valeur
   * n'atterrit dans une autre ligne.
   */
  async composer(ingredients) {
    for (const [indice, ingredient] of ingredients.entries()) {
      if (indice > 0) await this.boutonAjouterIngredient.click()
      await this.carte(indice).saisirEtValider(ingredient)
    }

    await expect(this.cartes, `la recette doit compter ${ingredients.length} ligne(s)`)
      .toHaveCount(ingredients.length)
  }

  /**
   * Requêtes d'enregistrement de recette réellement émises par l'application.
   *
   * L'écran ne peut pas prouver qu'aucun enregistrement n'a été tenté : sans
   * session, un appel partirait, échouerait en 401, et l'utilisateur n'en verrait
   * rien. On écoute donc le réseau — à installer AVANT l'action observée.
   */
  espionnerEnregistrementRecette() {
    const tentatives = []
    this.page.on('request', (requete) => {
      if (requete.method() === 'POST' && requete.url().includes('/api/recettes')) {
        tentatives.push(requete.url())
      }
    })

    return tentatives
  }

  /**
   * Cellule d'une ligne du tableau, désignée par le sens de sa colonne.
   */
  cellule(ligne, colonne) {
    if (!COLONNES.includes(colonne)) throw new Error(`Colonne inconnue : « ${colonne} »`)

    return ligne.getByTestId(`cellule-${colonne}`)
  }

  /**
   * Cellule de la ligne « PAR PORTION » pour une colonne donnée.
   */
  celluleParPortion(colonne) {
    return this.cellule(this.ligneParPortion, colonne)
  }

  /**
   * Valeur numérique affichée dans la ligne « PAR PORTION », ou 0 quand la
   * cellule affiche « — » (rien à calculer).
   *
   * On lit et convertit le nombre affiché au lieu de recalculer l'attendu : le
   * test n'a pas à reproduire les arrondis de l'application, il vérifie
   * seulement qu'un résultat apparaît — ou pas.
   */
  async valeurParPortion(colonne) {
    return versNombre(await this.celluleParPortion(colonne).innerText())
  }

  /**
   * Déplie le détail par ingrédient. Il est replié à l'ouverture de la page :
   * sans ce dépliement, les lignes par ingrédient, « Total recette » et
   * « Pour 100g » ne sont pas dans le DOM.
   *
   * Sans effet si le détail est déjà affiché — un test peut donc l'appeler sans
   * se soucier de l'état laissé par l'étape précédente.
   */
  async afficherDetailParIngredient() {
    if (await this.boutonVoirDetail.isVisible()) {
      await this.boutonVoirDetail.click()
    }
    await expect(this.ligneTotal, 'le détail par ingrédient doit être affiché').toBeVisible()
  }

  /**
   * Ligne du détail correspondant à un ingrédient, retrouvée par son nom parmi
   * les SEULES lignes d'ingrédient.
   *
   * Le repère de ligne fait le tri en amont : le nom cherché ne peut plus
   * ramener « Total recette », « Pour 100g » ou la ligne par portion, même si
   * l'une d'elles contenait le même texte.
   */
  ligneIngredient(nom) {
    return this.lignesIngredient.filter({ hasText: nom })
  }

  /**
   * Toutes les valeurs chiffrées d'une ligne du tableau, indexées par nom de
   * colonne — de quoi confronter une ligne entière à un attendu d'un seul coup,
   * et voir en cas d'échec quelle colonne diverge.
   */
  async valeursDe(ligne) {
    const lignesTrouvees = await ligne.count()
    if (lignesTrouvees !== 1) {
      throw new Error(
        `Le sélecteur désigne ${lignesTrouvees} ligne(s) au lieu d'une seule :`
        + ' impossible de lire des valeurs sans ambiguïté.',
      )
    }

    const valeurs = {}
    for (const colonne of COLONNES_CHIFFREES) {
      valeurs[colonne] = versNombre(await this.cellule(ligne, colonne).innerText())
    }
    return valeurs
  }

  /**
   * Règle le nombre de portions AU CLAVIER : `Home` ramène le curseur à son
   * minimum (1 portion), puis une flèche droite par portion supplémentaire.
   *
   * Partir du minimum plutôt que de la valeur courante rend le réglage
   * indépendant de l'état précédent, et vérifie au passage que le curseur reste
   * utilisable sans souris.
   */
  async reglerPortions(nombre) {
    await this.curseurPortions.press('Home')
    for (let portion = 1; portion < nombre; portion += 1) {
      await this.curseurPortions.press('ArrowRight')
    }

    await expect(this.curseurPortions, `le curseur doit être positionné sur ${nombre}`)
      .toHaveAttribute('aria-valuenow', String(nombre))
    await expect(this.valeurPortions, `l’écran doit annoncer ${nombre} portions`)
      .toHaveText(String(nombre))
  }

  /**
   * Roue de répartition des macronutriments, identifiée par ce qu'elle annonce
   * aux technologies d'assistance : l'énergie par portion.
   *
   * Volontairement PAS un `data-testid` : ici, le nom accessible porte lui-même
   * la valeur à vérifier. S'en servir comme repère prouve du même coup qu'un
   * utilisateur de lecteur d'écran obtient bien le chiffre que les autres lisent
   * dans la roue.
   *
   * C'est le second endroit où cette valeur apparaît. La comparer à celle du
   * tableau vérifie que les deux affichages découlent bien du même calcul.
   */
  roueMacros(kcalParPortion) {
    return this.page.getByLabel(`Répartition macros : ${kcalParPortion} kcal par portion`)
  }
}

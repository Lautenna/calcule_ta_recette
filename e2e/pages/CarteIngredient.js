import { expect } from '@playwright/test'
import { texteExact } from './texteExact'

/**
 * Les quatre valeurs nutritionnelles OBLIGATOIRES de la carte ingrédient, dans
 * l'ordre d'affichage du formulaire.
 *
 * `cle` est le nom court utilisé par les tests, le JDD et le `data-testid` du
 * champ ; `libelle` est le libellé réellement affiché — il ne sert plus à
 * localiser quoi que ce soit, seulement à nommer le champ dans les messages
 * d'échec, pour qu'un rapport parle la langue de l'écran.
 */
export const CHAMPS_NUTRITION = [
  { cle: 'energie', libelle: 'Énergie (kcal)' },
  { cle: 'proteines', libelle: 'Protéines (g)' },
  { cle: 'glucides', libelle: 'Glucides (g)' },
  { cle: 'lipides', libelle: 'Lipides (g)' },
]

/**
 * Page Object d'UNE carte ingrédient du calculateur.
 *
 * La carte est un petit assistant en plusieurs étapes :
 *
 *   1. « Quel type ? »                   → Ingrédient ou Recette
 *   2. « Comment identifier ? »          → Code-barres ou Chercher / saisir
 *   3. Nom + quantité + valeurs nutritionnelles, puis « Terminer »
 *
 * Une fois validée, la carte se replie sur une ligne de synthèse : c'est ce
 * repliement qui sert de témoin de validation dans les tests (`boutonModifier`).
 *
 * ── PORTÉE ──────────────────────────────────────────────────────────────────
 * L'application marque chaque carte d'un `data-testid="carte-ingredient"`, posé
 * sur sa racine dans ses deux vues (repliée et déployée). Ce repère délimite la
 * carte, ce qu'aucun rôle ARIA ni aucun libellé ne permet de faire : une carte
 * n'est ni une région, ni un formulaire nommé, et deux cartes affichent
 * exactement les mêmes libellés. Une instance de cette classe pilote donc la
 * n-ième carte, et ses sélecteurs ne peuvent pas déborder sur une voisine —
 * là où des sélecteurs à l'échelle de la page dépendraient du fait qu'une seule
 * carte est ouverte à la fois.
 *
 * Deux familles d'éléments échappent volontairement à ce cadrage, parce que
 * l'application les rend hors de la carte, à la racine du document :
 *
 *   - les suggestions des listes déroulantes (`withinPortal`) ;
 *   - la fenêtre modale du scanner.
 *
 * Ils sont cherchés dans la page entière, ce qui reste sans ambiguïté : une
 * seule liste, un seul scanner peuvent être ouverts à la fois.
 */
export class CarteIngredient {
  constructor(page, indice = 0) {
    this.page = page
    this.indice = indice

    /**
     * Toutes les cartes de la page, dans l'ordre d'affichage. Leur NOMBRE est
     * l'état que vérifient les tests d'ajout et de suppression : c'est le repère
     * direct, là où compter des boutons « Supprimer » n'en était qu'un indice.
     */
    this.cartes = page.getByTestId('carte-ingredient')

    /** La carte pilotée par cette instance — racine de tous les sélecteurs. */
    this.racine = this.cartes.nth(indice)

    // ── Étape 1 : type de ligne ────────────────────────────────────────────────
    this.choixTypeIngredient = this.racine.getByTestId('choix-type-ingredient')
    this.choixTypeRecette = this.racine.getByTestId('choix-type-recette')

    /**
     * Étapes de l'assistant, repérées par leur `data-testid` plutôt que par le
     * texte de leur titre : ce que le test affirme, c'est « la carte en est à
     * telle étape », pas « telle phrase est affichée ». Une reformulation du
     * titre ne doit pas casser le test — ni, pire, le faire passer à tort dans
     * les assertions d'absence (`toBeHidden`).
     */
    this.etapeChoixType = this.racine.getByTestId('etape-type')
    this.etapeMethode = this.racine.getByTestId('etape-methode')
    this.etapeRecette = this.racine.getByTestId('etape-recette')
    this.etapeCodeBarres = this.racine.getByTestId('etape-code-barres')
    this.etapeSaisie = this.racine.getByTestId('etape-saisie')

    // ── Étape 2 : méthode d'identification ────────────────────────────────────
    this.choixChercherSaisir = this.racine.getByTestId('choix-methode-recherche')
    this.choixCodeBarres = this.racine.getByTestId('choix-methode-code-barres')

    // ── Étape 2c : code-barres (saisie au clavier ou scan) ────────────────────
    this.champCodeBarres = this.racine.getByTestId('champ-code-barres')
    this.boutonRechercherProduit = this.racine.getByTestId('bouton-rechercher-produit')

    /**
     * Ouvre le scanner (caméra) depuis l'étape « Code-barres ». L'étape 3 en
     * propose un second, à côté du champ nom : chacun a son repère, ce qui lève
     * une ambiguïté que leurs libellés ne réglaient qu'à moitié.
     */
    this.boutonOuvrirScanner = this.racine.getByTestId('bouton-ouvrir-scanner')

    /**
     * Repli proposé quand la recherche échoue : renseigner le produit à la main
     * plutôt que de rester bloqué sur un code-barres introuvable.
     */
    this.lienSaisieManuelle = this.racine.getByTestId('lien-saisie-manuelle')

    // ── Scanner (fenêtre modale, hors de la carte) ────────────────────────────
    this.modaleScanner = page.getByTestId('modale-scanner')

    /**
     * Consigne affichée sous l'image de la caméra. Témoin d'un scanner
     * réellement démarré : en cas d'échec (caméra absente ou refusée),
     * l'application affiche un message d'erreur À LA PLACE de l'image.
     */
    this.consigneScanner = page.getByTestId('consigne-scanner')

    // ── Étape 2b : réutilisation d'une recette enregistrée ────────────────────
    this.champRecette = this.racine.getByTestId('champ-recette')

    /**
     * Quantité de l'étape recette, distincte de celle de l'étape ingrédient.
     * Leurs libellés ne se distinguaient que par une unité (« Quantité (g) »
     * contre « Quantité (g/ml) ») ; ce sont maintenant deux repères séparés.
     */
    this.champQuantiteRecette = this.racine.getByTestId('champ-quantite-recette')

    /**
     * Ligne « Profil pour 100 g » affichée après le choix d'une recette : ce que
     * pèse 100 g de cette recette, calculé depuis sa composition.
     *
     * Repérée par son `data-testid`, et son CONTENU confronté à l'attendu par le
     * test (cf. `profilRecetteAttendu`). Chercher directement la phrase complète
     * mêlerait les deux rôles : un simple changement de mise en forme ferait
     * alors « disparaître » le profil au lieu de signaler un écart de valeur.
     */
    this.profilRecette = this.racine.getByTestId('profil-recette')

    // ── Étape 3 : formulaire de saisie ────────────────────────────────────────
    /** Champ de recherche/saisie du nom, avec sa liste de suggestions. */
    this.champNom = this.racine.getByTestId('champ-nom')
    this.champQuantite = this.racine.getByTestId('champ-quantite')
    this.boutonTerminer = this.racine.getByTestId('bouton-terminer')

    /**
     * Marque du produit. Le champ n'apparaît que si une marque est déjà connue
     * (import par code-barres) ou après avoir cliqué « Ajouter une marque » :
     * son affichage est donc lui-même une information sur l'import.
     */
    this.champMarque = this.racine.getByTestId('champ-marque')

    /**
     * Vignette du produit importé.
     *
     * Repérée par `data-testid` : quand l'image ne se charge pas, l'application
     * la masque (`display: none`), et un sélecteur par rôle ne la trouverait
     * plus — le test expirerait au lieu de dire ce qui se passe. Ce que les
     * tests vérifient, c'est l'adresse relayée (`src`), pas le chargement, qui
     * dépend des serveurs d'images d'OpenFoodFacts.
     */
    this.photoProduit = this.racine.getByTestId('photo-produit')

    /**
     * Bouton ⭐ proposé uniquement pour un ingrédient saisi à la main : un
     * aliment déjà présent dans une base n'a pas à être mémorisé. Sa présence
     * (ou son absence) révèle donc comment l'application a classé la saisie.
     */
    this.boutonEnregistrerDansMesIngredients = this.racine.getByTestId('bouton-enregistrer-ingredient')

    /**
     * Même bouton APRÈS enregistrement. L'application change son repère en même
     * temps que son libellé : le test observe donc un CHANGEMENT D'ÉTAT, sans
     * dépendre du participe passé qui l'annonce à l'écran.
     */
    this.boutonIngredientEnregistre = this.racine.getByTestId('bouton-ingredient-enregistre')

    // ── Suggestions (listes déroulantes rendues hors de la carte) ─────────────
    /**
     * Chaque suggestion porte un repère nommant sa PROVENANCE. C'est ce que les
     * tests ont besoin de distinguer : la même suggestion venue de Ciqual ou des
     * ingrédients du compte ne prouve pas la même chose. Le titre du groupe
     * affiché n'entre plus dans le sélecteur — le reformuler ne casse rien.
     */
    this.suggestionsCiqual = page.getByTestId('suggestion-ciqual')
    this.suggestionsPersonnelles = page.getByTestId('suggestion-perso')
    this.suggestionsCodeBarres = page.getByTestId('suggestion-code-barres')

    /** Suggestions affichées sous le champ nom, toutes sources confondues. */
    this.suggestions = page.getByTestId(/^suggestion-/)

    // ── Vue repliée (carte validée) ───────────────────────────────────────────
    this.boutonModifier = this.racine.getByTestId('bouton-modifier-ingredient')

    /** Sortie de la réouverture par « Modifier », sans conserver les retouches. */
    this.lienAnnulerModifications = this.racine.getByTestId('lien-annuler-modifications')

    /**
     * Les trois informations de la ligne de synthèse, chacune repérée par son
     * `data-testid`.
     *
     * Le repère dit OÙ lire, l'assertion du test dit QUOI. Chercher « · 150 g »
     * dans la page confondait les deux : un changement de mise en forme rendait
     * la synthèse « introuvable » — donc invisible pour un `toBeHidden`, qui
     * serait alors passé à tort.
     */
    this.syntheseNom = this.racine.getByTestId('synthese-nom')
    this.syntheseQuantite = this.racine.getByTestId('synthese-quantite')
    this.syntheseEnergie = this.racine.getByTestId('synthese-energie')

    /** Mention distinguant une ligne « recette » d'une ligne « ingrédient ». */
    this.marqueurRecette = this.racine.getByTestId('marqueur-recette')

    /** Retire la carte (ou, s'il n'en reste qu'une, la remet à zéro). */
    this.boutonSupprimer = this.racine.getByTestId('bouton-supprimer-ingredient')
  }

  /**
   * Champ d'une valeur nutritionnelle obligatoire.
   *
   * Le repère reprend le vocabulaire affiché (« lipides ») et non la clé
   * technique de l'application (`graisses`) : les tests désignent un champ par
   * ce qu'il signifie pour l'utilisateur.
   */
  champNutrition(cle) {
    const champ = CHAMPS_NUTRITION.find((c) => c.cle === cle)
    if (!champ) throw new Error(`Champ nutritionnel inconnu : « ${cle} »`)

    return this.racine.getByTestId(`champ-nutrition-${champ.cle}`)
  }

  /**
   * Ouvre le calculateur sur le formulaire de saisie manuelle (étapes 1 puis 2).
   */
  async ouvrirSaisieManuelle() {
    await this.choixTypeIngredient.click()
    await this.choixChercherSaisir.click()
    await expect(this.champNom).toBeVisible()
  }

  /**
   * Ouvre le calculateur sur l'étape « Code-barres » (étapes 1 puis 2).
   */
  async ouvrirEtapeCodeBarres() {
    await this.choixTypeIngredient.click()
    await this.choixCodeBarres.click()
    await expect(this.champCodeBarres).toBeVisible()
  }

  /**
   * Saisit un code-barres dans le champ dédié, SANS lancer la recherche : les
   * tests choisissent ensuite comment la valider (bouton ou touche Entrée).
   */
  async saisirCodeBarres(code) {
    await this.champCodeBarres.fill(code)
  }

  /**
   * Suggestion « Rechercher le code-barres … » proposée sous le champ nom —
   * cherchée DANS le groupe « Code-barres », ce qui vérifie au passage que
   * l'application a bien reconnu un code-barres et non un nom d'aliment.
   */
  suggestionCodeBarres(code) {
    return this.suggestionsCodeBarres.filter({
      hasText: texteExact(`🔍 Rechercher le code-barres ${code}`),
    })
  }

  /**
   * Attend la réponse de l'API à la recherche d'un produit par code-barres. À
   * appeler AVANT de lancer la recherche (ou d'ouvrir le scanner), sinon la
   * requête est manquée.
   *
   * Passer par le réseau donne deux choses que l'écran ne montre pas : la preuve
   * que l'application interroge bien l'API OpenFoodFacts, et les valeurs
   * exactes reçues — donc l'attendu du formulaire, sans le recopier dans le JDD.
   */
  attendreRechercheProduit(code) {
    return this.page.waitForResponse(
      (reponse) =>
        reponse.request().method() === 'GET'
        && reponse.url().includes(`/api/produits/${code}`),
    )
  }

  /**
   * Libellé d'une suggestion tel qu'il apparaît dans la liste : l'application
   * accole le groupe alimentaire au nom pour distinguer deux aliments homonymes.
   */
  libelleSuggestion(aliment) {
    return aliment.groupe ? `${aliment.nom} · ${aliment.groupe}` : aliment.nom
  }

  /**
   * Suggestion issue de la base Ciqual — cherchée DANS le groupe « Base Ciqual
   * (ANSES) », ce qui vérifie au passage sa provenance : la même suggestion
   * proposée depuis « ⭐ Mes ingrédients » ne prouverait rien sur l'API Ciqual.
   */
  suggestionCiqual(aliment) {
    return this.suggestionsCiqual.filter({ hasText: texteExact(this.libelleSuggestion(aliment)) })
  }

  /**
   * Saisit un terme dans le champ nom, ce qui déclenche la recherche.
   */
  async rechercher(terme) {
    await this.champNom.fill(terme)
  }

  /**
   * Attend la réponse de l'API à la recherche d'aliments déclenchée par la
   * saisie. À appeler AVANT de taper le terme, sinon la requête est manquée.
   *
   * Passer par le réseau donne deux choses que l'écran ne montre pas : la preuve
   * que l'application interroge bien l'API Ciqual, et les valeurs exactes
   * reçues — donc l'attendu du formulaire, sans le recopier dans le JDD.
   */
  attendreRechercheCiqual(terme) {
    return this.page.waitForResponse(
      (reponse) =>
        reponse.request().method() === 'GET'
        && reponse.url().includes(`/api/aliments?nom=${encodeURIComponent(terme)}`),
    )
  }

  async saisirQuantite(quantite) {
    await this.champQuantite.fill(quantite)
  }

  /**
   * Renseigne les valeurs nutritionnelles obligatoires.
   *
   * Les champs absents de `valeurs` sont VIDÉS : c'est ce qui permet de tester
   * l'absence d'une macro précise sans dépendre de l'état laissé par l'étape
   * précédente du test.
   */
  async remplirNutrition(valeurs) {
    for (const { cle } of CHAMPS_NUTRITION) {
      await this.champNutrition(cle).fill(valeurs[cle] ?? '')
    }
  }

  /** Soumet la carte (bouton « Terminer »). */
  async terminer() {
    await this.boutonTerminer.click()
  }

  /**
   * Renseigne entièrement un ingrédient saisi à la main, puis valide la carte.
   *
   * Raccourci pour les scénarios où la saisie n'est PAS l'objet du test
   * (suppression, enregistrement…) : elle y est un préalable, et son détail est
   * déjà couvert par les cas TC_INGREDIENT_001 à 005. On attend la ligne de
   * synthèse avant de rendre la main, pour que le test parte d'un état établi.
   */
  async saisirEtValider(ingredient) {
    await this.ouvrirSaisieManuelle()
    await this.rechercher(ingredient.nom)
    await this.saisirQuantite(ingredient.quantite)
    await this.remplirNutrition(ingredient.nutrition)
    await this.terminer()
    await expect(this.syntheseNom, `la carte n° ${this.indice + 1} doit se replier sur « ${ingredient.nom} »`)
      .toHaveText(ingredient.nom)
  }

  /**
   * Sélectionne une recette enregistrée dans la liste déroulante de l'étape
   * « Recette ». La liste des options est rendue hors de la carte.
   */
  async choisirRecette(nom) {
    await this.champRecette.click()
    await this.page.getByTestId('option-recette').filter({ hasText: texteExact(nom) }).click()
  }

  /**
   * Texte attendu de la ligne « Profil pour 100 g », tel que l'écran doit
   * l'afficher. La mise en forme est une connaissance d'interface : elle reste
   * ici, et le test se contente de comparer deux chaînes.
   */
  profilRecetteAttendu(profil) {
    return `Profil pour 100 g : ${profil.energie} kcal · P ${profil.proteines} g `
      + `· G ${profil.glucides} g · L ${profil.lipides} g`
  }

  /**
   * Suggestion issue des ingrédients personnels de l'utilisateur connecté.
   */
  suggestionPersonnelle(nom) {
    return this.suggestionsPersonnelles.filter({ hasText: texteExact(`⭐ ${nom}`) })
  }

  /**
   * Message d'erreur rattaché à un champ, retrouvé par le lien d'accessibilité
   * `aria-describedby`.
   *
   * On ne cherche pas le texte « au hasard » dans la page : on suit le lien que
   * l'application déclare entre le champ et son message. Un message affiché sans
   * ce lien serait invisible pour un lecteur d'écran — le test échoue alors avec
   * un diagnostic explicite au lieu de passer.
   *
   * C'est aussi la raison pour laquelle aucun `data-testid` n'est posé sur ces
   * messages : le lien ARIA est ici l'objet même de la vérification.
   */
  async messageErreurDe(champ) {
    const id = await champ.getAttribute('aria-describedby')
    if (!id) {
      throw new Error(
        "Aucun message d'erreur rattaché à ce champ : l'attribut aria-describedby est absent.",
      )
    }

    return this.page.locator(`[id="${id}"]`)
  }

  /**
   * Vérifie qu'un champ n'est pas signalé en erreur.
   *
   * Sert à prouver qu'un refus de validation porte bien sur le champ visé, et
   * pas sur toute la carte indistinctement.
   */
  async attendreChampValide(champ, description) {
    await expect(champ, `${description} ne doit pas être signalé en erreur`)
      .not.toHaveAttribute('aria-invalid', 'true')
  }
}

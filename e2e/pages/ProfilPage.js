import { texteExact } from './texteExact'

/**
 * Page Object de l'espace personnel (/profil).
 *
 * Route protégée par <PrivateRoute> : y accéder est en soi la preuve que la
 * session est bien établie côté application.
 *
 * Les deux listes de la page — « Mes ingrédients » et « Mes recettes » — portent
 * chacune un `data-testid`, et chacune de leurs lignes aussi. Ce cadrage lève
 * deux ambiguïtés que le texte seul ne permettait pas de trancher :
 *
 *   - « Mes recettes » se retrouve dans le pseudo du compte de test
 *     (« E2E Mes Recettes ») ;
 *   - ingrédients et recettes exposent le même libellé de suppression
 *     (« Supprimer X »), si bien qu'un nom présent dans les deux listes rendait
 *     le repère équivoque.
 *
 * Le même principe s'applique à l'intérieur d'une ligne : chaque élément — le
 * nom, le résumé, les deux actions — a son propre repère. Une ligne est donc
 * retrouvée par le NOM qu'elle affiche, et non par le libellé accessible de sa
 * corbeille : renommer l'action (« Supprimer » → « Retirer ») ne casse plus la
 * recherche de la ligne.
 */
export class ProfilPage {
  constructor(page) {
    this.page = page

    /** Titre de la page : le pseudo de l'utilisateur connecté. */
    this.titre = page.getByTestId('titre-profil')
    this.boutonChangerPhoto = page.getByTestId('bouton-changer-photo')
    this.boutonParametres = page.getByTestId('bouton-parametres-compte')

    /** Section listant les ingrédients personnels enregistrés. */
    this.sectionIngredients = page.getByTestId('mes-ingredients')

    /** Section listant les recettes enregistrées du compte. */
    this.sectionRecettes = page.getByTestId('mes-recettes')

    /**
     * Message affiché quand le compte n'a aucune recette. Sert de témoin en sens
     * inverse : il prouve que la liste a bien été chargée et qu'elle est vide,
     * là où l'absence d'un nom pourrait tout aussi bien signifier « pas encore
     * chargée ».
     */
    this.mentionAucuneRecette = this.sectionRecettes.getByTestId('aucune-recette')
  }

  /**
   * Ligne d'un ingrédient enregistré : son nom, ses valeurs et son action de
   * suppression.
   *
   * Deux repères se complètent, et chacun apporte ce que l'autre ne peut pas :
   * le `data-testid` de ligne délimite le périmètre (là où il fallait auparavant
   * remonter au « plus petit div contenant… »), et celui du nom désigne
   * EXACTEMENT l'ingrédient voulu — la comparaison est stricte, « Chutney » ne
   * peut donc pas ramener la ligne de « Chutney galactique ».
   */
  ligneIngredient(nom) {
    return this.sectionIngredients
      .getByTestId('ingredient-enregistre')
      .filter({ has: this.page.getByTestId('ingredient-nom').filter({ hasText: texteExact(nom) }) })
  }

  /**
   * Bouton de suppression d'un ingrédient, cherché DANS sa ligne : chaque
   * ingrédient de la liste a le sien.
   */
  boutonSupprimerIngredient(nom) {
    return this.ligneIngredient(nom).getByTestId('bouton-supprimer-ingredient')
  }

  /**
   * Résumé des valeurs affiché sous le nom d'un ingrédient enregistré.
   *
   * Vérifier ce résumé, et pas seulement le nom, prouve que les valeurs
   * nutritionnelles ont elles aussi été enregistrées.
   */
  resumeIngredient(nom) {
    return this.ligneIngredient(nom).getByTestId('ingredient-resume')
  }

  /**
   * Résumé attendu pour un ingrédient, tel que l'écran doit l'afficher. La mise
   * en forme est une connaissance d'interface : elle reste ici, et le test se
   * contente de comparer deux chaînes — un écart de valeur se lit alors dans le
   * rapport, au lieu d'un élément « introuvable ».
   */
  resumeAttenduIngredient(nutrition) {
    return `Pour 100g : ${nutrition.energie} kcal · P ${nutrition.proteines} g `
      + `· G ${nutrition.glucides} g · L ${nutrition.lipides} g`
  }

  /**
   * Ligne d'une recette enregistrée, cherchée dans la SEULE liste des recettes —
   * ce qui lève l'ancienne ambiguïté : ingrédients et recettes partagent le même
   * libellé de suppression, et le repère supposait donc qu'un nom de recette ne
   * soit jamais aussi un nom d'ingrédient du compte.
   */
  ligneRecette(nom) {
    return this.sectionRecettes
      .getByTestId('recette-enregistree')
      .filter({ has: this.page.getByTestId('recette-nom').filter({ hasText: texteExact(nom) }) })
  }

  /**
   * Résumé affiché sous le nom d'une recette (« 5 portions · 2 ingrédients »).
   *
   * Le nom seul ne prouverait pas grand-chose : ce résumé est ce qui atteste que
   * le nombre de portions et la composition ont été enregistrés avec lui.
   */
  resumeRecette(nom) {
    return this.ligneRecette(nom).getByTestId('recette-resume')
  }

  /**
   * Bouton rouvrant une recette dans le calculateur, cherché DANS sa ligne :
   * chaque recette de la liste a le sien.
   */
  boutonModifierRecette(nom) {
    return this.ligneRecette(nom).getByTestId('bouton-modifier-recette')
  }

  /**
   * Bouton de suppression d'une recette, cherché DANS sa ligne.
   */
  boutonSupprimerRecette(nom) {
    return this.ligneRecette(nom).getByTestId('bouton-supprimer-recette')
  }

  /**
   * Tente d'ouvrir l'espace personnel directement par l'URL, sans passer par le
   * formulaire de connexion.
   *
   * Volontairement sans assertion de succès : la méthode sert aussi (surtout) à
   * vérifier qu'un visiteur NON connecté est bien refoulé vers /login.
   */
  async aller() {
    await this.page.goto('/profil')
  }
}

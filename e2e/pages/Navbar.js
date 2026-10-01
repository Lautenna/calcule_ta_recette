/**
 * Page Object de la barre de navigation, présente sur toutes les pages.
 *
 * C'est le témoin visuel de l'état de session : bouton « Connexion » pour un
 * visiteur anonyme, pseudo + avatar pour un utilisateur authentifié.
 *
 * Les repères sont des `data-testid` posés par l'application : la navigation
 * change souvent d'habillage (libellés, icônes, mise en page responsive), et un
 * sélecteur fondé sur ce qui est écrit casserait à chaque retouche.
 */
export class Navbar {
  constructor(page) {
    this.page = page

    this.zone = page.getByTestId('navbar')

    /** Visible uniquement lorsque personne n'est connecté. */
    this.boutonConnexion = this.zone.getByTestId('lien-connexion')

    /**
     * Pseudo affiché à droite de la navbar une fois la session ouverte.
     *
     * Le repère dit OÙ lire ; le test dit QUEL pseudo il attend, via `pseudo()`.
     */
    this.zonePseudo = this.zone.getByTestId('pseudo-utilisateur')
  }

  /**
   * Pseudo affiché, filtré sur la valeur attendue.
   *
   * Garder l'argument permet aux tests d'exprimer « la navbar annonce CE
   * compte » — et à l'assertion inverse (`toBeHidden`) de rester vraie quand
   * aucune session n'est ouverte, le repère étant alors absent du DOM.
   */
  pseudo(pseudo) {
    return this.zonePseudo.filter({ hasText: pseudo })
  }
}

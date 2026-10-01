import { expect } from '@playwright/test'

/**
 * Page Object du choix d'un nouveau mot de passe (/reset-password?token=…).
 *
 * On n'y accède jamais par un lien de l'application : c'est le mail reçu qui
 * mène ici, jeton en paramètre. Les tests ouvrent donc l'URL telle qu'elle a été
 * extraite du message (voir `ouvrir`).
 *
 * La page a trois visages selon le jeton reçu — formulaire, écran de succès,
 * « lien invalide » — et c'est précisément ce que les tests doivent distinguer.
 * Chacun porte donc son propre `data-testid` : un test affirme « l'application
 * en est à tel écran », pas « telle phrase est affichée ». Une reformulation du
 * titre ne peut plus faire passer un test à tort dans les assertions d'absence
 * (`toBeHidden`).
 *
 * Le bandeau d'erreur, lui, reste cherché par son rôle ARIA `alert` : c'est ce
 * rôle qui le fait annoncer par un lecteur d'écran, et le vérifier fait partie
 * du test.
 */
export class NouveauMotDePassePage {
  constructor(page) {
    this.page = page

    this.titre = page.getByTestId('titre-nouveau-mot-de-passe')
    this.champMotDePasse = page.getByTestId('champ-mot-de-passe')
    this.champConfirmation = page.getByTestId('champ-confirmation')
    this.boutonReinitialiser = page.getByTestId('bouton-reinitialiser')

    /** Bandeau d'erreur : lien expiré, déjà utilisé, invalide… */
    this.messageErreur = page.getByRole('alert')
    this.lienDemanderNouveauLien = page.getByTestId('lien-demander-nouveau-lien')

    /** Écran de succès, et son raccourci vers la connexion. */
    this.titreSucces = page.getByTestId('titre-succes')
    this.lienSeConnecter = page.getByTestId('lien-se-connecter')

    /** Écran affiché lorsque l'URL ne porte aucun jeton. */
    this.titreLienInvalide = page.getByTestId('titre-lien-invalide')
  }

  /**
   * Ouvre le lien reçu par mail (URL absolue).
   */
  async ouvrir(lien) {
    await this.page.goto(lien)
  }

  /**
   * Saisit le nouveau mot de passe, sa confirmation, et valide.
   */
  async choisirMotDePasse(motDePasse) {
    await expect(this.titre).toBeVisible()
    await this.champMotDePasse.fill(motDePasse)
    await this.champConfirmation.fill(motDePasse)
    await this.boutonReinitialiser.click()
  }
}

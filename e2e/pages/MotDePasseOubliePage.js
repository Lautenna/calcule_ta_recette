import { expect } from '@playwright/test'

/**
 * Page Object de la demande de réinitialisation (/forgot-password).
 *
 * Premier écran du parcours « mot de passe oublié » : l'utilisateur y saisit son
 * email pour recevoir un lien. La suite se passe dans sa boîte mail, puis sur
 * /reset-password (voir NouveauMotDePassePage).
 *
 * Les repères sont des `data-testid` posés par l'application. Ils désignent le
 * RÔLE de chaque élément dans le parcours (« le champ email », « le bouton
 * d'envoi »), indépendamment de sa formulation : reformuler « Envoyer le lien »
 * ne casse plus rien. Seul le bandeau d'erreur reste cherché par son rôle ARIA
 * `alert` — ce rôle n'est pas qu'un moyen de le trouver, c'est ce qui le fait
 * annoncer par un lecteur d'écran, et le vérifier fait partie du test.
 */
export class MotDePasseOubliePage {
  constructor(page) {
    this.page = page

    this.titre = page.getByTestId('titre-mot-de-passe-oublie')

    this.champEmail = page.getByTestId('champ-email')
    this.boutonEnvoyer = page.getByTestId('bouton-envoyer-lien')
    this.lienRetourConnexion = page.getByTestId('lien-retour-connexion')

    /** Bandeau d'erreur (erreur renvoyée par le serveur). */
    this.messageErreur = page.getByRole('alert')

    /** Écran d'accusé de réception, affiché après la demande. */
    this.titreVerifierEmail = page.getByTestId('titre-verifier-email')

    /**
     * Adresse rappelée sur l'accusé de réception : c'est là que l'utilisateur
     * doit aller chercher son lien, et une faute de frappe se voit à ce
     * moment-là. Le repère dit où lire, le test compare l'adresse attendue.
     */
    this.emailDestinataire = page.getByTestId('email-destinataire')
  }

  /** Ouvre la page et attend que le formulaire soit utilisable. */
  async aller() {
    await this.page.goto('/forgot-password')
    await expect(this.titre).toBeVisible()
  }

  /**
   * Demande un lien de réinitialisation pour cet email.
   */
  async demanderLien(email) {
    await this.champEmail.fill(email)
    await this.boutonEnvoyer.click()
  }
}

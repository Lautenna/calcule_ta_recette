import { expect } from '@playwright/test'

/**
 * Page Object de l'écran de connexion (/login).
 *
 * Le Page Object Model isole la connaissance de l'interface (sélecteurs,
 * enchaînement des actions) dans une seule classe. Les tests décrivent alors
 * une intention métier (« se connecter ») et non des clics ; une refonte du
 * formulaire ne casse qu'un fichier au lieu de toute la suite.
 *
 * Les sélecteurs s'appuient sur les rôles ARIA et les libellés visibles plutôt
 * que sur des classes CSS : c'est ce que voit l'utilisateur, donc ça ne casse
 * pas au moindre changement de style, et ça vérifie au passage que le
 * formulaire reste accessible.
 */
export class ConnexionPage {
  constructor(page) {
    this.page = page

    this.titre = page.getByRole('heading', { name: 'Connexion' })
    this.champEmail = page.getByLabel('Email')
    this.champMotDePasse = page.getByLabel('Mot de passe')
    this.boutonSeConnecter = page.getByRole('button', { name: 'Se connecter' })
    this.lienMotDePasseOublie = page.getByText('Mot de passe oublié ?')
    this.lienCreerCompte = page.getByText('Créer un compte')

    /** Bandeau d'erreur affiché en cas d'échec d'authentification. */
    this.messageErreur = page.getByRole('alert')
  }

  /** Ouvre la page de connexion et attend que le formulaire soit utilisable. */
  async aller() {
    await this.page.goto('/login')
    await expect(this.titre).toBeVisible()
  }

  /**
   * Renseigne le formulaire et le soumet.
   */
  async seConnecter(email, motDePasse) {
    await this.champEmail.fill(email)
    await this.champMotDePasse.fill(motDePasse)
    await this.boutonSeConnecter.click()
  }

  /**
   * Ouvre une session de bout en bout : formulaire, soumission, puis attente de
   * la redirection vers l'espace personnel.
   *
   * Destinée aux tests dont la connexion n'est qu'un PRÉALABLE (calculateur,
   * profil…) : attendre /profil garantit que la session est réellement établie
   * avant que le scénario ne commence, sinon l'échec surviendrait plus loin, sur
   * une assertion sans rapport avec la cause.
   */
  async ouvrirSession(utilisateur) {
    await this.aller()
    await this.seConnecter(utilisateur.email, utilisateur.motDePasse)
    await expect(this.page).toHaveURL('/profil')
  }

  /**
   * Soumet des identifiants attendus en échec et renvoie le texte du bandeau
   * d'erreur affiché.
   *
   * Savoir *où* lire le message et comment le nettoyer relève de l'interface :
   * cette connaissance reste donc dans le Page Object, et les tests se
   * contentent de comparer des chaînes.
   */
  async messageErreurApresConnexion(email, motDePasse) {
    await this.seConnecter(email, motDePasse)
    await expect(this.messageErreur).toBeVisible()

    return (await this.messageErreur.innerText()).trim()
  }
}

import { expect } from '@playwright/test'

/**
 * Page Object de l'écran d'inscription (/register).
 *
 * Même principe que ConnexionPage : les tests expriment une intention métier
 * (« remplir le formulaire », « soumettre »), la connaissance de l'interface
 * reste ici.
 *
 * Les champs sont adressés par leur rôle ARIA + leur libellé visible, jamais
 * par une classe CSS : c'est ce que perçoit l'utilisateur (et un lecteur
 * d'écran), donc ça résiste aux changements de style. Remarque : les libellés
 * portent un astérisque « obligatoire » masqué aux technologies d'assistance
 * (aria-hidden), c'est pourquoi `getByRole(...)` fonctionne avec le libellé nu
 * là où un `getByLabel('Email', { exact: true })` échouerait.
 */
export class InscriptionPage {
  constructor(page) {
    this.page = page

    this.titre = page.getByRole('heading', { name: 'Créer un compte' })

    this.champEmail = this.champ('Email')
    this.champPseudo = this.champ('Pseudo')
    this.champMotDePasse = this.champ('Mot de passe')
    this.champConfirmation = this.champ('Confirmer le mot de passe')
    this.champCodeInvitation = this.champ("Code d'autorisation")

    this.boutonCreerCompte = page.getByRole('button', { name: 'Créer mon compte' })

    /** Bandeau d'erreur global (erreur renvoyée par le serveur). */
    this.messageErreur = page.getByRole('alert')

    /** Écran de succès : preuve qu'un compte a bien été créé. */
    this.titreVerifierEmail = page.getByRole('heading', { name: 'Vérifie ta boîte mail' })

    /** Message spécifique affiché quand l'email est déjà pris. */
    this.messageEmailDejaUtilise = page.getByText('Un compte existe déjà avec cet email.')
  }

  /**
   * Champ de saisie identifié par son libellé exact.
   */
  champ(libelle) {
    return this.page.getByRole('textbox', { name: libelle, exact: true })
  }

  /** Ouvre la page d'inscription et attend que le formulaire soit utilisable. */
  async aller() {
    await this.page.goto('/register')
    await expect(this.titre).toBeVisible()
  }

  /**
   * Renseigne le formulaire. Un champ absent de l'objet est laissé VIDE : c'est
   * ainsi que les tests simulent l'oubli d'un champ obligatoire.
   */
  async remplir(donnees) {
    const saisies = [
      [this.champEmail, donnees.email],
      [this.champPseudo, donnees.pseudo],
      [this.champMotDePasse, donnees.motDePasse],
      [this.champConfirmation, donnees.confirmation],
      [this.champCodeInvitation, donnees.codeInvitation],
    ]

    for (const [champ, valeur] of saisies) {
      if (valeur !== undefined) await champ.fill(valeur)
    }
  }

  /** Soumet le formulaire. */
  async soumettre() {
    await this.boutonCreerCompte.click()
  }

  /**
   * Message d'erreur rattaché à un champ donné.
   *
   * Mantine relie l'erreur à son champ via `aria-describedby` : on suit ce lien
   * plutôt que de chercher un texte quelque part dans la page. On vérifie ainsi
   * que l'erreur est bien annoncée SUR le champ concerné — donc restituée à un
   * utilisateur de lecteur d'écran — et pas seulement affichée à l'écran.
   */
  async erreurDuChamp(champ) {
    // On attend que le champ soit signalé en erreur avant de lire l'attribut :
    // sans cette attente, on le lirait avant le rendu de la validation.
    await expect(champ, 'le champ doit être signalé en erreur (aria-describedby)')
      .toHaveAttribute('aria-describedby', /-error(\s|$)/)

    const identifiants = (await champ.getAttribute('aria-describedby')) ?? ''
    const idErreur = identifiants.split(/\s+/).find((id) => id.endsWith('-error'))

    return this.page.locator(`#${idErreur}`)
  }

  /**
   * Vrai si le champ n'affiche AUCUNE erreur. Sert à prouver qu'un test
   * n'invalide bien qu'un seul champ à la fois.
   */
  async champSansErreur(champ) {
    const identifiants = (await champ.getAttribute('aria-describedby')) ?? ''
    return !identifiants.split(/\s+/).some((id) => id.endsWith('-error'))
  }

  /**
   * Enregistre les appels d'inscription envoyés au serveur pendant le test.
   *
   * Utilisé pour prouver qu'une validation côté navigateur est réellement
   * bloquante : si le formulaire est refusé sans qu'aucun POST /api/users ne
   * parte, c'est que rien n'a pu atteindre la base.
   */
  surveillerAppelsInscription() {
    const appels = []

    this.page.on('request', (requete) => {
      if (requete.method() === 'POST' && requete.url().includes('/api/users')) {
        appels.push(requete.url())
      }
    })

    return appels
  }
}

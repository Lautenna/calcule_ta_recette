import { expect } from '@playwright/test'

/**
 * Page Object du calculateur de métabolisme de base (/metabolisme).
 *
 * Page publique, comme le calculateur de recette : aucune session n'est
 * nécessaire pour estimer son métabolisme. Les tests de calcul s'exécutent donc
 * en visiteur anonyme, ce qui les rend indépendants du JDD des comptes.
 *
 * (La sauvegarde du résultat dans le profil, elle, n'est proposée qu'à un
 * utilisateur connecté : elle relèvera d'un cas à part, avec session.)
 */
export class MetabolismePage {
  constructor(page) {
    this.page = page

    this.titre = page.getByTestId('titre-metabolisme')

    /**
     * Formule annoncée à l'utilisateur. C'est la référence que le test oppose à
     * l'écran : si l'application changeait d'équation, cette mention devrait
     * changer avec elle — et le JDD aussi.
     */
    this.mentionFormule = page.getByTestId('mention-formule')

    // ── Saisie ────────────────────────────────────────────────────────────────
    /** Le sélecteur de sexe, et la racine de ses deux options. */
    this.groupeSexe = page.getByTestId('choix-sexe')

    /** Les trois champs de mesure. */
    this.champPoids = page.getByTestId('champ-poids')
    this.champTaille = page.getByTestId('champ-taille')
    this.champAge = page.getByTestId('champ-age')

    // ── Résultat ──────────────────────────────────────────────────────────────
    /** Unité affichée sous le résultat : n'existe que lorsqu'un résultat existe. */
    this.uniteParJour = page.getByTestId('unite-par-jour')

    /**
     * La carte de résultat, repérée par son `data-testid` — et racine du chiffre
     * qu'elle contient : celui-ci ne peut donc pas être cherché ailleurs dans la
     * page.
     */
    this.carteResultat = page.getByTestId('metabolisme-resultat')

    /**
     * Le métabolisme affiché.
     *
     * Ce nombre n'a aucun repère accessible propre (pas d'`aria-label`,
     * contrairement à la roue des macros du calculateur) et rien d'autre ne le
     * distingue de son voisinage : il était donc cherché « par sa forme » (le
     * seul texte purement numérique de la carte), un sélecteur qui aurait suivi
     * n'importe quel autre chiffre ajouté à la carte. Le `data-testid` désigne
     * LA valeur du résultat, sans supposer ce qui l'entoure.
     */
    this.valeurKcal = this.carteResultat.getByTestId('metabolisme-valeur')

    /**
     * Invitation affichée à la place du résultat tant que les données sont
     * incomplètes.
     *
     * Témoin en sens inverse : elle prouve que l'application s'abstient de
     * calculer, là où l'absence d'un nombre pourrait tout aussi bien signifier
     * « page pas encore chargée ».
     */
    this.invitationASaisir = page.getByTestId('invitation-a-saisir')

    /** Proposé au seul utilisateur connecté. */
    this.boutonSauvegarder = page.getByTestId('bouton-sauvegarder-metabolisme')
  }

  /** Ouvre la page et attend qu'elle soit utilisable. */
  async aller() {
    await this.page.goto('/metabolisme')
    await expect(this.titre).toBeVisible()
  }

  /**
   * Bouton radio d'un sexe donné : c'est lui qui porte l'état coché.
   *
   * Le sélecteur passe par `value`, la valeur métier que l'application donne au
   * choix (`femme` / `homme`) — et non par le libellé affiché, qui peut être
   * reformulé. Le repère du clic, lui, est un `data-testid` (cf. `optionSexe`) :
   * le bouton radio est masqué à l'écran, l'utilisateur clique sur le libellé.
   *
   * Le JDD nomme les sexes comme l'écran les affiche (« Femme ») ; l'application
   * les code en minuscules. Cette correspondance est une connaissance
   * d'interface : elle reste ici, et le JDD garde le vocabulaire de
   * l'utilisateur.
   */
  sexe(sexe) {
    return this.groupeSexe.locator(`input[value="${sexe.toLowerCase()}"]`)
  }

  /** Libellé cliquable d'un sexe donné. */
  optionSexe(sexe) {
    return this.groupeSexe.getByTestId(`sexe-${sexe.toLowerCase()}`)
  }

  /**
   * Choisit le sexe en cliquant sur son libellé — le geste réellement à la
   * portée de l'utilisateur, le bouton radio lui-même étant masqué à l'écran.
   *
   * L'assertion qui suit n'est pas une redite du clic : elle garantit que le
   * choix a bien été enregistré avant qu'un attendu de calcul ne soit comparé,
   * sinon un échec de sélection se lirait comme une erreur de formule.
   */
  async choisirSexe(sexe) {
    await this.optionSexe(sexe).click()
    await expect(this.sexe(sexe), `le sexe « ${sexe} » doit être sélectionné`).toBeChecked()
  }

  /**
   * Renseigne les trois mesures. Les valeurs sont passées en texte, comme elles
   * sont réellement tapées.
   */
  async saisirMesures({ poids, taille, age }) {
    if (poids !== undefined) await this.champPoids.fill(poids)
    if (taille !== undefined) await this.champTaille.fill(taille)
    if (age !== undefined) await this.champAge.fill(age)
  }

  /**
   * Renseigne un profil complet : sexe, puis mesures.
   */
  async saisirProfil({ sexe, poids, taille, age }) {
    await this.choisirSexe(sexe)
    await this.saisirMesures({ poids, taille, age })
  }

  /**
   * Métabolisme affiché, en kcal/jour, ou `null` quand l'application n'affiche
   * aucune valeur.
   *
   * Renvoyer `null` plutôt que lever une erreur est délibéré : un écran resté
   * vide alors qu'un résultat était attendu doit se lire « null au lieu de
   * 1394 » dans le rapport, et non comme une panne du test.
   */
  async metabolismeAffiche() {
    if (await this.valeurKcal.count() === 0) return null

    const texte = await this.valeurKcal.innerText()
    return Number.parseInt(texte.replace(/\D/g, ''), 10)
  }
}

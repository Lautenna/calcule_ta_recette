import { test, expect } from '@playwright/test'
import { CalculateurPage } from '../../pages/CalculateurPage'
import { CHAMPS_NUTRITION } from '../../pages/CarteIngredient'
import { PROPRIETE_API, quantiteValide } from '../../fixtures/ingredients'
import {
  produitCodeBarres,
  codeBarresTropCourt,
  codeBarresAuSeuil,
  codeBarresInconnu,
  SEUIL_LONGUEUR_CODE,
} from '../../fixtures/codeBarres'
import { installerCameraFactice } from '../../fixtures/cameraFactice'

/**
 * Suite : Calculateur — le code-barres (API OpenFoodFacts)
 *
 *   TC_INGREDIENT_008 — code-barres TAPÉ au clavier, validé au bouton ou à Entrée
 *   TC_INGREDIENT_009 — code-barres SCANNÉ avec la caméra
 *   TC_INGREDIENT_013 — code-barres tapé dans le champ « Nom du produit »
 *   TC_INGREDIENT_014 — code-barres trop court : aucune recherche possible
 *   TC_INGREDIENT_015 — code-barres inconnu : la saisie manuelle prend le relais
 *
 * Les trois premiers cas visent le même résultat — un produit d'OpenFoodFacts
 * (OFF) intégralement renseigné dans le formulaire — et ne diffèrent que par la
 * façon d'entrer le code. Ils partagent donc leurs vérifications
 * (`verifierProduitImporte`) : ce qui est propre à chaque cas reste le chemin
 * d'entrée, et lui seul.
 *
 * DÉPENDANCE EXTERNE : le backend relaie la requête vers l'API publique
 * OpenFoodFacts. C'est justement le lien à prouver, donc rien n'est simulé côté
 * réseau — mais une indisponibilité d'OFF (elle renvoie parfois des 502
 * passagers) fait échouer ces cas sans que l'application soit en cause. Les
 * messages d'échec le disent explicitement.
 *
 * Aucun compte nécessaire : le calculateur est public, les tests jouent en
 * visiteur anonyme.
 */

/**
 * Fenêtre laissée à l'application pour lancer — ou non — une recherche Ciqual.
 *
 * L'application temporise cette recherche de 250 ms après la dernière frappe
 * (`useDebouncedValue`, IngredientBuilder). Majorée d'une marge confortable,
 * cette durée est ce qu'il faut attendre avant d'affirmer qu'aucune recherche
 * n'est partie.
 */
const FENETRE_TEMPORISATION_CIQUAL = 1_000

/**
 * Lit le produit servi par l'API et vérifie qu'il est exploitable comme attendu
 * du formulaire.
 */
async function lireProduitServiParLApi(reponse) {
  expect(
    reponse.ok(),
    `l'API doit servir le produit (reçu ${reponse.status()}). Un 404 « Service `
    + 'OpenFoodFacts indisponible » signale une indisponibilité d’OpenFoodFacts, '
    + 'et non un défaut de l’application.',
  ).toBe(true)

  const produit = await reponse.json()

  // Précondition JDD vérifiée là où elle vit : OFF est modifiable par ses
  // contributeurs, et ce code-barres doit toujours désigner le produit attendu.
  expect(
    produit.nom,
    `précondition JDD : le code-barres ${produitCodeBarres.codeBarres} doit désigner `
    + `un produit ${produitCodeBarres.motifNom} chez OpenFoodFacts`,
  ).toMatch(produitCodeBarres.motifNom)

  return produit
}

/**
 * Recense les appels de l'application à une route de l'API, au fil du test.
 *
 * Sert aux cas où l'attendu est qu'AUCUN appel n'ait lieu : c'est invisible à
 * l'écran, et seule l'observation du réseau permet de le prouver.
 */
function espionnerAppelsApi(page, fragmentUrl) {
  const appels = []
  page.on('request', (requete) => {
    if (requete.url().includes(fragmentUrl)) appels.push(requete.url())
  })

  return appels
}

/**
 * Vérifie que le formulaire reprend fidèlement le produit servi par l'API, puis
 * que le produit importé compte réellement dans le calcul.
 *
 * L'attendu n'est pas recopié dans le JDD : il est LU dans la réponse de l'API.
 * C'est ce qui rend l'assertion pertinente — on prouve le lien entre ce qu'OFF
 * sert et ce que l'utilisateur voit, sans dépendre de valeurs nutritionnelles
 * qu'un contributeur peut corriger demain.
 */
async function verifierProduitImporte(calculateur, produit) {
  const carte = calculateur.carteIngredient

  await test.step('Alors le formulaire de saisie s’ouvre, renseigné avec le produit servi par l’API', async () => {
    await expect(carte.champNom, 'le nom doit être celui du produit').toHaveValue(produit.nom)

    expect(produit.marque, 'précondition JDD : OFF doit déclarer une marque').toBeTruthy()
    await expect(carte.champMarque, 'la marque doit être reprise et rester modifiable')
      .toHaveValue(produit.marque)
  })

  await test.step('Et les quatre valeurs nutritionnelles obligatoires reprennent exactement celles servies par l’API', async () => {
    // La ressource Produit expose ses valeurs sous les mêmes noms que la
    // ressource Aliment : la correspondance du JDD Ciqual s'applique telle quelle.
    for (const { cle, libelle } of CHAMPS_NUTRITION) {
      const valeurApi = produit[PROPRIETE_API[cle]]

      // Une valeur nulle ou absente viderait de sens l'assertion suivante : le
      // champ resterait vide et le test passerait pour de mauvaises raisons.
      expect(valeurApi, `précondition JDD : OFF doit servir une valeur exploitable pour ${libelle}`)
        .toBeGreaterThan(0)

      await expect(
        carte.champNutrition(cle),
        `${libelle} doit reprendre la valeur de l'API`,
      ).toHaveValue(String(valeurApi))
    }
  })

  await test.step('Et la photo du produit affichée est bien celle qu’OpenFoodFacts a servie', async () => {
    expect(produit.photo, 'précondition JDD : OFF doit servir une photo').toBeTruthy()

    // On vérifie que l'application relaie l'adresse servie par l'API, et non que
    // l'image se charge : le chargement dépend des serveurs d'images d'OFF, hors
    // du périmètre de l'application.
    await expect(carte.photoProduit, 'la vignette doit pointer vers la photo OFF')
      .toHaveAttribute('src', produit.photo)

    // Le texte alternatif est vérifié pour lui-même, et non plus utilisé comme
    // moyen de trouver l'image : une vignette sans description reste invisible
    // pour un lecteur d'écran, et le test doit le dire.
    await expect(carte.photoProduit, 'la vignette doit décrire le produit')
      .toHaveAttribute('alt', produit.nom)
  })

  await test.step('Et le produit importé, complété d’une quantité, est compté dans le tableau nutritionnel', async () => {
    // L'import ne devine pas la quantité utilisée dans la recette : elle reste à
    // la charge de l'utilisateur, et c'est elle qui déclenche le calcul.
    await expect(carte.champQuantite, 'la quantité doit rester à saisir').toHaveValue('')

    await carte.saisirQuantite(quantiteValide)
    await carte.terminer()

    await expect(carte.boutonModifier, 'la carte doit être acceptée et se replier').toBeVisible()
    await expect(carte.syntheseNom).toHaveText(produit.nom)
    await expect(carte.syntheseQuantite).toContainText(`${quantiteValide} g`)

    await expect
      .poll(() => calculateur.valeurParPortion('energie'), {
        message: 'le produit importé doit peser dans le tableau nutritionnel',
      })
      .toBeGreaterThan(0)
  })
}

/**
 * Vérifie que l'application confirme l'import par une notification.
 *
 * À appeler AVANT le détail du formulaire : la notification se referme d'elle-même
 * au bout de quelques secondes.
 */
async function verifierNotificationImport(calculateur, produit) {
  await expect(calculateur.notification).toContainText(produit.nom)
  await expect(calculateur.notification).toContainText('importé depuis son code-barres')
}

test.describe('Calculateur — import d’un produit par code-barres', () => {
  /**
   * Les deux façons de valider un code-barres tapé au clavier. Le résultat
   * attendu est identique : c'est justement ce que le cas de test affirme — la
   * touche Entrée n'est pas un raccourci au rabais.
   */
  const FACONS_DE_VALIDER = [
    {
      cle: 'bouton',
      libelle: 'en cliquant « Rechercher ce produit »',
      valider: (carte) => carte.boutonRechercherProduit.click(),
    },
    {
      cle: 'clavier',
      libelle: 'en pressant la touche Entrée',
      valider: (carte) => carte.champCodeBarres.press('Enter'),
    },
  ]

  for (const facon of FACONS_DE_VALIDER) {
    test(`TC_INGREDIENT_008_ajout_manuel_${facon.cle} — un code-barres tapé au clavier et validé ${facon.libelle} importe le produit depuis OpenFoodFacts`, async ({ page }) => {
      const calculateur = new CalculateurPage(page)
      const carte = calculateur.carteIngredient

      /** Le produit tel que l'API l'a renvoyé — attendu du formulaire. */
      let produitApi

      await test.step('Étant donné l’étape « Code-barres » du calculateur, vierge', async () => {
        await calculateur.aller()
        await carte.ouvrirEtapeCodeBarres()
        await expect(carte.champCodeBarres, 'le champ code-barres doit partir vide').toHaveValue('')
      })

      await test.step(`Quand on tape le code-barres du produit et qu’on lance la recherche ${facon.libelle}`, async () => {
        const recherche = carte.attendreRechercheProduit(produitCodeBarres.codeBarres)
        await carte.saisirCodeBarres(produitCodeBarres.codeBarres)
        await facon.valider(carte)

        produitApi = await lireProduitServiParLApi(await recherche)
      })

      await test.step('Alors l’application confirme l’import du produit', async () => {
        await verifierNotificationImport(calculateur, produitApi)
      })

      await verifierProduitImporte(calculateur, produitApi)
    })
  }

  test('TC_INGREDIENT_009_ajout_scan — un code-barres scanné avec la caméra importe le produit depuis OpenFoodFacts', async ({ page }) => {
    // Le scan enchaîne trois attentes réelles : démarrage de la caméra, décodage
    // de l'image, puis interrogation d'OpenFoodFacts. D'où un délai élargi.
    test.slow()

    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    /** Le produit tel que l'API l'a renvoyé — attendu du formulaire. */
    let produitApi

    await test.step('Étant donné une caméra qui filme le code-barres du produit', async () => {
      // Voir fixtures/cameraFactice.js : seule la caméra est remplacée, par un
      // vrai flux vidéo montrant un vrai code-barres EAN-13. Le décodage, lui,
      // est bien fait par l'application.
      await installerCameraFactice(page, produitCodeBarres.codeBarres)

      await calculateur.aller()
      await carte.ouvrirEtapeCodeBarres()
      await expect(carte.champCodeBarres, 'aucun code ne doit être saisi à la main').toHaveValue('')
    })

    await test.step('Quand on ouvre le scanner et qu’on présente le produit à la caméra', async () => {
      const recherche = carte.attendreRechercheProduit(produitCodeBarres.codeBarres)
      await carte.boutonOuvrirScanner.click()

      await expect(carte.modaleScanner, 'le scanner doit s’ouvrir').toBeVisible()
      await expect(
        carte.consigneScanner,
        'la caméra doit démarrer ; sinon l’application affiche un message d’échec à la place de l’image',
      ).toBeVisible()

      // Aucune action supplémentaire : c'est le décodeur de l'application qui
      // reconnaît le code dans le flux, puis déclenche l'appel à l'API.
      produitApi = await lireProduitServiParLApi(await recherche)
    })

    await test.step('Alors le scanner se referme et l’application confirme l’import', async () => {
      await expect(carte.modaleScanner, 'le scanner doit se refermer de lui-même').toBeHidden()
      await verifierNotificationImport(calculateur, produitApi)
    })

    await verifierProduitImporte(calculateur, produitApi)
  })

  test('TC_INGREDIENT_013_ajout_code_barres_champ_nom — un code-barres tapé dans le champ « Nom du produit » est reconnu comme tel, et les chiffres cèdent la place au produit importé', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    /** Le produit tel que l'API l'a renvoyé — attendu du formulaire. */
    let produitApi

    // Le champ nom sert d'ordinaire à chercher dans la base Ciqual. Face à des
    // chiffres, l'application doit renoncer à cette recherche : on surveille donc
    // la route Ciqual pour le prouver.
    const appelsCiqual = espionnerAppelsApi(page, '/api/aliments')

    await test.step('Étant donné le formulaire de saisie manuelle (« Chercher / saisir »)', async () => {
      await calculateur.aller()
      await carte.ouvrirSaisieManuelle()
    })

    await test.step('Quand on tape le code-barres du produit dans le champ « Nom du produit »', async () => {
      await carte.rechercher(produitCodeBarres.codeBarres)
    })

    await test.step('Alors l’application propose de rechercher ce code-barres, et non un aliment de ce nom', async () => {
      await expect(
        carte.suggestionCodeBarres(produitCodeBarres.codeBarres),
        'la suggestion « Rechercher le code-barres … » doit être proposée',
      ).toBeVisible()

      // La recherche Ciqual est temporisée côté application. Constater son
      // absence exige de laisser cette fenêtre s'écouler : sans quoi on ne
      // constaterait que la temporisation elle-même, et l'assertion passerait
      // même si l'application interrogeait Ciqual juste après.
      await page.waitForTimeout(FENETRE_TEMPORISATION_CIQUAL)

      await expect(
        carte.suggestionsCiqual,
        'aucune suggestion Ciqual ne doit être proposée pour une suite de chiffres',
      ).toHaveCount(0)

      expect(
        appelsCiqual,
        'la base Ciqual ne doit pas être interrogée avec un code-barres',
      ).toHaveLength(0)
    })

    await test.step('Quand on clique cette suggestion', async () => {
      const recherche = carte.attendreRechercheProduit(produitCodeBarres.codeBarres)
      await carte.suggestionCodeBarres(produitCodeBarres.codeBarres).click()

      produitApi = await lireProduitServiParLApi(await recherche)
    })

    await test.step('Alors l’application confirme l’import du produit', async () => {
      await verifierNotificationImport(calculateur, produitApi)
    })

    // Le nom vérifié ici est celui du produit : les chiffres tapés ne restent
    // donc pas comme nom de l'ingrédient.
    await verifierProduitImporte(calculateur, produitApi)
  })
})

test.describe('Calculateur — code-barres refusé ou inconnu', () => {
  test(`TC_INGREDIENT_014_code_barres_trop_court — en dessous de ${SEUIL_LONGUEUR_CODE} chiffres, aucune recherche n’est possible ; au seuil, elle part`, async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    const appelsProduit = espionnerAppelsApi(page, '/api/produits/')

    await test.step('Étant donné l’étape « Code-barres » du calculateur', async () => {
      await calculateur.aller()
      await carte.ouvrirEtapeCodeBarres()
    })

    await test.step('Quand on tape des lettres mêlées aux chiffres', async () => {
      await carte.saisirCodeBarres('ab30cd17')
    })

    await test.step('Alors seuls les chiffres sont retenus : un code-barres n’en contient pas d’autre', async () => {
      await expect(carte.champCodeBarres).toHaveValue('3017')
    })

    await test.step(`Quand on complète à ${SEUIL_LONGUEUR_CODE - 1} chiffres, soit un de moins que le minimum`, async () => {
      await carte.saisirCodeBarres(codeBarresTropCourt)
      await carte.champCodeBarres.press('Enter')
    })

    await test.step('Alors la recherche est refusée des deux côtés : bouton inactif, et touche Entrée sans effet', async () => {
      await expect(
        carte.boutonRechercherProduit,
        'le bouton de recherche doit rester inactif',
      ).toBeDisabled()

      // La preuve que la touche Entrée n'a rien lancé n'est pas à l'écran : elle
      // est dans le réseau. L'étape suivante sert de témoin positif — le même
      // geste, un chiffre de plus, déclenche bien un appel.
      expect(
        appelsProduit,
        `aucune recherche ne doit partir avec ${SEUIL_LONGUEUR_CODE - 1} chiffres`,
      ).toHaveLength(0)
    })

    await test.step(`Quand on ajoute le ${SEUIL_LONGUEUR_CODE}ᵉ chiffre`, async () => {
      const recherche = carte.attendreRechercheProduit(codeBarresAuSeuil)
      await carte.saisirCodeBarres(codeBarresAuSeuil)

      await expect(
        carte.boutonRechercherProduit,
        'le bouton de recherche doit devenir actionnable',
      ).toBeEnabled()

      await carte.boutonRechercherProduit.click()
      await recherche
    })

    await test.step('Alors l’application interroge l’API — et une seule fois, celle du seuil', async () => {
      // Assertion décisive du cas : un aller-retour réseau complet s'est écoulé,
      // donc une requête partie avec le code trop court aurait forcément été
      // observée. Le seul appel recensé est celui du code au seuil.
      expect(
        appelsProduit,
        `un unique appel doit avoir eu lieu, au franchissement du seuil de ${SEUIL_LONGUEUR_CODE} chiffres`,
      ).toEqual([expect.stringContaining(`/api/produits/${codeBarresAuSeuil}`)])
    })
  })

  test('TC_INGREDIENT_015_code_barres_inconnu — un code-barres introuvable est signalé, sans bloquer : la saisie manuelle est proposée', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    await test.step('Étant donné l’étape « Code-barres » du calculateur', async () => {
      await calculateur.aller()
      await carte.ouvrirEtapeCodeBarres()
    })

    await test.step('Quand on recherche un code-barres inconnu d’OpenFoodFacts', async () => {
      const recherche = carte.attendreRechercheProduit(codeBarresInconnu)
      await carte.saisirCodeBarres(codeBarresInconnu)
      await carte.boutonRechercherProduit.click()

      const reponse = await recherche

      // Précondition vérifiée là où elle vit : OFF ne doit toujours pas connaître
      // ce code-barres. S'il finissait par y être enregistré, le test le dirait
      // ici plutôt que d'échouer sur une assertion d'interface obscure.
      expect(
        reponse.status(),
        `précondition JDD : OpenFoodFacts ne doit pas connaître le code-barres ${codeBarresInconnu}`,
      ).toBe(404)
    })

    await test.step('Alors l’échec est signalé sur le champ lui-même, en clair', async () => {
      // Attendre le marquage du champ avant de suivre le lien d'accessibilité :
      // le refus vient du réseau, l'interface n'est donc pas encore à jour au
      // retour de la réponse.
      await expect(carte.champCodeBarres, 'le champ doit être signalé en erreur')
        .toHaveAttribute('aria-invalid', 'true')

      const messageErreur = await carte.messageErreurDe(carte.champCodeBarres)
      await expect(messageErreur).toHaveText('Aucun produit trouvé pour ce code-barres.')
    })

    await test.step('Et rien n’est importé : le formulaire de saisie ne s’ouvre pas de lui-même', async () => {
      await expect(
        carte.etapeSaisie,
        'le formulaire de saisie ne doit pas s’ouvrir sur un échec',
      ).toHaveCount(0)
      await expect(
        carte.etapeCodeBarres,
        'l’application doit rester sur l’étape code-barres',
      ).toBeVisible()
    })

    await test.step('Quand on accepte la saisie manuelle proposée en repli', async () => {
      await expect(
        carte.lienSaisieManuelle,
        'un repli doit être proposé pour ne pas rester bloqué',
      ).toBeVisible()

      await carte.lienSaisieManuelle.click()
    })

    await test.step('Alors le formulaire s’ouvre vierge, prêt à décrire le produit à la main', async () => {
      await expect(carte.champNom, 'le nom doit rester à saisir').toHaveValue('')
      await expect(carte.champQuantite, 'la quantité doit rester à saisir').toHaveValue('')

      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        await expect(carte.champNutrition(cle), `${libelle} doit partir vide`).toHaveValue('')
      }
    })
  })
})

import { demarrerCollecteur } from './fixtures/collecteurSmtp'
import { viderBoiteMail } from './fixtures/boiteMail'

/**
 * Préparation de l'environnement, avant toute la campagne de tests.
 *
 * Ouvre la boîte mail de test (collecteur SMTP local) : les mails envoyés par
 * l'application pendant les tests y atterrissent au lieu de partir sur
 * Internet. Voir fixtures/collecteurSmtp.js.
 *
 * La fonction renvoyée est exécutée par Playwright à la fin de la campagne.
 */
export default async function global_setup() {
  // Repartir d'une boîte vide : un mail resté d'une exécution précédente
  // contiendrait un lien périmé, qu'un test pourrait prendre pour le sien.
  viderBoiteMail()

  const collecteur = await demarrerCollecteur()

  return async () => {
    await collecteur.arreter()
  }
}

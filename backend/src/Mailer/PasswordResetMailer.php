<?php

namespace App\Mailer;

use App\Entity\User;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

/**
 * Envoie l'email de réinitialisation de mot de passe, avec un lien pointant vers
 * le frontend (page /reset-password) qui appelle ensuite l'API pour valider le
 * jeton et enregistrer le nouveau mot de passe.
 */
final class PasswordResetMailer
{
    public function __construct(
        private MailerInterface $mailer,
        #[Autowire('%env(FRONTEND_URL)%')]
        private string $frontendUrl,
        #[Autowire('%env(MAILER_FROM)%')]
        private string $from,
    ) {
    }

    public function send(User $user): void
    {
        $link = rtrim($this->frontendUrl, '/')
            . '/reset-password?token=' . urlencode((string) $user->getResetToken());

        $pseudo = htmlspecialchars($user->getPseudo(), ENT_QUOTES);
        $safeLink = htmlspecialchars($link, ENT_QUOTES);

        $html = <<<HTML
        <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #143A29;">
          <p style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #2C7350; font-weight: 700;">Recettes</p>
          <h1 style="font-size: 24px; margin: 8px 0 16px;">Mot de passe oublié ?</h1>
          <p style="font-size: 15px; line-height: 1.6;">
            Bonjour {$pseudo}, tu as demandé à réinitialiser ton mot de passe.
            Clique sur le bouton ci-dessous pour en choisir un nouveau.
          </p>
          <p style="text-align: center; margin: 28px 0;">
            <a href="{$safeLink}" style="background: #2C7350; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">
              Choisir un nouveau mot de passe
            </a>
          </p>
          <p style="font-size: 13px; line-height: 1.6; color: #56A87C;">
            Ce lien est valable 1 heure. Si tu n'es pas à l'origine de cette demande,
            tu peux simplement ignorer cet email : ton mot de passe reste inchangé.
          </p>
          <p style="font-size: 12px; color: #7CBC97; word-break: break-all;">
            Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>{$safeLink}
          </p>
        </div>
        HTML;

        $text = "Bonjour {$user->getPseudo()},\n\n"
            . "Tu as demandé à réinitialiser ton mot de passe. Ouvre ce lien (valable 1 h) "
            . "pour en choisir un nouveau :\n{$link}\n\n"
            . "Si tu n'es pas à l'origine de cette demande, ignore cet email : "
            . "ton mot de passe reste inchangé.";

        $email = (new Email())
            ->from($this->from)
            ->to($user->getEmail())
            ->subject('Réinitialise ton mot de passe — Recettes')
            ->text($text)
            ->html($html);

        $this->mailer->send($email);
    }
}

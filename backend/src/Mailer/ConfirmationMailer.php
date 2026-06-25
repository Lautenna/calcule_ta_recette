<?php

namespace App\Mailer;

use App\Entity\User;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

/**
 * Envoie l'email de confirmation d'inscription, avec un lien pointant vers le
 * frontend (page /confirmation) qui appelle ensuite l'API pour valider le jeton.
 */
final class ConfirmationMailer
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
            . '/confirmation?token=' . urlencode((string) $user->getConfirmationToken());

        $pseudo = htmlspecialchars($user->getPseudo(), ENT_QUOTES);
        $safeLink = htmlspecialchars($link, ENT_QUOTES);

        $html = <<<HTML
        <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #143A29;">
          <p style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #2C7350; font-weight: 700;">Recettes</p>
          <h1 style="font-size: 24px; margin: 8px 0 16px;">Bienvenue, {$pseudo} !</h1>
          <p style="font-size: 15px; line-height: 1.6;">
            Merci de ton inscription. Il ne reste qu'une étape : confirme ton adresse email
            en cliquant sur le bouton ci-dessous.
          </p>
          <p style="text-align: center; margin: 28px 0;">
            <a href="{$safeLink}" style="background: #2C7350; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">
              Confirmer mon adresse
            </a>
          </p>
          <p style="font-size: 13px; line-height: 1.6; color: #56A87C;">
            Ce lien est valable 24 heures. Si tu n'es pas à l'origine de cette inscription,
            tu peux simplement ignorer cet email.
          </p>
          <p style="font-size: 12px; color: #7CBC97; word-break: break-all;">
            Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>{$safeLink}
          </p>
        </div>
        HTML;

        $text = "Bienvenue, {$user->getPseudo()} !\n\n"
            . "Confirme ton adresse email en ouvrant ce lien (valable 24 h) :\n{$link}\n\n"
            . "Si tu n'es pas à l'origine de cette inscription, ignore cet email.";

        $email = (new Email())
            ->from($this->from)
            ->to($user->getEmail())
            ->subject('Confirme ton inscription — Recettes')
            ->text($text)
            ->html($html);

        $this->mailer->send($email);
    }
}

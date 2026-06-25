<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260625083920 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute la confirmation d\'email (is_verified + jeton) sur la table user';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD is_verified TINYINT(1) NOT NULL DEFAULT 0, ADD confirmation_token VARCHAR(64) DEFAULT NULL, ADD confirmation_expires_at DATETIME DEFAULT NULL');
        // Les comptes créés avant cette fonctionnalité sont considérés déjà confirmés.
        $this->addSql('UPDATE `user` SET is_verified = 1');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE `user` DROP is_verified, DROP confirmation_token, DROP confirmation_expires_at');
    }
}

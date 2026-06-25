<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260625094723 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute les champs de réinitialisation de mot de passe (reset_token, reset_expires_at) à user';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD reset_token VARCHAR(64) DEFAULT NULL, ADD reset_expires_at DATETIME DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` DROP reset_token, DROP reset_expires_at');
    }
}

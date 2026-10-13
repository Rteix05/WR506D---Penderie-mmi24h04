<?php

// Donne à PHPStan (phpstan-doctrine) l'EntityManager de l'environnement de
// test : il y lit le mapping pour vérifier les requêtes DQL et les types
// des colonnes. Rien n'est exécuté en base.

use App\Kernel;
use Symfony\Component\Dotenv\Dotenv;

require __DIR__.'/../vendor/autoload.php';

(new Dotenv())->bootEnv(__DIR__.'/../.env');

$kernel = new Kernel('test', true);
$kernel->boot();

return $kernel->getContainer()->get('doctrine')->getManager();

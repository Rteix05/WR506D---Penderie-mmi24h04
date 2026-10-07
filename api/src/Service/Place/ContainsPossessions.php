<?php

namespace App\Service\Place;

/**
 * Un logement ou une pièce qui contient encore des affaires ne se supprime
 * pas : 409, chacun reprend les siennes d'abord.
 */
final class ContainsPossessions extends \RuntimeException
{
}

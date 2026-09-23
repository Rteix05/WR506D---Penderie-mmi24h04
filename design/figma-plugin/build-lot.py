#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Assemble un script Scripter complet a partir de :
    penderie-ui-v2-lib.js        (tokens + helpers, source unique)
  + lots/<nom>.body.js           (les ecrans du lot)
  = penderie-ui-v2-<nom>.js      (a coller dans Scripter)

Usage :  python build-lot.py 04-tenues
         python build-lot.py --all

Le fichier genere ne doit JAMAIS etre edite a la main : toute
correction de helper va dans la lib, puis on regenere.
"""
import io
import os
import sys
import subprocess

ICI = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(ICI, "penderie-ui-v2-lib.js")
LOTS = os.path.join(ICI, "lots")


def construire(nom):
    body_path = os.path.join(LOTS, nom + ".body.js")
    if not os.path.exists(body_path):
        print("  ! corps introuvable : " + body_path)
        return False

    lib = io.open(LIB, encoding="utf-8").read().rstrip()
    body = io.open(body_path, encoding="utf-8").read().lstrip()

    sortie = os.path.join(ICI, "penderie-ui-v2-" + nom + ".js")
    entete = (
        "// GENERE PAR build-lot.py — NE PAS EDITER A LA MAIN.\n"
        "// Corriger penderie-ui-v2-lib.js ou lots/" + nom + ".body.js,\n"
        "// puis relancer : python build-lot.py " + nom + "\n\n"
    )
    io.open(sortie, "w", encoding="utf-8", newline="\n").write(
        entete + lib + "\n\n" + body
    )

    # verification de syntaxe : mieux vaut echouer ici que dans Figma
    try:
        r = subprocess.run(["node", "--check", sortie],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print("  X " + nom + " : SYNTAXE INVALIDE")
            print(r.stderr.strip()[:500])
            return False
    except FileNotFoundError:
        print("  . node absent, syntaxe non verifiee")

    lignes = io.open(sortie, encoding="utf-8").read().count("\n")
    print("  OK " + os.path.basename(sortie) + "  (" + str(lignes) + " lignes)")
    return True


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    if args[0] == "--all":
        noms = sorted(f[:-len(".body.js")] for f in os.listdir(LOTS)
                      if f.endswith(".body.js"))
    else:
        noms = args
    ok = True
    for n in noms:
        ok = construire(n) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

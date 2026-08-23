/* ==========================================================================
   Lanceur de tests en ligne de commande
   Exécute les mêmes cas que les pages tests.html, sans navigateur.
   Aucune dépendance : uniquement Node, tel qu'il est fourni par GitHub Actions.

       node outils/executer-tests.js

   Sort en code 1 si un test échoue, ce qui fait échouer la CI.

   Pas de couleurs ANSI : elles imposeraient des octets d'échappement dans le
   source, fragiles à la copie, pour un gain nul dans un journal de CI.
   ========================================================================== */

"use strict";

var SUITES = [
  { nom: "Suivi de candidatures", chemin: "./suivi-candidatures/cas-de-tests.js" },
  { nom: "Départs de train",      chemin: "./departs-train/cas-de-tests.js" }
];

var totalGeneral = 0;
var echecsGeneral = 0;

SUITES.forEach(function (suite) {
  var executer = require(suite.chemin);
  var resultats = executer();
  var echecs = resultats.filter(function (r) { return !r.ok; });

  totalGeneral += resultats.length;
  echecsGeneral += echecs.length;

  console.log("");
  console.log(suite.nom);
  console.log(echecs.length === 0
    ? "  " + resultats.length + " tests passés"
    : "  " + echecs.length + " échec(s) sur " + resultats.length);

  // On ne détaille que les échecs : lister 58 lignes vertes n'apprend rien.
  echecs.forEach(function (r) {
    console.log("  ÉCHEC  " + r.nom);
    console.log("         " + r.message);
  });
});

console.log("");
if (echecsGeneral === 0) {
  console.log("Tous les tests passent (" + totalGeneral + ").");
  process.exit(0);
}
console.log(echecsGeneral + " test(s) en échec sur " + totalGeneral + ".");
process.exit(1);

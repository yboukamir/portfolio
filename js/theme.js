/* ==========================================================================
   Bascule clair / sombre, partagée par le portfolio et les outils.
   Le choix est mémorisé dans localStorage sous la clé « theme » ; sans choix
   explicite, le thème du système s'applique (voir tokens.css).
   ========================================================================== */

(function () {
  "use strict";

  var racine = document.documentElement;

  // Rétablit le choix précédent avant tout affichage, pour éviter un
  // clignotement du thème clair au chargement.
  try {
    var enregistre = localStorage.getItem("theme");
    if (enregistre === "dark" || enregistre === "light") {
      racine.setAttribute("data-theme", enregistre);
    }
  } catch (e) {
    /* Navigation privée ou stockage bloqué : on garde le thème du système. */
  }

  function brancher() {
    var bouton = document.getElementById("theme-toggle");
    if (!bouton) return;

    bouton.addEventListener("click", function () {
      var sombreSysteme = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var actuel = racine.getAttribute("data-theme") || (sombreSysteme ? "dark" : "light");
      var nouveau = actuel === "dark" ? "light" : "dark";

      racine.setAttribute("data-theme", nouveau);
      try { localStorage.setItem("theme", nouveau); } catch (e) {}
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", brancher);
  } else {
    brancher();
  }
})();

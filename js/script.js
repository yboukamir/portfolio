/* ==========================================================================
   boukamir.be — JavaScript partagé par les 4 pages
   1. Menu mobile · 2. Formulaires (contact + audit gratuit) · 3. Année courante

   Refonte du 31/08/2026 : le site n'est plus une seule page défilée, donc
   plus de lien de nav actif au scroll — chaque page pose son
   aria-current="page" directement dans le HTML. Aucune dépendance. Ce
   fichier ne sert qu'aux 4 pages publiques : les outils et les démos ont
   leur propre JavaScript.
   ========================================================================== */

(function () {
  "use strict";

  /* ========== 1. MENU MOBILE ==========
     Le menu piège le focus tant qu'il est ouvert et se referme à Échap : sans
     ça, la tabulation continue derrière le panneau, dans une page qu'on ne
     voit plus. */

  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");

  function elementsFocusables() {
    return Array.prototype.slice.call(nav.querySelectorAll("a[href]"));
  }

  function ouvrirMenu() {
    nav.classList.add("ouvert");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Fermer le menu");
    var premier = elementsFocusables()[0];
    if (premier) premier.focus();
  }

  function fermerMenu(rendreLeFocus) {
    nav.classList.remove("ouvert");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Ouvrir le menu");
    // On revient toujours sur le bouton, jamais sur ce qui était focalisé avant :
    // le menu ne s'ouvre que par lui, et mémoriser document.activeElement rend
    // le focus au <body> quand l'ouverture vient d'ailleurs qu'un clic réel.
    if (rendreLeFocus) burger.focus();
  }

  function menuOuvert() {
    return nav.classList.contains("ouvert");
  }

  if (burger && nav) {
    burger.addEventListener("click", function () {
      if (menuOuvert()) fermerMenu(true); else ouvrirMenu();
    });

    nav.addEventListener("click", function (ev) {
      if (ev.target.tagName === "A") fermerMenu(false);
    });

    document.addEventListener("keydown", function (ev) {
      if (!menuOuvert()) return;

      if (ev.key === "Escape") {
        fermerMenu(true);
        return;
      }

      if (ev.key !== "Tab") return;

      // Piège à focus : on boucle sur les liens du menu et le bouton lui-même.
      var cibles = elementsFocusables().concat([burger]);
      var premier = cibles[0];
      var dernier = cibles[cibles.length - 1];

      if (ev.shiftKey && document.activeElement === premier) {
        ev.preventDefault();
        dernier.focus();
      } else if (!ev.shiftKey && document.activeElement === dernier) {
        ev.preventDefault();
        premier.focus();
      }
    });
  }

  /* ========== 2. FORMULAIRES ==========
     Deux formulaires possibles par page (contact, audit gratuit), tous deux
     validés dans le navigateur puis envoyés vers Formspree, qui fait suivre
     par mail. L'adresse de destination est configurée chez eux, jamais ici :
     c'est ce qui évite qu'un robot la récolte sur la page.
     ⚠️ Formspree fonctionne aussi depuis localhost : tester un formulaire
     envoie un vrai message. */

  var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validerChamp(input) {
    var champ = input.closest(".field");
    if (!champ) return true;
    var messageErreur = champ.querySelector(".erreur-champ");
    var valeur = input.value.trim();
    var erreur = "";

    if (input.hasAttribute("required") && !valeur) {
      erreur = "Ce champ est obligatoire.";
    } else if (valeur && input.type === "email" && !REGEX_EMAIL.test(valeur)) {
      erreur = "Adresse email invalide.";
    } else if (valeur && input.id === "message" && valeur.length < 10) {
      erreur = "Message trop court (10 caractères minimum).";
    } else if (valeur && input.type === "url" && !/^https?:\/\/.+/.test(valeur)) {
      erreur = "Adresse invalide : commence par http:// ou https://";
    }

    champ.classList.toggle("invalide", Boolean(erreur));
    if (messageErreur) messageErreur.textContent = erreur;

    if (erreur) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");

    return !erreur;
  }

  function initialiserFormulaire(formulaire) {
    var note = formulaire.querySelector(".form-note");

    // On ne valide que les champs visibles : le piège à robots « _gotcha »
    // ne doit surtout pas être contrôlé.
    var champs = Array.prototype.slice.call(
      formulaire.querySelectorAll(".field input:not([name='_gotcha']), .field textarea")
    );

    champs.forEach(function (input) {
      input.addEventListener("blur", function () { validerChamp(input); });
      input.addEventListener("input", function () {
        if (input.closest(".field").classList.contains("invalide")) validerChamp(input);
      });
    });

    formulaire.addEventListener("submit", function (ev) {
      ev.preventDefault();

      var valide = champs.map(validerChamp).every(Boolean);
      if (!valide) {
        if (note) {
          note.className = "form-note";
          note.textContent = "Merci de corriger les champs indiqués.";
        }
        var premierInvalide = formulaire.querySelector(".field.invalide input, .field.invalide textarea");
        if (premierInvalide) premierInvalide.focus();
        return;
      }

      envoyer(formulaire, note);
    });
  }

  function envoyer(formulaire, note) {
    var bouton = formulaire.querySelector("button[type=submit]");
    var libelle = bouton ? bouton.textContent : "";

    if (bouton) {
      bouton.disabled = true;
      bouton.textContent = "Envoi en cours…";
    }
    if (note) {
      note.className = "form-note";
      note.textContent = "";
    }

    var donnees = new URLSearchParams(new FormData(formulaire)).toString();

    // L'en-tête « Accept » demande une réponse JSON plutôt qu'une redirection
    // vers la page de remerciement de Formspree : le visiteur reste ici.
    fetch(formulaire.action, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: donnees
    })
      .then(function (reponse) {
        if (!reponse.ok) throw new Error("HTTP " + reponse.status);
        if (note) {
          note.className = "form-note succes";
          note.textContent = "Merci ! C'est bien parti, je réponds sous 24 h.";
        }
        formulaire.reset();
      })
      .catch(function () {
        if (note) {
          note.className = "form-note echec";
          note.textContent = "L'envoi a échoué. Réessaie dans un instant, ou passe par LinkedIn.";
        }
      })
      .then(function () {
        if (bouton) {
          bouton.disabled = false;
          bouton.textContent = libelle;
        }
      });
  }

  Array.prototype.forEach.call(document.querySelectorAll("form[data-formulaire]"), initialiserFormulaire);

  /* ========== 3. ANNÉE COURANTE ========== */

  var annee = document.getElementById("annee");
  if (annee) annee.textContent = String(new Date().getFullYear());

})();

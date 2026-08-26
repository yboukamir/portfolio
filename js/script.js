/* ==========================================================================
   boukamir.be — page d'accueil
   1. Menu mobile · 2. En-tête au défilement · 3. Lien de nav actif
   4. Formulaire de contact · 5. Année courante

   Aucune dépendance. Ce fichier ne sert qu'à index.html : les outils et les
   démos ont leur propre JavaScript.
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


  /* ========== 2. EN-TÊTE AU DÉFILEMENT ========== */

  var entete = document.querySelector(".entete");

  function majEntete() {
    if (entete) entete.classList.toggle("defile", window.scrollY > 8);
  }
  majEntete();
  window.addEventListener("scroll", majEntete, { passive: true });


  /* ========== 3. LIEN DE NAVIGATION ACTIF ========== */

  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var liens = Array.prototype.slice.call(document.querySelectorAll(".nav a"));

  if (sections.length && liens.length && "IntersectionObserver" in window) {
    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        var id = entree.target.id;
        liens.forEach(function (lien) {
          lien.classList.toggle("actif", lien.getAttribute("href") === "#" + id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (section) { observateur.observe(section); });
  }


  /* ========== 4. FORMULAIRE DE CONTACT ==========
     Validation dans le navigateur, puis envoi vers Formspree, qui fait suivre
     par mail. L'adresse de destination est configurée chez eux, jamais ici :
     c'est ce qui évite qu'un robot la récolte sur la page. */

  var formulaire = document.getElementById("formulaire-contact");
  var note = document.getElementById("form-note");

  var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validerChamp(input) {
    var champ = input.closest(".champ");
    var messageErreur = champ.querySelector(".erreur");
    var valeur = input.value.trim();
    var erreur = "";

    if (!valeur) {
      erreur = "Ce champ est obligatoire.";
    } else if (input.type === "email" && !REGEX_EMAIL.test(valeur)) {
      erreur = "Adresse email invalide.";
    } else if (input.id === "message" && valeur.length < 10) {
      erreur = "Message trop court (10 caractères minimum).";
    }

    champ.classList.toggle("invalide", Boolean(erreur));
    if (messageErreur) messageErreur.textContent = erreur;

    if (erreur) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");

    return !erreur;
  }

  if (formulaire) {
    // On ne valide que les champs visibles : le piège à robots « _gotcha »
    // ne doit surtout pas être contrôlé.
    var champs = Array.prototype.slice.call(
      formulaire.querySelectorAll(".champ input, .champ textarea")
    );

    champs.forEach(function (input) {
      input.addEventListener("blur", function () { validerChamp(input); });
      input.addEventListener("input", function () {
        if (input.closest(".champ").classList.contains("invalide")) validerChamp(input);
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
        var premierInvalide = formulaire.querySelector(".champ.invalide input, .champ.invalide textarea");
        if (premierInvalide) premierInvalide.focus();
        return;
      }

      envoyer();
    });

    /* ⚠️ Formspree fonctionne aussi depuis localhost : tester le formulaire
       envoie un vrai message. */
    function envoyer() {
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
            note.textContent = "Merci ! Ton message est bien parti, je réponds sous 48 h.";
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
  }


  /* ========== 5. ANNÉE COURANTE ========== */

  var annee = document.getElementById("annee");
  if (annee) annee.textContent = String(new Date().getFullYear());


  /* ========== 6. APPARITION AU DÉFILEMENT ==========
     Quelques pixels de montée et un fondu quand un bloc entre à l'écran.
     Rien de plus : la maquette est volontairement immobile, et un mouvement
     trop appuyé la ferait paraître datée plutôt que vivante.

     Trois précautions, dans cet ordre :

     1. Si le visiteur a demandé moins d'animations, on ne fait rien du tout —
        on ne pose même pas la classe qui masque. Sans ce retour anticipé, une
        panne du reste laisserait la page invisible.
     2. Si IntersectionObserver manque, même chose. Le contenu ne doit jamais
        dépendre du JavaScript pour être lisible.
     3. La classe « à révéler » est posée PAR le script, pas écrite dans le
        HTML. Un visiteur sans JavaScript voit donc la page entière, dans son
        état final : c'est le seul montage qui ne peut pas cacher le contenu. */

  var mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!mouvementReduit && "IntersectionObserver" in window) {
    var aReveler = document.querySelectorAll(
      ".section > .conteneur, .chiffres-grille, .heros-texte, .heros-photo"
    );

    var observateurRepond = false;

    var observateur = new IntersectionObserver(function (entrees) {
      observateurRepond = true;
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        entree.target.classList.add("visible");
        observateur.unobserve(entree.target);   // une seule fois, jamais au retour
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });

    /* Le filet, et ce n'est pas de la prudence décorative.
       IntersectionObserver dépend du pipeline de rendu : dans un onglet
       d'arrière-plan, il ne rend pas la main tant que l'onglet n'est pas
       regardé. Vérifié sur cette page — onglet masqué, requestAnimationFrame
       muet, aucun rappel de l'observateur, pas même le premier.
       Tant que l'onglet reste caché ça ne gêne personne, puisque personne ne
       regarde. Mais si l'observateur ne répondait jamais, tout le contenu
       resterait à l'opacité 0 : un recruteur ouvrirait une page blanche.
       Deux secondes sans le moindre rappel, et on renonce à l'animation en
       retirant la classe partout. Le texte passe avant l'effet. */
    setTimeout(function () {
      if (observateurRepond) return;
      observateur.disconnect();
      Array.prototype.forEach.call(aReveler, function (bloc) {
        bloc.classList.remove("a-reveler");
      });
    }, 2000);

    // On pose d'abord la classe sur tous les blocs...
    Array.prototype.forEach.call(aReveler, function (bloc) {
      bloc.classList.add("a-reveler");
    });

    // ...puis on force le navigateur à recalculer AVANT de révéler quoi que
    // ce soit. Sans cette ligne, rien ne se passe : le navigateur regroupe la
    // pose de la classe et la révélation dans le même recalcul, l'état masqué
    // n'est jamais validé, il n'y a donc aucun changement à animer et les
    // blocs restent à l'état où ils étaient — visibles pour le héros, mais
    // jamais révélés pour les autres, qui gardent l'opacité pleine sans que
    // l'observateur puisse rien y changer. Mesuré : sans ce reflow, huit
    // blocs sur dix ne bougeaient plus du tout.
    void document.body.offsetHeight;

    Array.prototype.forEach.call(aReveler, function (bloc, i) {
      // Le héros est déjà à l'écran au chargement : le révéler tout de suite
      // évite un clignotement sur la première chose que le visiteur regarde.
      if (i < 2) { bloc.classList.add("visible"); return; }
      observateur.observe(bloc);
    });
  }

})();

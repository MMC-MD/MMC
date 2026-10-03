/*
 * Compact provider cards on phones.
 * Tags the parts of each doctor card (photo, name, credentials, bio) so
 * css/polish.css can lay them out as: small photo beside name, bio clamped
 * to a few lines with a "Read full bio" toggle. Desktop layout is unchanged.
 */
(function () {
    'use strict';

    // Each page builds its cards differently; describe each variant once.
    var VARIANTS = [
        { card: '.doctor-card-enhanced', photo: '.doctor-image-container', info: '.doctor-info-enhanced', name: '.doctor-name-enhanced', role: '.doctor-title-enhanced', bio: '.doctor-bio-enhanced' },
        { card: '.provider-card:not(.doctor-card-enhanced)', photo: '.provider-image-container', info: '.provider-info', name: '.provider-name', role: '.provider-title', bio: 'p.text-medium-gray' },
        { card: '.rounded-3xl:has(> .h-80 > img)', photo: '.h-80', info: '.p-8', name: 'h3', role: 'h3 + p', bio: '.space-y-4' }
    ];

    var COPY = {
        en: { more: 'Read full bio', less: 'Show less' },
        es: { more: 'Leer biografía completa', less: 'Mostrar menos' },
        fr: { more: 'Lire la biographie complète', less: 'Réduire' },
        ar: { more: 'اقرأ السيرة الكاملة', less: 'عرض أقل' },
        he: { more: 'לקריאת הביוגרפיה המלאה', less: 'הצג פחות' },
        zh: { more: '阅读完整简介', less: '收起' },
        it: { more: 'Leggi la biografia completa', less: 'Mostra meno' }
    };

    function lang() {
        var site = document.documentElement.getAttribute('data-pt-lang');
        if (site && COPY[site]) return site;
        return document.documentElement.lang === 'es' ? 'es' : 'en';
    }

    function label(button, open) {
        button.textContent = COPY[lang()][open ? 'less' : 'more'];
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    var uid = 0;

    function enhance(card, v) {
        if (card.classList.contains('mmc-pcard')) return;
        var photo = card.querySelector(v.photo);
        var info = card.querySelector(v.info);
        var name = info && info.querySelector(v.name);
        var role = info && info.querySelector(v.role);
        if (!photo || !info || !name) return;
        var bios = Array.prototype.slice.call(info.querySelectorAll(v.bio)).filter(function (el) {
            return el !== role && el.parentNode === info;
        });
        if (!bios.length) return;

        card.classList.add('mmc-pcard');
        photo.classList.add('mmc-pcard-photo');
        info.classList.add('mmc-pcard-info');
        name.classList.add('mmc-pcard-name');
        if (role) role.classList.add('mmc-pcard-role');

        // Group the bio paragraphs so they can be clamped together.
        var bio = document.createElement('div');
        bio.className = 'mmc-pcard-bio';
        bio.id = 'mmc-pcard-bio-' + (++uid);
        info.insertBefore(bio, bios[0]);
        bios.forEach(function (el) { bio.appendChild(el); });

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'mmc-pcard-more';
        button.setAttribute('aria-controls', bio.id);
        label(button, false);
        bio.parentNode.insertBefore(button, bio.nextSibling);
        button.addEventListener('click', function () {
            var open = !card.classList.contains('is-open');
            card.classList.toggle('is-open', open);
            label(button, open);
            if (!open) {
                var top = card.getBoundingClientRect().top;
                if (top < 0) window.scrollBy({ top: top - 120, behavior: 'smooth' });
            }
        });
    }

    // Hide "Read full bio" when the bio already fits in its trimmed height.
    function syncFits() {
        Array.prototype.forEach.call(document.querySelectorAll('.mmc-pcard'), function (card) {
            if (card.classList.contains('is-open')) return;
            var bio = card.querySelector('.mmc-pcard-bio');
            if (!bio || !bio.offsetParent) return;
            card.classList.toggle('mmc-pcard--fits', bio.scrollHeight <= bio.clientHeight + 2);
        });
    }

    function init() {
        VARIANTS.forEach(function (v) {
            var cards;
            try { cards = document.querySelectorAll(v.card); } catch (e) { return; } // :has() unsupported
            Array.prototype.forEach.call(cards, function (card) { enhance(card, v); });
        });
        syncFits();
        window.addEventListener('resize', syncFits);
        window.addEventListener('load', syncFits);
        // Filtered lists (About page tabs) reveal cards later.
        document.addEventListener('click', function (e) { if (e.target.closest('.tab-button')) setTimeout(syncFits, 400); });
    }

    // Keep the button text in the current language.
    new MutationObserver(function () {
        Array.prototype.forEach.call(document.querySelectorAll('.mmc-pcard-more'), function (b) {
            label(b, b.closest('.mmc-pcard').classList.contains('is-open'));
        });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

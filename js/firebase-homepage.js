import {
    fetchHomepageSlides,
    getFriendlyFirebaseError,
    subscribeToHomepageSlides
} from './firebase-client.js?v=2026041201';

const store = window.MMCSlideshowStore;
const slideshow = window.MMCSlideshow;

if (store && slideshow && document.getElementById('slideshow')) {
    const applySlides = function (slides) {
        store.setRemoteSlides(slides);
        slideshow.renderHomepageSlideshow();
    };

    fetchHomepageSlides()
        .then(applySlides)
        .catch(function (error) {
            console.warn('MMC slideshow fallback:', getFriendlyFirebaseError(error));
        });

    subscribeToHomepageSlides(
        function (slides) {
            applySlides(slides);
        },
        function (error) {
            console.warn('MMC slideshow live sync error:', getFriendlyFirebaseError(error));
        }
    );
}

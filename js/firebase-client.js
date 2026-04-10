import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {
    browserLocalPersistence,
    getAuth,
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';

const store = window.MMCSlideshowStore;
const slideshowCollection = 'siteContent';
const slideshowDocument = 'homepageSlideshow';
const emergencyBannerCollection = 'siteContent';
const emergencyBannerDocument = 'globalEmergencyBanner';
const scheduledBannersCollection = 'scheduledBanners';

const firebaseConfig = {
    apiKey: 'AIzaSyApTW8VY94FYUzqqliUkaqwJQI9742_5b4',
    authDomain: 'mmcblog-6573f.firebaseapp.com',
    projectId: 'mmcblog-6573f',
    storageBucket: 'mmcblog-6573f.firebasestorage.app',
    messagingSenderId: '973375448955',
    appId: '1:973375448955:web:b419564b9ead8121703fde'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const slideshowRef = doc(db, slideshowCollection, slideshowDocument);
const emergencyBannerRef = doc(db, emergencyBannerCollection, emergencyBannerDocument);
const scheduledBannersRef = collection(db, scheduledBannersCollection);

setPersistence(auth, browserLocalPersistence).catch(function () {
    return null;
});

function cloneSlides(slides) {
    return Array.isArray(slides)
        ? slides.map(store.normalizeSlide)
        : store.defaultSlides.map(store.normalizeSlide);
}

function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeCopy(value) {
    const source = value && typeof value === 'object' ? value : {};

    return {
        en: cleanText(source.en),
        es: cleanText(source.es)
    };
}

function createDefaultEmergencyBanner() {
    return {
        enabled: false,
        color: 'red',
        showPill: true,
        showButton: true,
        pill: {
            en: 'Emergency Notice',
            es: 'Aviso Importante'
        },
        message: {
            en: '',
            es: ''
        },
        ctaLabel: {
            en: '',
            es: ''
        },
        ctaUrl: '',
        ctaNewTab: false
    };
}

var BANNER_COLORS = ['red', 'orange', 'yellow', 'green'];

function normalizeBannerColor(value) {
    return BANNER_COLORS.indexOf(value) >= 0 ? value : 'red';
}

function normalizeEmergencyBanner(value) {
    const source = value && typeof value === 'object' ? value : {};
    const defaults = createDefaultEmergencyBanner();

    return {
        enabled: source.enabled === true,
        color: normalizeBannerColor(source.color),
        showPill: source.showPill !== false,
        showButton: source.showButton !== false,
        pill: {
            en: cleanText(source.pill && source.pill.en) || defaults.pill.en,
            es: cleanText(source.pill && source.pill.es) || defaults.pill.es
        },
        message: normalizeCopy(source.message),
        ctaLabel: normalizeCopy(source.ctaLabel),
        ctaUrl: cleanText(source.ctaUrl),
        ctaNewTab: !!source.ctaNewTab
    };
}

function normalizeSlidesPayload(snapshot) {
    if (!store) {
        return [];
    }

    if (!snapshot || !snapshot.exists()) {
        return cloneSlides(store.defaultSlides);
    }

    const data = snapshot.data() || {};
    const slides = Array.isArray(data.slides) && data.slides.length
        ? data.slides
        : store.defaultSlides;

    return cloneSlides(slides);
}

function normalizeEmergencyBannerPayload(snapshot) {
    if (!snapshot || !snapshot.exists()) {
        return createDefaultEmergencyBanner();
    }

    return normalizeEmergencyBanner(snapshot.data());
}

function getFriendlyFirebaseError(error) {
    const code = error && error.code ? error.code : '';

    if (code === 'auth/invalid-email') {
        return 'Enter a valid email address.';
    }

    if (
        code === 'auth/invalid-credential'
        || code === 'auth/wrong-password'
        || code === 'auth/user-not-found'
    ) {
        return 'Incorrect email or password.';
    }

    if (code === 'auth/user-disabled') {
        return 'This account has been disabled.';
    }

    if (code === 'auth/too-many-requests') {
        return 'Too many attempts. Wait a moment and try again.';
    }

    if (code === 'auth/network-request-failed') {
        return 'Network error. Check the connection and try again.';
    }

    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
        return 'This account does not currently have permission to edit the website.';
    }

    if (code === 'unavailable' || code === 'firestore/unavailable') {
        return 'The website service is temporarily unavailable.';
    }

    return (error && error.message) || 'We could not complete that request right now.';
}

async function fetchHomepageSlides() {
    const snapshot = await getDoc(slideshowRef);
    return normalizeSlidesPayload(snapshot);
}

async function fetchEmergencyBanner() {
    const snapshot = await getDoc(emergencyBannerRef);
    return normalizeEmergencyBannerPayload(snapshot);
}

function subscribeToHomepageSlides(onData, onError) {
    return onSnapshot(
        slideshowRef,
        function (snapshot) {
            onData(normalizeSlidesPayload(snapshot), snapshot);
        },
        function (error) {
            if (typeof onError === 'function') {
                onError(error);
            }
        }
    );
}

function subscribeToEmergencyBanner(onData, onError) {
    return onSnapshot(
        emergencyBannerRef,
        function (snapshot) {
            onData(normalizeEmergencyBannerPayload(snapshot), snapshot);
        },
        function (error) {
            if (typeof onError === 'function') {
                onError(error);
            }
        }
    );
}

async function saveHomepageSlides(slides, currentUser) {
    const normalizedSlides = cloneSlides(slides);

    await setDoc(
        slideshowRef,
        {
            slides: normalizedSlides,
            updatedAt: serverTimestamp(),
            updatedByUid: currentUser && currentUser.uid ? currentUser.uid : null,
            updatedByEmail: currentUser && currentUser.email ? currentUser.email : null
        },
        { merge: true }
    );

    return normalizedSlides;
}

async function saveEmergencyBanner(banner, currentUser) {
    const normalizedBanner = normalizeEmergencyBanner(banner);

    await setDoc(
        emergencyBannerRef,
        {
            ...normalizedBanner,
            updatedAt: serverTimestamp(),
            updatedByUid: currentUser && currentUser.uid ? currentUser.uid : null,
            updatedByEmail: currentUser && currentUser.email ? currentUser.email : null
        },
        { merge: true }
    );

    return normalizedBanner;
}

function observeAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}

async function signInAdmin(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
}

async function signOutAdmin() {
    await signOut(auth);
}

async function sendAdminPasswordReset(email) {
    await sendPasswordResetEmail(auth, email);
}

function normalizeScheduledBanner(value, id) {
    const source = value && typeof value === 'object' ? value : {};
    const banner = normalizeEmergencyBanner(source.banner || source);

    return {
        id: id || source.id || '',
        label: cleanText(source.label) || 'Scheduled Banner',
        startDate: cleanText(source.startDate),
        endDate: cleanText(source.endDate),
        banner: banner,
        createdAt: source.createdAt || null,
        updatedAt: source.updatedAt || null,
        updatedByEmail: cleanText(source.updatedByEmail)
    };
}

async function fetchScheduledBanners() {
    const q = query(scheduledBannersRef, orderBy('startDate', 'asc'));
    const snapshot = await getDocs(q);
    var results = [];

    snapshot.forEach(function (docSnap) {
        results.push(normalizeScheduledBanner(docSnap.data(), docSnap.id));
    });

    return results;
}

function subscribeToScheduledBanners(onData, onError) {
    const q = query(scheduledBannersRef, orderBy('startDate', 'asc'));

    return onSnapshot(
        q,
        function (snapshot) {
            var results = [];
            snapshot.forEach(function (docSnap) {
                results.push(normalizeScheduledBanner(docSnap.data(), docSnap.id));
            });
            onData(results);
        },
        function (error) {
            if (typeof onError === 'function') {
                onError(error);
            }
        }
    );
}

async function saveScheduledBanner(entry, currentUser) {
    const data = {
        label: cleanText(entry.label) || 'Scheduled Banner',
        startDate: cleanText(entry.startDate),
        endDate: cleanText(entry.endDate),
        banner: normalizeEmergencyBanner(entry.banner),
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser && currentUser.uid ? currentUser.uid : null,
        updatedByEmail: currentUser && currentUser.email ? currentUser.email : null
    };

    if (entry.id) {
        var ref = doc(db, scheduledBannersCollection, entry.id);
        await setDoc(ref, data, { merge: true });
        return normalizeScheduledBanner(data, entry.id);
    }

    data.createdAt = serverTimestamp();
    var newRef = await addDoc(scheduledBannersRef, data);
    return normalizeScheduledBanner(data, newRef.id);
}

async function deleteScheduledBanner(id) {
    if (!id) return;
    var ref = doc(db, scheduledBannersCollection, id);
    await deleteDoc(ref);
}

function getActiveScheduledBanner(scheduledBanners) {
    if (!Array.isArray(scheduledBanners) || !scheduledBanners.length) {
        return null;
    }

    var now = new Date();
    var todayStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');

    for (var i = 0; i < scheduledBanners.length; i++) {
        var entry = scheduledBanners[i];
        if (entry.startDate && entry.endDate && entry.startDate <= todayStr && entry.endDate >= todayStr) {
            return entry;
        }
    }

    return null;
}

export {
    app,
    auth,
    createDefaultEmergencyBanner,
    db,
    deleteScheduledBanner,
    emergencyBannerCollection,
    emergencyBannerDocument,
    fetchHomepageSlides,
    fetchEmergencyBanner,
    fetchScheduledBanners,
    firebaseConfig,
    getActiveScheduledBanner,
    getFriendlyFirebaseError,
    normalizeEmergencyBanner,
    normalizeScheduledBanner,
    observeAuthState,
    saveEmergencyBanner,
    saveHomepageSlides,
    saveScheduledBanner,
    sendAdminPasswordReset,
    signInAdmin,
    signOutAdmin,
    slideshowCollection,
    slideshowDocument,
    subscribeToEmergencyBanner,
    subscribeToHomepageSlides,
    subscribeToScheduledBanners
};

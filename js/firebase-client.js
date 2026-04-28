import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    deleteUser,
    getAuth,
    inMemoryPersistence,
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

/* ══════════════════════════════════════════════════
   Admin user roster + mute list
   ══════════════════════════════════════════════════ */

const ADMIN_EMAILS = ['efikess@gmail.com', 'bendoryair@gmail.com'];
const usersCollection = 'users';
const mutedRecipientsCollection = 'mutedRecipients';

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isAdminEmail(email) {
    return ADMIN_EMAILS.indexOf(normalizeEmail(email)) >= 0;
}

function isAdminUser(user) {
    return !!(user && user.email && isAdminEmail(user.email));
}

// Inviting a new user via createUserWithEmailAndPassword would normally swap
// the admin's session into the new account. To avoid that, we use a second
// Firebase app instance dedicated to user creation.
let secondaryApp = null;
let secondaryAuth = null;

function getSecondaryAuth() {
    if (!secondaryAuth) {
        secondaryApp = initializeApp(firebaseConfig, 'mmc-user-invite');
        secondaryAuth = getAuth(secondaryApp);
        // Don't persist anything from this scratch instance.
        setPersistence(secondaryAuth, inMemoryPersistence).catch(function () {
            return null;
        });
    }
    return secondaryAuth;
}

function generateRandomPassword() {
    const bytes = new Uint8Array(24);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
        out += bytes[i].toString(16).padStart(2, '0');
    }
    // Ensure complexity Firebase is happy with.
    return 'A1!' + out;
}

function normalizeUserRecord(value, id) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        uid: id || source.uid || '',
        email: normalizeEmail(source.email),
        invitedBy: cleanText(source.invitedBy),
        invitedAt: source.invitedAt || null,
        disabled: source.disabled === true,
        disabledAt: source.disabledAt || null,
        disabledBy: cleanText(source.disabledBy)
    };
}

async function inviteUser(email, currentUser) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
        throw new Error('Enter a valid email address.');
    }
    if (!isAdminUser(currentUser)) {
        throw new Error('Only admins can invite users.');
    }

    const tempAuth = getSecondaryAuth();
    const tempPassword = generateRandomPassword();

    // Create the auth account on the secondary app so the admin's session is untouched.
    const cred = await createUserWithEmailAndPassword(tempAuth, cleanEmail, tempPassword);
    const newUid = cred.user.uid;

    // Sign out of the secondary app immediately — we don't need it.
    try {
        await signOut(tempAuth);
    } catch (e) {
        // ignore
    }

    // Record the user in /users/{uid} so admins can manage them later.
    const userRef = doc(db, usersCollection, newUid);
    await setDoc(userRef, {
        uid: newUid,
        email: cleanEmail,
        invitedBy: currentUser.email || null,
        invitedAt: serverTimestamp(),
        disabled: false
    }, { merge: true });

    // Email the new user a "set your password" link via Firebase's built-in template.
    await sendPasswordResetEmail(auth, cleanEmail);

    return { uid: newUid, email: cleanEmail };
}

async function fetchUsers() {
    const snapshot = await getDocs(collection(db, usersCollection));
    const out = [];
    snapshot.forEach(function (docSnap) {
        out.push(normalizeUserRecord(docSnap.data(), docSnap.id));
    });
    out.sort(function (a, b) {
        return a.email.localeCompare(b.email);
    });
    return out;
}

function subscribeToUsers(onData, onError) {
    return onSnapshot(
        collection(db, usersCollection),
        function (snapshot) {
            const out = [];
            snapshot.forEach(function (docSnap) {
                out.push(normalizeUserRecord(docSnap.data(), docSnap.id));
            });
            out.sort(function (a, b) {
                return a.email.localeCompare(b.email);
            });
            onData(out);
        },
        function (error) {
            if (typeof onError === 'function') onError(error);
        }
    );
}

async function setUserDisabled(uid, disabled, currentUser) {
    if (!uid) throw new Error('Missing user id.');
    if (!isAdminUser(currentUser)) throw new Error('Only admins can change user status.');

    const userRef = doc(db, usersCollection, uid);
    await setDoc(userRef, {
        disabled: !!disabled,
        disabledAt: disabled ? serverTimestamp() : null,
        disabledBy: disabled ? (currentUser.email || null) : null
    }, { merge: true });
}

async function removeUserRecord(uid, currentUser) {
    if (!uid) throw new Error('Missing user id.');
    if (!isAdminUser(currentUser)) throw new Error('Only admins can remove users.');
    await deleteDoc(doc(db, usersCollection, uid));
}

// Cloudflare Worker that handles the privileged Firebase Admin SDK calls.
// Set/override at runtime by setting window.MMC_REMINDER_WORKER_URL before this
// module loads.
const REMINDER_WORKER_URL = (typeof window !== 'undefined' && window.MMC_REMINDER_WORKER_URL)
    || 'https://mmc-reminders.efikess.workers.dev';

async function deleteUserAccount(uid, email, currentUser) {
    if (!uid) throw new Error('Missing user id.');
    if (!isAdminUser(currentUser)) throw new Error('Only admins can delete users.');
    if (!auth.currentUser) throw new Error('You are not signed in.');

    const idToken = await auth.currentUser.getIdToken(true);

    const res = await fetch(REMINDER_WORKER_URL.replace(/\/+$/, '') + '/admin/delete-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + idToken
        },
        body: JSON.stringify({ uid: uid, email: email || '' })
    });

    if (!res.ok) {
        let message = 'Could not delete user account (HTTP ' + res.status + ').';
        try {
            const body = await res.json();
            if (body && body.error) message = body.error;
        } catch (e) {
            // ignore parse error
        }
        throw new Error(message);
    }

    // The Worker also drops the /users/{uid} doc, but in case Firestore is
    // still cached locally with that doc, also clear it here.
    try {
        await deleteDoc(doc(db, usersCollection, uid));
    } catch (e) {
        // already gone — fine
    }
}

async function sendUserPasswordReset(email) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) throw new Error('Enter a valid email address.');
    await sendPasswordResetEmail(auth, cleanEmail);
}

/* ── Mute list ───────────────────────────────────── */

function normalizeMuteRecord(value, id) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        email: normalizeEmail(id || source.email),
        mutedBy: cleanText(source.mutedBy),
        mutedAt: source.mutedAt || null,
        note: cleanText(source.note)
    };
}

async function fetchMutedRecipients() {
    const snapshot = await getDocs(collection(db, mutedRecipientsCollection));
    const out = [];
    snapshot.forEach(function (docSnap) {
        out.push(normalizeMuteRecord(docSnap.data(), docSnap.id));
    });
    out.sort(function (a, b) {
        return a.email.localeCompare(b.email);
    });
    return out;
}

function subscribeToMutedRecipients(onData, onError) {
    return onSnapshot(
        collection(db, mutedRecipientsCollection),
        function (snapshot) {
            const out = [];
            snapshot.forEach(function (docSnap) {
                out.push(normalizeMuteRecord(docSnap.data(), docSnap.id));
            });
            out.sort(function (a, b) {
                return a.email.localeCompare(b.email);
            });
            onData(out);
        },
        function (error) {
            if (typeof onError === 'function') onError(error);
        }
    );
}

async function muteRecipient(email, note, currentUser) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) throw new Error('Enter a valid email address.');
    if (!isAdminUser(currentUser)) throw new Error('Only admins can mute recipients.');

    const ref = doc(db, mutedRecipientsCollection, cleanEmail);
    await setDoc(ref, {
        email: cleanEmail,
        note: cleanText(note),
        mutedBy: currentUser.email || null,
        mutedAt: serverTimestamp()
    }, { merge: true });
}

async function unmuteRecipient(email, currentUser) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) return;
    if (!isAdminUser(currentUser)) throw new Error('Only admins can unmute recipients.');
    await deleteDoc(doc(db, mutedRecipientsCollection, cleanEmail));
}

function normalizeScheduledRecurrence(value) {
    const source = value && typeof value === 'object' ? value : {};
    var mode = source.mode;
    if (mode !== 'weekly' && mode !== 'biweekly') mode = 'dates';
    var days = [];
    if (Array.isArray(source.days)) {
        days = source.days
            .map(function (d) { return typeof d === 'number' ? d : parseInt(d, 10); })
            .filter(function (d) { return !isNaN(d) && d >= 0 && d <= 6; });
    }
    var result = { mode: mode, days: days };
    // biweekly mode: anchorDate is a YYYY-MM-DD string marking a "Week A" start (Monday)
    // weekParity: 0 = this banner shows on Week A, 1 = Week B
    if (mode === 'biweekly') {
        result.anchorDate = typeof source.anchorDate === 'string' ? source.anchorDate : '';
        result.weekParity = source.weekParity === 1 ? 1 : 0;
    }
    return result;
}

function normalizeScheduledBanner(value, id) {
    const source = value && typeof value === 'object' ? value : {};
    const banner = normalizeEmergencyBanner(source.banner || source);

    return {
        id: id || source.id || '',
        label: cleanText(source.label) || 'Scheduled Banner',
        startDate: cleanText(source.startDate),
        endDate: cleanText(source.endDate),
        recurrence: normalizeScheduledRecurrence(source.recurrence),
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
        recurrence: normalizeScheduledRecurrence(entry.recurrence),
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
    var todayDow = now.getDay(); // 0 = Sun, 6 = Sat

    for (var i = 0; i < scheduledBanners.length; i++) {
        var entry = scheduledBanners[i];
        var recurrence = entry.recurrence || { mode: 'dates', days: [] };

        if (recurrence.mode === 'weekly') {
            if (Array.isArray(recurrence.days) && recurrence.days.indexOf(todayDow) !== -1) {
                return entry;
            }
            continue;
        }

        if (recurrence.mode === 'biweekly') {
            // Check if today's day-of-week is in the active days list
            if (!Array.isArray(recurrence.days) || recurrence.days.indexOf(todayDow) === -1) {
                continue;
            }
            // Determine which week we're in (A=0, B=1) relative to the anchor date
            var anchor = recurrence.anchorDate;
            if (!anchor) continue;
            var anchorParts = anchor.split('-');
            var anchorMs = new Date(parseInt(anchorParts[0], 10), parseInt(anchorParts[1], 10) - 1, parseInt(anchorParts[2], 10)).getTime();
            var todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            var diffDays = Math.floor((todayMs - anchorMs) / 86400000);
            var currentWeekIndex = Math.floor(diffDays / 7);
            // Even weeks from anchor = Week A (parity 0), Odd = Week B (parity 1)
            var currentParity = ((currentWeekIndex % 2) + 2) % 2; // safe modulo for negatives
            if (currentParity === (recurrence.weekParity || 0)) {
                return entry;
            }
            continue;
        }

        if (entry.startDate && entry.endDate && entry.startDate <= todayStr && entry.endDate >= todayStr) {
            return entry;
        }
    }

    return null;
}

export {
    ADMIN_EMAILS,
    app,
    auth,
    createDefaultEmergencyBanner,
    db,
    deleteScheduledBanner,
    deleteUserAccount,
    emergencyBannerCollection,
    emergencyBannerDocument,
    fetchHomepageSlides,
    fetchEmergencyBanner,
    fetchMutedRecipients,
    fetchScheduledBanners,
    fetchUsers,
    firebaseConfig,
    getActiveScheduledBanner,
    getFriendlyFirebaseError,
    inviteUser,
    isAdminEmail,
    isAdminUser,
    muteRecipient,
    normalizeEmergencyBanner,
    normalizeScheduledBanner,
    observeAuthState,
    removeUserRecord,
    saveEmergencyBanner,
    saveHomepageSlides,
    saveScheduledBanner,
    sendAdminPasswordReset,
    sendUserPasswordReset,
    setUserDisabled,
    signInAdmin,
    signOutAdmin,
    slideshowCollection,
    slideshowDocument,
    subscribeToEmergencyBanner,
    subscribeToHomepageSlides,
    subscribeToMutedRecipients,
    subscribeToScheduledBanners,
    subscribeToUsers,
    unmuteRecipient
};

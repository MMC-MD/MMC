let contactBarResizeObserver = null;
let resizeListenerAttached = false;
let resizeDebounceTimer = null;
const contactOptionSelector = '[data-contact-option], .contact-method, .contact-address-card';

function sanitizeInjectedPartial(html) {
    return String(html || '')
        .replace(/<!--\s*Code injected by live-server\s*-->[\s\S]*?<\/script>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?IsThisFirstTime_Log_From_LiveServer[\s\S]*?<\/script>/gi, '');
}

function ensureContactModalStyles(basePath) {
    const existingStylesheet = document.querySelector(
        'link[data-mmc-contact-modal-styles], link[href$="css/contact-modal.css"], link[href*="/css/contact-modal.css"]'
    );

    if (existingStylesheet) {
        existingStylesheet.setAttribute('data-mmc-contact-modal-styles', 'true');
        return;
    }

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = basePath + 'css/contact-modal.css';
    stylesheet.setAttribute('data-mmc-contact-modal-styles', 'true');
    document.head.appendChild(stylesheet);
}

function initHeaderFooter() {
    const pathName = window.location.pathname;
    const pathSegments = pathName.split('/').filter(Boolean);
    const currentFile = pathSegments[pathSegments.length - 1] || 'index.html';
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    // Detect if we're on a subpage by checking if stylesheets use '../' paths
    let isSubpage = false;
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"]');
    for (let i = 0; i < stylesheets.length; i++) {
        const href = stylesheets[i].getAttribute('href') || '';
        if (href.startsWith('../')) { isSubpage = true; break; }
    }
    const isHomePage = !isSubpage;
    const inferredBasePath = isSubpage ? '../' : '';
    const basePath = (headerPlaceholder && typeof headerPlaceholder.dataset.mmcHeaderBasePath === 'string')
        ? headerPlaceholder.dataset.mmcHeaderBasePath
        : inferredBasePath;

    if (headerPlaceholder) {
        headerPlaceholder.dataset.mmcHeaderBasePath = basePath;
    }

    const headerAlreadyInjected = !!(headerPlaceholder &&
        headerPlaceholder.dataset.mmcHeaderInserted === 'true' &&
        headerPlaceholder.childElementCount > 0 &&
        headerPlaceholder.querySelector('#siteEmergencyBanner'));

    const headerPromise = (!headerPlaceholder || headerAlreadyInjected)
        ? Promise.resolve()
        : fetch(basePath + 'includes/header.html')
            .then(response => response.text())
            .then(data => {
                headerPlaceholder.innerHTML = sanitizeInjectedPartial(data);
                headerPlaceholder.dataset.mmcHeaderInserted = 'true';
            })
            .catch(error => {
                console.error('Error loading header:', error);
            });

    Promise.resolve(headerPromise).then(() => {
        if (!headerPlaceholder) {
            return;
        }

        updateHeaderLinks(basePath, isHomePage);
        initializeMobileMenu();
        initializeServicesDropdown();
        ensureContactModalStyles(basePath);
        initializeContactModal();
        ensureGlobalBannerScript(basePath);
        updateContactBarOffset();
        observeContactBarHeight();

        if (!resizeListenerAttached) {
            window.addEventListener('resize', handleWindowResize);
            window.addEventListener('orientationchange', handleWindowResize);
            window.addEventListener('load', updateContactBarOffset);
            resizeListenerAttached = true;
        }

        document.dispatchEvent(new CustomEvent('mmc:header-ready', {
            detail: {
                basePath,
                isHomePage
            }
        }));
    });

    if (footerPlaceholder) {
        fetch(basePath + 'includes/footer.html')
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = sanitizeInjectedPartial(data);
                updateFooterLinks(basePath);
                if (typeof window.mmcApplyLang === 'function') window.mmcApplyLang();
            })
            .catch(error => console.error('Error loading footer:', error));
    }

    // Load accessibility widget CSS + JS and cookie consent
    if (!document.querySelector('[data-mmc-a11y-loaded]')) {
        var a11yCss = document.createElement('link');
        a11yCss.rel = 'stylesheet';
        a11yCss.href = basePath + 'css/accessibility.css';
        a11yCss.setAttribute('data-mmc-a11y-loaded', 'true');
        document.head.appendChild(a11yCss);

        var a11yJs = document.createElement('script');
        a11yJs.src = basePath + 'js/accessibility.js';
        a11yJs.defer = true;
        document.body.appendChild(a11yJs);

        var cookieJs = document.createElement('script');
        cookieJs.src = basePath + 'js/cookie-consent.js';
        cookieJs.defer = true;
        document.body.appendChild(cookieJs);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderFooter, { once: true });
} else {
    initHeaderFooter();
}

// Update all header links based on current page location
function updateHeaderLinks(basePath, isHomePage) {
    // Update logo
    const logoLink = document.querySelector('.logo-link');
    const logoImg = document.querySelector('.logo-img');
    if (logoLink && logoImg) {
        logoLink.href = basePath + 'index.html';
        const logoWebp = basePath + 'images/Logo-fast.webp';
        const logoFallback = basePath + 'images/Logo.png';

        if (!logoImg.dataset.mmcLogoFallbackBound) {
            logoImg.addEventListener('error', function handleLogoError() {
                if (logoImg.dataset.mmcLogoFallbackUsed === 'true') {
                    return;
                }
                logoImg.dataset.mmcLogoFallbackUsed = 'true';
                logoImg.src = logoFallback;
            });
            logoImg.dataset.mmcLogoFallbackBound = 'true';
        }

        logoImg.src = logoWebp;
        logoImg.setAttribute('loading', 'eager');
        logoImg.setAttribute('decoding', 'sync');
        logoImg.setAttribute('fetchpriority', 'high');
        logoImg.width = 360;
        logoImg.height = 100;
    }
    
    // Define page mappings
    const pages = {
        'nav-home': 'index.html',
        'nav-urgent': 'urgent-primary-care/',
        'nav-sports': 'sports-medicine/',
        'nav-derma': 'dermatology/',
        'nav-acupuncture': 'five-elements-acupuncture/',
        'nav-wellness': 'nutrition-wellness/',
        'nav-occupational': 'occupational-health/',
        'nav-faa': 'faa-physicals/pilot-resources/',
        'nav-immigration': 'immigration-physicals/',
        'nav-about': 'about/',
        'nav-insurance': 'insurance/'
    };
    
    // Update desktop navigation links (querySelectorAll to catch flyout + dropdown duplicates)
    Object.keys(pages).forEach(className => {
        document.querySelectorAll('.' + className).forEach(link => {
            link.href = basePath + pages[className];
        });
    });

    // Update mobile navigation links
    Object.keys(pages).forEach(className => {
        document.querySelectorAll('.mobile-' + className).forEach(link => {
            link.href = basePath + pages[className];
        });
    });
    
    // Set active class based on current page
    setActiveNavLink();
}

// Update all footer links
function updateFooterLinks(basePath) {
    // Update footer logo
    const footerLogo = document.querySelector('.footer-logo');
    if (footerLogo) {
        const logoWebp = basePath + 'images/Logo-fast.webp';
        const logoFallback = basePath + 'images/Logo.png';

        if (!footerLogo.dataset.mmcLogoFallbackBound) {
            footerLogo.addEventListener('error', () => {
                if (footerLogo.dataset.mmcLogoFallbackUsed === 'true') {
                    return;
                }
                footerLogo.dataset.mmcLogoFallbackUsed = 'true';
                footerLogo.src = logoFallback;
            });
            footerLogo.dataset.mmcLogoFallbackBound = 'true';
        }

        footerLogo.src = logoWebp;
        footerLogo.setAttribute('loading', 'lazy');
        footerLogo.decoding = 'async';
    }
    
    // Define page mappings for footer
    const footerPages = {
        'footer-nav-urgent': 'urgent-primary-care/',
        'footer-nav-sports': 'sports-medicine/',
        'footer-nav-derma': 'dermatology/',
        'footer-nav-wellness': 'nutrition-wellness/',
        'footer-nav-occupational': 'occupational-health/',
        'footer-nav-careers': 'careers/',
        'footer-nav-privacy': 'privacy-policy/',
        'footer-nav-terms': 'terms-of-service/'
    };
    
    // Update footer navigation links
    Object.keys(footerPages).forEach(className => {
        const link = document.querySelector('.' + className);
        if (link) {
            link.href = basePath + footerPages[className];
        }
    });
}

// Set active class on current page navigation link
function setActiveNavLink() {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    // Get the folder name (e.g., 'about' from '/MMC/about/' or '/about/index.html')
    const lastMeaningful = pathSegments.filter(s => s !== 'index.html').pop() || '';

    // Remove all active classes first
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Map folder name to navigation class
    const pageToNavClass = {
        '': 'nav-home',
        'index.html': 'nav-home',
        'urgent-primary-care': 'nav-urgent',
        'sports-medicine': 'nav-sports',
        'dermatology': 'nav-derma',
        'five-elements-acupuncture': 'nav-acupuncture',
        'nutrition-wellness': 'nav-wellness',
        'occupational-health': 'nav-occupational',
        'faa-physicals': 'nav-occupational',
        'pilot-resources': 'nav-occupational',
        'immigration-physicals': 'nav-occupational',
        'about': 'nav-about',
        'insurance': 'nav-insurance'
    };

    const navClass = pageToNavClass[lastMeaningful];
    if (navClass) {
        const activeLink = document.querySelector('.' + navClass);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

// Initialize mobile menu functionality
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.setAttribute('aria-controls', 'mobile-menu');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.classList.remove('active');
        mobileMenuBtn.dataset.mmcMobileMenuFallback = 'true';

        if (!mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
        }
        mobileMenu.classList.remove('is-open');

        const fallbackToggle = () => {
            if (mobileMenuBtn.dataset.mmcMobileMenuEnhanced === 'true') {
                return;
            }

            const willOpen = mobileMenu.classList.contains('hidden');
            if (willOpen) {
                mobileMenu.classList.remove('hidden');
                mobileMenu.classList.add('is-open');
                document.body.classList.add('mobile-menu-open');
                mobileMenuBtn.setAttribute('aria-expanded', 'true');
                mobileMenuBtn.classList.add('active');
            } else {
                mobileMenu.classList.remove('is-open');
                mobileMenu.classList.add('hidden');
                document.body.classList.remove('mobile-menu-open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                mobileMenuBtn.classList.remove('active');
            }
        };

        const fallbackClose = () => {
            if (mobileMenuBtn.dataset.mmcMobileMenuEnhanced === 'true') {
                return;
            }

            mobileMenu.classList.remove('is-open');
            mobileMenu.classList.add('hidden');
            document.body.classList.remove('mobile-menu-open');
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            mobileMenuBtn.classList.remove('active');
        };

        const handleDocumentClick = (event) => {
            if (mobileMenuBtn.dataset.mmcMobileMenuEnhanced === 'true') {
                return;
            }

            if (mobileMenu.classList.contains('hidden')) {
                return;
            }

            if (mobileMenu.contains(event.target) || mobileMenuBtn.contains(event.target)) {
                return;
            }

            fallbackClose();
        };

        const handleResize = () => {
            if (mobileMenuBtn.dataset.mmcMobileMenuEnhanced === 'true') {
                return;
            }

            if (window.innerWidth >= 1024) {
                fallbackClose();
            }
        };

        document.addEventListener('click', handleDocumentClick);
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        // Store references so enhanced scripts can remove if needed
        mobileMenuBtn.__mmcFallbackToggle__ = fallbackToggle;
        mobileMenu.__mmcFallbackClose__ = fallbackClose;
        mobileMenu.__mmcFallbackDocumentHandler__ = handleDocumentClick;
        mobileMenu.__mmcFallbackResizeHandler__ = handleResize;

        mobileMenuBtn.addEventListener('click', fallbackToggle);
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', fallbackClose);
        });
    }
}

function ensureGlobalBannerScript(basePath) {
    if (document.querySelector('script[data-mmc-site-banner-script="true"]')) {
        return;
    }

    function injectBannerScript(attempt) {
        var script = document.createElement('script');
        script.type = 'module';
        script.src = basePath + 'js/firebase-site-banner.js?v=2026041201';
        script.dataset.mmcSiteBannerScript = 'true';

        script.onerror = function () {
            console.warn('MMC banner script failed to load (attempt ' + attempt + ')');
            script.remove();
            if (attempt < 2) {
                setTimeout(function () { injectBannerScript(attempt + 1); }, 2000);
            }
        };

        document.body.appendChild(script);
    }

    injectBannerScript(1);
}

        // Initialize services dropdown functionality
        function initializeServicesDropdown() {
            const servicesButton = document.getElementById('services-button');
            const servicesDropdown = document.getElementById('services-dropdown');
            const servicesArrow = document.getElementById('services-arrow');
            const dropdownWrapper = document.querySelector('.services-dropdown-wrapper');
            
            if (!servicesButton || !servicesDropdown || !dropdownWrapper) {
                console.warn('Dropdown elements not found, retrying in 100ms...');
                setTimeout(initializeServicesDropdown, 100);
                return;
            }
            
            let isOpen = false;
            let hoverTimeout = null;
            
            // Function to show dropdown
            function showDropdown() {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
                servicesDropdown.classList.add('active');
                if (servicesArrow) {
                    servicesArrow.classList.add('rotate-180');
                }
                isOpen = true;
            }
            
            const HOVER_HIDE_DELAY = 350;

            // Function to hide dropdown
            function hideDropdown(options = {}) {
                const { immediate = false } = options;
                clearTimeout(hoverTimeout);
                hoverTimeout = null;

                if (immediate || window.innerWidth <= 1024) {
                    servicesDropdown.classList.remove('active');
                    if (servicesArrow) {
                        servicesArrow.classList.remove('rotate-180');
                    }
                    isOpen = false;
                    hoverTimeout = null;
                    return;
                }

                hoverTimeout = setTimeout(() => {
                    servicesDropdown.classList.remove('active');
                    if (servicesArrow) {
                        servicesArrow.classList.remove('rotate-180');
                    }
                    isOpen = false;
                    hoverTimeout = null;
                }, HOVER_HIDE_DELAY);
            }
            
            // Desktop hover events
            dropdownWrapper.addEventListener('mouseenter', function() {
                if (window.innerWidth > 1024) {
                    showDropdown();
                }
            });
            
            dropdownWrapper.addEventListener('mouseleave', function() {
                if (window.innerWidth > 1024) {
                    hideDropdown();
                }
            });
            
            // Keep dropdown open when hovering over it
            servicesDropdown.addEventListener('mouseenter', function() {
                if (window.innerWidth > 1024) {
                    clearTimeout(hoverTimeout);
                }
            });
            
            servicesDropdown.addEventListener('mouseleave', function() {
                if (window.innerWidth > 1024) {
                    hideDropdown();
                }
            });
            
            // Mobile/tablet click events
            servicesButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (window.innerWidth <= 1024) {
                    if (isOpen) {
                        hideDropdown({ immediate: true });
                    } else {
                        showDropdown();
                    }
                }
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!dropdownWrapper.contains(e.target) && !servicesDropdown.contains(e.target)) {
                    if (isOpen) {
                        servicesDropdown.classList.remove('active');
                        if (servicesArrow) {
                            servicesArrow.classList.remove('rotate-180');
                        }
                        isOpen = false;
                    }
                }
            });
            
            // Close on Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && isOpen) {
                    servicesDropdown.classList.remove('active');
                    if (servicesArrow) {
                        servicesArrow.classList.remove('rotate-180');
                    }
                    isOpen = false;
                }
            });
            
            // Handle window resize
            window.addEventListener('resize', function() {
                if (window.innerWidth > 1024 && isOpen) {
                    // On desktop, rely on CSS hover states
                    servicesDropdown.classList.remove('active');
                    if (servicesArrow) {
                        servicesArrow.classList.remove('rotate-180');
                    }
                    isOpen = false;
                }
            });
            
            /* dropdown ready */
        }

function initializeContactModal() {
    const modal = document.getElementById('contact-modal');
    const contactTriggers = document.querySelectorAll('[data-contact-trigger]');

    if (!modal || contactTriggers.length === 0) {
        return;
    }

    if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
    }

    if (modal.dataset.modalInitialized === 'true') {
        return;
    }

    modal.dataset.modalInitialized = 'true';
    modal.setAttribute('aria-hidden', 'true');

    const closeButton = modal.querySelector('[data-contact-close]');
    const contactOptions = modal.querySelectorAll(contactOptionSelector);
    const body = document.body;
    const mobileMenu = document.getElementById('mobile-menu');
    let lastFocusedElement = null;

    function openModal(event) {
        event.preventDefault();
        lastFocusedElement = document.activeElement;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        body.classList.add('modal-open');

        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
        }

        const focusTarget = closeButton || modal.querySelector(contactOptionSelector);
        if (focusTarget && typeof focusTarget.focus === 'function') {
            focusTarget.focus();
        }
    }

    function closeModal() {
        if (!modal.classList.contains('active')) {
            return;
        }

        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        body.classList.remove('modal-open');

        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
        }
    }

    contactTriggers.forEach(trigger => {
        trigger.addEventListener('click', openModal);
    });

    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });

    contactOptions.forEach(option => {
        option.addEventListener('click', closeModal);
    });
}

function updateContactBarOffset() {
    const emergencyBanner = document.querySelector('.site-emergency-banner:not([hidden])');
    const topContactBar = document.querySelector('.top-contact-bar');
    const stickyHeader = document.querySelector('.site-sticky-header');
    const root = document.documentElement;
    const bannerHeight = emergencyBanner ? emergencyBanner.offsetHeight : 0;
    const contactBarHeight = topContactBar ? topContactBar.offsetHeight : 0;
    const stickyHeaderHeight = stickyHeader ? stickyHeader.offsetHeight : 0;

    root.style.setProperty('--site-emergency-banner-height', `${bannerHeight}px`);
    root.style.setProperty('--site-sticky-header-height', `${stickyHeaderHeight || (bannerHeight + contactBarHeight + 84)}px`);

    if (topContactBar) {
        const height = bannerHeight + contactBarHeight;
        root.style.setProperty('--top-contact-bar-height', `${height}px`);
    } else {
        root.style.removeProperty('--top-contact-bar-height');
    }
}

function observeContactBarHeight() {
    if (typeof ResizeObserver === 'undefined') {
        return;
    }

    const topContactBar = document.querySelector('.top-contact-bar');
    const stickyHeader = document.querySelector('.site-sticky-header');

    if (!topContactBar && !stickyHeader) {
        return;
    }

    if (contactBarResizeObserver) {
        contactBarResizeObserver.disconnect();
    }

    contactBarResizeObserver = new ResizeObserver(() => {
        updateContactBarOffset();
    });

    if (topContactBar) {
        contactBarResizeObserver.observe(topContactBar);
    }

    if (stickyHeader) {
        contactBarResizeObserver.observe(stickyHeader);
    }
}

function handleWindowResize() {
    if (resizeDebounceTimer) {
        clearTimeout(resizeDebounceTimer);
    }

    resizeDebounceTimer = setTimeout(() => {
        updateContactBarOffset();
    }, 150);
}

document.addEventListener('mmc:sticky-header-metrics', updateContactBarOffset);

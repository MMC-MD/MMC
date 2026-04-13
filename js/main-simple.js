// Montgomery Medical Clinic - Enhanced Main JavaScript with Perfect Dropdown

let headerEnhancementsInitialized = false;

function initHeaderEnhancements() {
    if (headerEnhancementsInitialized) {
        return;
    }

    const servicesButton = document.getElementById('services-button');
    const servicesDropdown = document.getElementById('services-dropdown');
    const mobileMenuButton = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const header = document.querySelector('header');

    if (!servicesButton || !servicesDropdown || !mobileMenuButton || !mobileMenu || !header) {
        return;
    }

    headerEnhancementsInitialized = true;

    let isDropdownOpen = false;
    let closeTimer = null;
    const dropdownWrapper = servicesButton.closest('.services-dropdown-wrapper');

    // Show/hide dropdown — positioning handled by CSS (dropdown-fix.css)
    function showDropdown() {
        clearTimeout(closeTimer);
        servicesDropdown.classList.add('active');
        isDropdownOpen = true;
    }

    function hideDropdown(immediate) {
        clearTimeout(closeTimer);
        if (immediate) {
            servicesDropdown.classList.remove('active');
            isDropdownOpen = false;
        } else {
            closeTimer = setTimeout(() => {
                servicesDropdown.classList.remove('active');
                isDropdownOpen = false;
            }, 250);
        }
    }

    // Desktop: Show on hover
    if (dropdownWrapper) {
        dropdownWrapper.addEventListener('mouseenter', () => {
            if (window.innerWidth >= 1280) {
                showDropdown();
            }
        });

        dropdownWrapper.addEventListener('mouseleave', () => {
            if (window.innerWidth >= 1280) {
                hideDropdown();
            }
        });
    }

    // Keep dropdown open when hovering over it
    servicesDropdown.addEventListener('mouseenter', () => {
        if (window.innerWidth >= 1280) {
            clearTimeout(closeTimer);
            showDropdown();
        }
    });

    servicesDropdown.addEventListener('mouseleave', () => {
        if (window.innerWidth >= 1280) {
            hideDropdown();
        }
    });

    // Mobile: Toggle on click
    servicesButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (window.innerWidth < 1280) {
            if (isDropdownOpen) {
                hideDropdown();
            } else {
                showDropdown();
            }
        }
    });

    // Close on click outside
    document.addEventListener('click', (event) => {
        if (isDropdownOpen && 
            !servicesButton.contains(event.target) && 
            !servicesDropdown.contains(event.target)) {
            hideDropdown();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isDropdownOpen) {
            hideDropdown();
        }
    });

    // Close dropdown on resize to mobile
    window.addEventListener('resize', () => {
        if (window.innerWidth < 1280 && isDropdownOpen) {
            hideDropdown();
        }
    });

    // Mobile menu functionality
    if (typeof mobileMenuButton.__mmcFallbackToggle__ === 'function') {
        mobileMenuButton.removeEventListener('click', mobileMenuButton.__mmcFallbackToggle__);
        mobileMenuButton.__mmcFallbackToggle__ = null;
    }

    if (typeof mobileMenu.__mmcFallbackClose__ === 'function') {
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.removeEventListener('click', mobileMenu.__mmcFallbackClose__);
        });
        mobileMenu.__mmcFallbackClose__ = null;
    }

    if (typeof mobileMenu.__mmcFallbackDocumentHandler__ === 'function') {
        document.removeEventListener('click', mobileMenu.__mmcFallbackDocumentHandler__);
        mobileMenu.__mmcFallbackDocumentHandler__ = null;
    }

    if (typeof mobileMenu.__mmcFallbackResizeHandler__ === 'function') {
        window.removeEventListener('resize', mobileMenu.__mmcFallbackResizeHandler__);
        window.removeEventListener('orientationchange', mobileMenu.__mmcFallbackResizeHandler__);
        mobileMenu.__mmcFallbackResizeHandler__ = null;
    }

    mobileMenuButton.dataset.mmcMobileMenuEnhanced = 'true';
    mobileMenuButton.setAttribute('aria-controls', 'mobile-menu');
    mobileMenuButton.setAttribute('aria-expanded', 'false');
    mobileMenuButton.classList.remove('active');
    mobileMenu.classList.add('hidden');
    mobileMenu.classList.remove('is-open');

    const iconPath = mobileMenuButton.querySelector('svg path');

    const updateMenuVisualState = (isOpen) => {
        mobileMenuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        document.body.classList.toggle('mobile-menu-open', isOpen);
        mobileMenuButton.classList.toggle('active', isOpen);
        mobileMenu.classList.toggle('is-open', isOpen);

        if (iconPath) {
            iconPath.setAttribute(
                'd',
                isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'
            );
        }
    };

    const openMobileMenu = () => {
        mobileMenu.classList.remove('hidden');
        updateMenuVisualState(true);
    };

    const closeMobileMenu = () => {
        mobileMenu.classList.add('hidden');
        updateMenuVisualState(false);
    };

    mobileMenuButton.addEventListener('click', () => {
        if (mobileMenu.classList.contains('hidden')) {
            openMobileMenu();
        } else {
            closeMobileMenu();
        }
    });

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });

    document.addEventListener('click', (event) => {
        if (mobileMenu.classList.contains('hidden')) {
            return;
        }

        if (mobileMenu.contains(event.target) || mobileMenuButton.contains(event.target)) {
            return;
        }

        closeMobileMenu();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
            closeMobileMenu();
        }
    });

    const handleViewportChange = () => {
        if (window.innerWidth >= 1280 && !mobileMenu.classList.contains('hidden')) {
            closeMobileMenu();
        }
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    // Header shadow on scroll
    function updateHeaderShadow() {
        if (window.pageYOffset > 100) {
            header.classList.add('shadow-lg');
        } else {
            header.classList.remove('shadow-lg');
        }
    }

    window.addEventListener('scroll', updateHeaderShadow);
    updateHeaderShadow();
}

// Initialize everything on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS animations
    if (typeof AOS !== 'undefined') {
        setTimeout(() => {
            AOS.init({
                duration: 800,
                once: true,
                offset: 100,
                easing: 'ease-in-out'
            });
        }, 150);
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (event) {
            const href = this.getAttribute('href');
            if (href && href !== '#' && href.length > 1) {
                const target = document.querySelector(href);
                if (target) {
                    event.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Initialize header enhancements
    initHeaderEnhancements();

    // Start slideshow if function exists
    if (typeof showSlides === 'function') {
        showSlides();
    }
});

// Re-initialize on header load
document.addEventListener('mmc:header-ready', initHeaderEnhancements);

// The shared header-footer loader owns contact modal setup so it only binds once.


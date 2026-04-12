(() => {
    try {
        function sanitizeInjectedPartial(html) {
            return String(html || '')
                .replace(/<!--\s*Code injected by live-server\s*-->[\s\S]*?<\/script>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?IsThisFirstTime_Log_From_LiveServer[\s\S]*?<\/script>/gi, '');
        }

        const placeholder = document.getElementById('header-placeholder');
        if (
            !placeholder
            || (
                placeholder.dataset.mmcHeaderInserted === 'true'
                && placeholder.querySelector('#siteEmergencyBanner')
            )
        ) {
            return;
        }

        // Use explicit base path if provided, otherwise detect from stylesheet paths
        const explicitBase = placeholder.dataset.mmcHeaderBasePath;
        let basePath;
        if (typeof explicitBase === 'string' && explicitBase !== '') {
            basePath = explicitBase;
        } else {
            const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
            let isSubpage = false;
            for (let i = 0; i < stylesheets.length; i++) {
                const href = stylesheets[i].getAttribute('href') || '';
                if (href.startsWith('../')) { isSubpage = true; break; }
            }
            basePath = isSubpage ? '../' : '';
        }

        const request = new XMLHttpRequest();
        request.open('GET', basePath + 'includes/header.html', false);
        request.send(null);

        if (request.status >= 200 && request.status < 300) {
            placeholder.innerHTML = sanitizeInjectedPartial(request.responseText);
            placeholder.dataset.mmcHeaderInserted = 'true';
            placeholder.dataset.mmcHeaderBasePath = basePath;

            const logoImg = placeholder.querySelector('.logo-img');
            if (logoImg) {
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
        } else {
            console.error('Critical header load failed with status:', request.status);
        }
        // Safety-net: if the async header-footer-loader fails to inject the
        // banner script (e.g. due to a cached/broken JS file), ensure the
        // banner module is loaded after a short grace period.
        setTimeout(function () {
            if (!document.querySelector('script[data-mmc-site-banner-script="true"]')) {
                var s = document.createElement('script');
                s.type = 'module';
                s.src = basePath + 'js/firebase-site-banner.js?v=2026041201';
                s.dataset.mmcSiteBannerScript = 'true';
                s.onerror = function () {
                    console.warn('MMC banner safety-net script also failed to load');
                };
                document.body.appendChild(s);
            }
        }, 4000);
    } catch (error) {
        console.error('Critical header load error:', error);
    }
})();

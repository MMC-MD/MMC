(() => {
    try {
        const placeholder = document.getElementById('header-placeholder');
        if (!placeholder || placeholder.dataset.mmcHeaderInserted === 'true') {
            return;
        }

        const pathName = window.location.pathname;
        const pathSegments = pathName.split('/').filter(Boolean);
        const currentFile = pathSegments[pathSegments.length - 1] || 'index.html';

        const isHomePage = currentFile === 'index.html';
        const isInPagesDirectory = pathSegments.includes('pages');
        const basePath = isHomePage ? '' : (isInPagesDirectory ? '../' : '');

        const request = new XMLHttpRequest();
        request.open('GET', basePath + 'includes/header.html', false);
        request.send(null);

        if (request.status >= 200 && request.status < 300) {
            placeholder.innerHTML = request.responseText;
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
    } catch (error) {
        console.error('Critical header load error:', error);
    }
})();

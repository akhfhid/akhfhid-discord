document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar-container');
    const mainContent = document.querySelector('.main-content');
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    const desktopNavItems = document.querySelectorAll('.main-nav .nav-link');
    const contentSections = document.querySelectorAll('.page');
    const hamburger = document.getElementById('hamburger-menu');
    const mobileMenu = document.getElementById('mobile-menu');

    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
                mobileMenu.classList.remove('active');
                hamburger.classList.remove('active');
            }
        });
    }

    // Function to switch content sections
    const switchSection = (targetId) => {
        contentSections.forEach(section => {
            if (section.id === targetId) {
                section.style.display = 'block';
                // Scroll to top of content wrapper
                const wrapper = document.querySelector('.content-wrapper');
                if (wrapper) wrapper.scrollTop = 0;
            } else {
                section.style.display = 'none';
            }
        });
    };

    // Desktop Navigation Handler
    desktopNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            if (!target) return;

            desktopNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            switchSection(target);
        });
    });

    // Bottom Navigation Handler (Mobile)
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;

            // Update active state
            bottomNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            if (target === 'home') {
                // Show Sidebar (Home), Hide Content
                if (window.innerWidth <= 1024) {
                    sidebar.style.display = 'flex';
                    mainContent.style.display = 'none';
                }
            } else {
                // Hide Sidebar, Show Content
                if (window.innerWidth <= 1024) {
                    sidebar.style.display = 'none';
                    mainContent.style.display = 'flex';
                }
                switchSection(target);
            }
        });
    });

    // Initialize View based on screen size
    const initView = () => {
        if (window.innerWidth > 1024) {
            // Desktop: Show everything
            sidebar.style.display = 'block';
            mainContent.style.display = 'flex';
            sidebar.style.removeProperty('display');
            mainContent.style.removeProperty('display');

            // Show active section based on desktop nav
            const activeDesktop = document.querySelector('.desktop-nav .nav-item.active');
            if (activeDesktop) {
                switchSection(activeDesktop.dataset.target);
            } else {
                // Default to dashboard
                switchSection('dashboard');
            }
        } else {
            // Mobile: Default to Home
            const activeNav = document.querySelector('.bottom-nav-item.active');
            if (activeNav && activeNav.dataset.target !== 'home') {
                sidebar.style.display = 'none';
                mainContent.style.display = 'flex';
                switchSection(activeNav.dataset.target);
            } else {
                sidebar.style.display = 'flex';
                mainContent.style.display = 'none';
            }
        }
    };

    initView();
    window.addEventListener('resize', initView);
});

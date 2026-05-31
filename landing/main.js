// Mobile Menu Toggle
const mobileBtn = document.querySelector('.nav-mobile-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.background = 'var(--glass-bg)';
        navLinks.style.backdropFilter = 'blur(20px)';
        navLinks.style.padding = '2rem';
        navLinks.style.borderBottom = '1px solid var(--glass-border)';
    });
}

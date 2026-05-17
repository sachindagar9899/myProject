document.addEventListener('DOMContentLoaded', () => {
    // 1. Typing Effect
    const typingText = document.querySelector('.typing-text');
    const words = ['Interactive Experiences.', 'Modern Web Apps.', 'Futuristic UIs.', 'Digital Products.'];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isTyping = false; // Prevent multiple instances

    function typeEffect() {
        if (!typingText) return;
        const currentWord = words[wordIndex];
        
        if (isDeleting) {
            typingText.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typingText.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
        }

        let typeSpeed = isDeleting ? 50 : 150;

        if (!isDeleting && charIndex === currentWord.length) {
            typeSpeed = 2000; // Pause at end
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typeSpeed = 500; // Pause before new word
        }

        setTimeout(typeEffect, typeSpeed);
    }
    
    // Start typing
    if (typingText) {
        setTimeout(typeEffect, 1000);
    }

    // 2. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.add('scrolled'); // keep transparent on top? No wait, scrolled is frosted
            if(window.scrollY === 0) navbar.classList.remove('scrolled');
        }
    });

    // 3. Scroll Reveal Animation
    const sections = document.querySelectorAll('.section-fade');
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

    // 4. Mobile Menu Toggle (Basic functionality structure)
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = 'var(--bg-secondary)';
            navLinks.style.backdropFilter = 'blur(12px)';
            navLinks.style.padding = '20px 0';
            // just basic hardcoded style for toggle example
        });
    }
});

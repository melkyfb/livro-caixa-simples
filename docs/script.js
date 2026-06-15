document.addEventListener('DOMContentLoaded', () => {
    // --- Carousel Logic ---
    const track = document.getElementById('carousel-track');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const dotsContainer = document.getElementById('carousel-dots');
    const dots = dotsContainer.querySelectorAll('button');
    
    let currentIndex = 0;
    const totalSlides = dots.length; // usually 3

    function updateCarousel() {
        // Move track
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        // Update dots
        dots.forEach((dot, index) => {
            if(index === currentIndex) {
                dot.classList.remove('bg-slate-600', 'w-2');
                dot.classList.add('bg-emerald-500', 'w-6');
            } else {
                dot.classList.remove('bg-emerald-500', 'w-6');
                dot.classList.add('bg-slate-600', 'w-2');
            }
        });
    }

    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateCarousel();
    });

    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateCarousel();
    });

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentIndex = index;
            updateCarousel();
        });
    });

    // Auto play carousel
    setInterval(() => {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateCarousel();
    }, 5000);


    // --- GitHub API fetching for latest release ---
    const downloadBtn = document.getElementById('download-btn');
    
    // Fallback URL just in case API fails
    const fallbackUrl = 'https://github.com/melkyfb/livro-caixa-simples/releases/latest';

    fetch('https://api.github.com/repos/melkyfb/livro-caixa-simples/releases/latest')
        .then(response => response.json())
        .then(data => {
            if (data && data.assets && data.assets.length > 0) {
                // Find the windows installer / exe
                const exeAsset = data.assets.find(a => a.name.endsWith('.exe') || a.name.endsWith('setup.exe'));
                if (exeAsset) {
                    downloadBtn.href = exeAsset.browser_download_url;
                } else {
                    downloadBtn.href = data.html_url; // Direct link to release page if no exe found
                }
            }
        })
        .catch(err => {
            console.error('Failed to fetch latest release', err);
            downloadBtn.href = fallbackUrl;
        });
});

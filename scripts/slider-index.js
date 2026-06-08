    let slideActual = 0;
    const slides = document.querySelectorAll('.carousel-slide');
    const dots   = document.querySelectorAll('#carousel-dots span');
    let autoplayInterval = iniciarAutoplay();

    function mostrarSlide(n) {
      slides[slideActual].classList.remove('active');
      dots[slideActual].classList.remove('active');
      slideActual = (n + slides.length) % slides.length;
      slides[slideActual].classList.add('active');
      dots[slideActual].classList.add('active');
    }
    function moverCarousel(dir) {
      clearInterval(autoplayInterval);
      mostrarSlide(slideActual + dir);
      autoplayInterval = iniciarAutoplay();
    }
    function irASlide(n) {
      clearInterval(autoplayInterval);
      mostrarSlide(n);
      autoplayInterval = iniciarAutoplay();
    }
    function iniciarAutoplay() {
      return setInterval(() => mostrarSlide(slideActual + 1), 5000);
    }

   

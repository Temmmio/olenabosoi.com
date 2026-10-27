// Osmo resource, copied verbatim from Osmo Supply (Button 038).
function initButton038() {
  const buttons = document.querySelectorAll('[data-button-038]');
  if (buttons.length === 0) return;

  buttons.forEach((element) => {
    const textElement = element.querySelector('[data-button-038-text]');
    const widthHover = Number(element.getAttribute('data-button-038-width-hover')) || 0;
    const heightHover = Number(element.getAttribute('data-button-038-height-hover')) || 0;
    if (!textElement) return;

    const setScale = (x, y) => {
      element.style.setProperty('--button-038-scale-x', x);
      element.style.setProperty('--button-038-scale-y', y);
    };

    const updateScale = () => {
      const currentWidth = element.offsetWidth;
      const currentHeight = element.offsetHeight;
      const scaleX = (currentWidth + widthHover) / currentWidth;
      const scaleY = (currentHeight + heightHover) / currentHeight;
      setScale(scaleX, scaleY);
    };

    updateScale();
    const text = textElement.textContent;
    textElement.innerHTML = '';

    [...text].forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.setProperty('--index', index);

      if (char === ' ') {
        span.style.whiteSpace = 'pre';
      }

      textElement.appendChild(span);
    });
  });
}

// Initialize Button 038
document.addEventListener('DOMContentLoaded', () => {
  document.fonts.ready.then(function () {
    initButton038();
  });
});

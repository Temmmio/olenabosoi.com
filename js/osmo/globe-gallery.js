// Osmo resource from the Osmo library (Globe Gallery).
// Six site changes, marked below: fewer rows and columns, square cards, it is more sensitive to scrolling and reacts to scroll speed as quickly as the
// Wavy Marquee (jumps up at once, settles in about half a second), it turns the
// other way after scrolling up, and it can be dragged sideways, with a short
// glide after release.
function initGlobeGallery() {
  document.querySelectorAll("[data-globe-gallery-init]").forEach((root) => {
    const list = root.querySelector("[data-globe-gallery-list]");
    const items = [...root.querySelectorAll("[data-globe-gallery-item]")];
    if (!list || !items.length) return;

    // Site change: fewer rows (Osmo: 7), so the cards are larger, and fewer
    // columns (Osmo: 18), so the square cards (below) leave even gaps.
    const rows = 5;
    const columns = 15;
    const latitude = 58; // degrees the rows reach above and below the middle, 90 touches the poles
    const staggerRows = true; // shifts every other row by half a card
    const taper = true; // cards narrow towards the top and bottom, false gives every card the same size
    const tilt = 0; // degrees, positive shows more of the top, negative tilts it to show the bottom
    const cameraDistance = 4; // lower gives stronger 3Dfeel
    const idleSpeed = 8; // degrees per second
    const direction = "left"; // "left" | "right"
    // Site change: twice as sensitive to scrolling (Osmo: 0.05 and 80).
    const scrollBoost = 0.1; // extra degrees per second for every px per second scrolled
    const maxBoost = 160; // degrees per second
    // Site change: quicker in and out (Osmo: 4 and 1.2), like the Wavy Marquee.
    const boostIn = 40; // how quickly scrolling speeds the globe up, higher is quicker
    const boostOut = 6; // how quickly it settles back to idle, higher is quicker
    // Site change: dragging. The glide after release fades at this rate.
    const dragGlideOut = 3;
    const edgeOpacity = 0.2; // at the edge of the globe
    const fadeZone = 0.35; // share of the front used to fade towards the edge, 0 to 1
    const backOpacity = 0.1; // at the very back, 0 hides the back of the globe

    const toRadians = Math.PI / 180;
    const band = latitude * toRadians;
    const rowStep = (2 * band) / rows;
    const columnStep = (2 * Math.PI) / columns;
    const rowLatitudes = Array.from({ length: rows }, (_, row) => band - rowStep * (row + 0.5));
    const tiltAngle = tilt * toRadians;
    const sinTilt = Math.sin(-tiltAngle);
    const cosTilt = Math.cos(-tiltAngle);
    const spinDirection = direction === "right" ? 1 : -1;
    let cards = [];
    let radius = 0;
    let halfHeight = 0;
    let spin = 0;
    let boost = 0;
    let scrollDistance = 0;
    let lastScroll = window.scrollY;
    // Site change: the spin follows the last scroll direction (down: the set
    // direction, up: the other way), and keeps it until the next scroll.
    let scrollTurn = 1;
    let motionAllowed = true;
    let inView = true;
    // Site change: drag state. dragVelocity is in radians per second.
    let dragging = false;
    let dragX = 0;
    let dragTime = 0;
    let dragVelocity = 0;

    function distribute() {
      let seed = 2024;
      const random = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
      const shuffled = () => {
        const deck = [...items.keys()];
        for (let index = deck.length - 1; index > 0; index--) {
          const swap = Math.floor(random() * (index + 1));
          [deck[index], deck[swap]] = [deck[swap], deck[index]];
        }
        return deck;
      };
      const order = [];
      const deck = [];

      for (let slot = 0; slot < rows * columns; slot++) {
        const row = Math.floor(slot / columns);
        const column = slot % columns;
        const neighbours = new Set();
        if (column > 0) neighbours.add(order[slot - 1]);
        if (column === columns - 1) neighbours.add(order[slot - column]);
        if (row > 0) {
          [-1, 0, 1].forEach((shift) => {
            neighbours.add(order[(row - 1) * columns + ((column + shift + columns) % columns)]);
          });
        }
        let pick = deck.findIndex((index) => !neighbours.has(index));
        if (pick < 0) {
          deck.push(...shuffled());
          pick = deck.findIndex((index) => !neighbours.has(index));
        }
        order.push(deck.splice(Math.max(pick, 0), 1)[0]);
      }
      return order;
    }

    function facing(normalZ) {
      return (cameraDistance * normalZ - 1) / Math.sqrt(1 + cameraDistance ** 2 - 2 * cameraDistance * normalZ);
    }

    function ease(value) {
      const progress = Math.min(Math.max(value / Math.max(fadeZone, 0.001), 0), 1);
      return progress * progress * (3 - 2 * progress);
    }

    function build() {
      const placed = new Set();
      cards = distribute().map((index, slot) => {
        const item = items[index];
        let element = item;
        if (placed.has(item)) {
          element = item.cloneNode(true);
          element.setAttribute("aria-hidden", "true");
          element.inert = true;
          list.appendChild(element);
        }
        placed.add(item);
        const row = Math.floor(slot / columns);
        const column = slot % columns;
        const cardLatitude = rowLatitudes[row];
        return {
          element,
          row,
          longitude: columnStep * (column + (staggerRows && row % 2 ? 0.5 : 0)),
          sinLatitude: Math.sin(cardLatitude),
          cosLatitude: Math.cos(cardLatitude),
          frontPeak: Math.max(facing(Math.cos(cardLatitude - tiltAngle)), 0.001),
          backPeak: Math.max(-facing(-Math.cos(cardLatitude + tiltAngle)), 0.001),
        };
      });
      items.forEach((item) => {
        if (!placed.has(item)) item.style.display = "none";
      });
    }

    function layout() {
      const listStyle = getComputedStyle(list);
      const columnGap = parseFloat(listStyle.columnGap) || 0;
      const rowGap = parseFloat(listStyle.rowGap) || 0;
      radius = list.offsetWidth / 2;
      halfHeight = Math.max(radius * Math.tan(rowStep / 2) - rowGap / 2, 0);
      const rowHalfWidths = rowLatitudes.map((rowLatitude) => {
        const widthLatitude = taper ? rowLatitude : rowLatitudes[0];
        return Math.max(radius * Math.cos(widthLatitude) * Math.tan(columnStep / 2) - columnGap / 2, 0);
      });
      list.style.perspective = `${radius * cameraDistance}px`;

      // Site change: square cards (Osmo: as wide and tall as the slot), the
      // slot's shorter side, so a card never overlaps its neighbours.
      cards.forEach((card) => {
        card.halfWidth = card.halfHeight = Math.min(rowHalfWidths[card.row], halfHeight);
        card.element.style.width = `${card.halfWidth * 2}px`;
        card.element.style.height = `${card.halfHeight * 2}px`;
      });
    }

    function render() {
      cards.forEach((card) => {
        const { element, sinLatitude, cosLatitude } = card;
        const theta = card.longitude + spin;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const normalX = sinTheta * cosLatitude;
        const normalY = -cosTilt * sinLatitude - sinTilt * cosTheta * cosLatitude;
        const normalZ = cosTilt * cosTheta * cosLatitude - sinTilt * sinLatitude;
        const cardFacing = facing(normalZ);
        const opacity = cardFacing < 0
          ? edgeOpacity + (backOpacity - edgeOpacity) * ease(-cardFacing / card.backPeak)
          : edgeOpacity + (1 - edgeOpacity) * ease(cardFacing / card.frontPeak);
        const visibility = opacity > 0 ? "visible" : "hidden";
        const zIndex = Math.round((normalZ + 1) * 1000);

        if (card.visibility !== visibility) {
          element.style.visibility = visibility;
          card.visibility = visibility;
        }
        if (opacity <= 0) return;
        if (card.zIndex !== zIndex) {
          element.style.zIndex = zIndex;
          card.zIndex = zIndex;
        }
        element.style.opacity = opacity;
        element.style.transform = `matrix3d(${cosTheta},${sinTilt * sinTheta},${-cosTilt * sinTheta},0,${sinTheta * sinLatitude},${cosTilt * cosLatitude - sinTilt * cosTheta * sinLatitude},${sinTilt * cosLatitude + cosTilt * cosTheta * sinLatitude},0,${normalX},${normalY},${normalZ},0,${radius * normalX - card.halfWidth},${radius * normalY - card.halfHeight},${radius * normalZ},1)`;
      });
    }

    build();
    root.setAttribute("data-globe-gallery-status", "active");

    window.addEventListener("scroll", () => {
      const scrollY = window.scrollY;
      scrollDistance += Math.abs(scrollY - lastScroll);
      if (scrollY !== lastScroll) scrollTurn = scrollY > lastScroll ? 1 : -1; // Site change
      lastScroll = scrollY;
    }, { passive: true });

    new ResizeObserver(() => {
      layout();
      render();
    }).observe(list);

    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    }).observe(root);

    gsap.matchMedia().add("(prefers-reduced-motion: reduce)", () => {
      motionAllowed = false;
      return () => {
        motionAllowed = true;
      };
    });

    // Site change: drag sideways to turn the globe. Moving the pointer by the
    // globe's radius turns it by one radian, so the front cards follow the pointer.
    root.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      dragging = true;
      dragX = event.clientX;
      dragTime = event.timeStamp;
      dragVelocity = 0;
      root.setPointerCapture(event.pointerId);
      root.setAttribute("data-globe-gallery-dragging", "");
    });
    root.addEventListener("pointermove", (event) => {
      if (!dragging || !radius) return;
      const angle = (event.clientX - dragX) / radius;
      const elapsed = Math.max(event.timeStamp - dragTime, 1) / 1000;
      spin += angle;
      dragVelocity = angle / elapsed;
      dragX = event.clientX;
      dragTime = event.timeStamp;
      render();
    });
    const endDrag = (event) => {
      if (!dragging) return;
      dragging = false;
      // A pause before letting go means no glide.
      if (event.timeStamp - dragTime > 100) dragVelocity = 0;
      root.removeAttribute("data-globe-gallery-dragging");
    };
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);

    gsap.ticker.add((time, deltaTime) => {
      const seconds = Math.min(deltaTime, 100) / 1000;
      const scrollSpeed = scrollDistance / seconds;
      scrollDistance = 0;
      if (!motionAllowed || !inView) return;
      // Site change: the pointer turns the globe while dragging; after release
      // it glides on and fades back into the idle spin.
      if (dragging) return;
      spin += dragVelocity * seconds;
      dragVelocity *= Math.exp(-dragGlideOut * seconds);

      const target = Math.min(scrollSpeed * scrollBoost, maxBoost);
      const rate = target > boost ? boostIn : boostOut;
      boost += (target - boost) * (1 - Math.exp(-rate * seconds));
      spin += spinDirection * scrollTurn * (idleSpeed + boost) * seconds * toRadians; // Site change: scrollTurn
      render();
    });
  });
}

// Initialize Globe Gallery
document.addEventListener("DOMContentLoaded", () => {
  initGlobeGallery();
});

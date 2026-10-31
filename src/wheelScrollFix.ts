/**
 * Mouse-wheel fix for old PCs / mice.
 * Scrolls whatever scrollable area is under the mouse cursor,
 * without needing to click on it first.
 */

function isScrollable(el: HTMLElement, dy: number, dx: number): boolean {
  const style = window.getComputedStyle(el);
  if (dy !== 0) {
    const oy = style.overflowY;
    const canY = (oy === 'auto' || oy === 'scroll' || el === document.scrollingElement) &&
      el.scrollHeight > el.clientHeight + 1;
    if (canY) {
      if (dy < 0 && el.scrollTop > 0) return true;
      if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
    }
  }
  if (dx !== 0) {
    const ox = style.overflowX;
    const canX = (ox === 'auto' || ox === 'scroll' || el === document.scrollingElement) &&
      el.scrollWidth > el.clientWidth + 1;
    if (canX) {
      if (dx < 0 && el.scrollLeft > 0) return true;
      if (dx > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
    }
  }
  return false;
}

export function installWheelScrollFix() {
  window.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return; // keep Ctrl+wheel zoom

      // Convert line/page deltas to pixels
      let factor = 1;
      if (e.deltaMode === 1) factor = 40;
      else if (e.deltaMode === 2) factor = window.innerHeight;
      let dy = e.deltaY * factor;
      let dx = e.deltaX * factor;
      if (e.shiftKey && dx === 0) { dx = dy; dy = 0; }
      if (dy === 0 && dx === 0) return;

      // Element actually under the cursor (not the focused one)
      let el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      while (el && el !== document.body && el !== document.documentElement) {
        if (isScrollable(el, dy, dx)) break;
        el = el.parentElement;
      }
      const target = (el && el !== document.body && el !== document.documentElement)
        ? el
        : (document.scrollingElement as HTMLElement | null);
      if (!target) return;

      e.preventDefault();
      target.scrollBy({ top: dy, left: dx, behavior: 'auto' });
    },
    { passive: false, capture: true }
  );

  // Electron: make sure the window reacts to the wheel even if it isn't focused
  window.addEventListener('mouseenter', () => {
    if (!document.hasFocus()) window.focus();
  });
}

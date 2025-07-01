export const createRipple = (event: React.MouseEvent<HTMLElement>) => {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  const ripple = document.createElement("span");
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.08);
    transform: scale(0);
    animation: ripple 400ms cubic-bezier(0.4, 0, 0.2, 1);
    left: ${x}px;
    top: ${y}px;
    width: ${size}px;
    height: ${size}px;
    pointer-events: none;
    z-index: 1;
  `;

  button.style.position = "relative";
  button.style.overflow = "hidden";
  button.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 400);
};

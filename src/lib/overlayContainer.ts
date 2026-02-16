export function getOverlayContainer(): HTMLElement {
  const el = document.getElementById("overlay-root");
  return el ?? document.body;
}

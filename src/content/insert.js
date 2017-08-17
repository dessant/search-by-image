var clickTarget = {node: null, x: 0, y: 0};

function saveClickTarget(e) {
  clickTarget.x = e.pageX;
  clickTarget.y = e.pageY;
  clickTarget.node = e.target;
}

window.addEventListener('contextmenu', saveClickTarget, {
  capture: true,
  passive: true
});

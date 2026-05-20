/* ==========================================================================
   🌌 Space-Dust Canvas Particle Engine (Living Background - Reusable)
   ========================================================================== */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let mouse = { x: null, y: null };

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 0.6;
    this.speedX = Math.random() * 0.16 - 0.08;
    this.speedY = Math.random() * 0.16 - 0.08;
    this.opacity = Math.random() * 0.45 + 0.15;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

    // React to mouse proximity (subtle repulsion force)
    if (mouse.x && mouse.y) {
      let dx = mouse.x - this.x;
      let dy = mouse.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 130) {
        let force = (130 - distance) / 130;
        this.x -= dx * force * 0.025;
        this.y -= dy * force * 0.025;
      }
    }
  }
  draw() {
    ctx.fillStyle = `rgba(6, 182, 212, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  let numberOfParticles = Math.floor((canvas.width * canvas.height) / 18000);
  for (let i = 0; i < numberOfParticles; i++) {
    particles.push(new Particle());
  }
}
initParticles();

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animateParticles);
}
animateParticles();

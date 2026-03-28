import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  opacitySpeed: number;
  opacityDir: 1 | -1;
}

const PARTICLE_COUNT = 120;

function getAccentRGB(): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-accent-rgb')
    .trim();
  return raw || '124 58 237';
}

export const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = (): Particle => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.2 + 0.4,
      speedX: (Math.random() - 0.5) * 0.25,
      speedY: -(Math.random() * 0.3 + 0.08),
      opacity: Math.random() * 0.5 + 0.15,
      opacitySpeed: Math.random() * 0.004 + 0.001,
      opacityDir: Math.random() > 0.5 ? 1 : -1,
    });

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, spawn);

    const draw = () => {
      const rgb = getAccentRGB();
      const parts = rgb.split(' ');
      const r = parts[0], g = parts[1], b = parts[2];
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        p.opacity += p.opacitySpeed * p.opacityDir;
        if (p.opacity >= 0.65 || p.opacity <= 0.08) p.opacityDir *= -1;

        if (p.y < -5)  { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5)  p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;

        // Soft halo (very tight, subtle)
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        halo.addColorStop(0,   `rgba(${r},${g},${b},${p.opacity * 0.4})`);
        halo.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // Crisp dot core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(p.opacity * 1.8, 0.9)})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
};

export const BackgroundEffect: React.FC = () => (
  <>
    <ParticleCanvas />
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
      {/* Dot grid */}
      <div className="bg-grid absolute inset-0 opacity-[0.35]" />

      {/* Orb — top-center of main content */}
      <div className="orb-spot" style={{
        width: 600, height: 600,
        top: -160, left: '38%',
        background: 'radial-gradient(circle at center, var(--color-accent-30), transparent 70%)',
        filter: 'blur(80px)',
        animation: 'orb-drift-1 20s ease-in-out infinite alternate',
      }} />

      {/* Orb — bottom-right */}
      <div className="orb-spot" style={{
        width: 650, height: 650,
        bottom: -200, right: '-5%',
        background: 'radial-gradient(circle at center, var(--color-accent-25), transparent 70%)',
        filter: 'blur(85px)',
        animation: 'orb-drift-2 24s ease-in-out infinite alternate',
      }} />

      {/* Orb — bottom-left / sidebar */}
      <div className="orb-spot" style={{
        width: 450, height: 450,
        bottom: -80, left: '-5%',
        background: 'radial-gradient(circle at center, var(--color-accent-20), transparent 65%)',
        filter: 'blur(70px)',
        animation: 'orb-drift-3 18s ease-in-out infinite alternate',
      }} />

      {/* Top beam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--color-accent-40), transparent)' }} />

      {/* Noise grain */}
      <div className="noise absolute inset-0 opacity-[0.03]" />
    </div>
  </>
);

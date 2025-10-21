import { useEffect, useRef } from 'react';

export const ParticleWaves = ({ isTransitioning = false }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = [];
      const numWaves = 7;
      const particlesPerWave = 200;

      const colors = [
        'rgba(139, 92, 246, 0.3)', // primary purple
        'rgba(236, 72, 153, 0.3)', // secondary pink
        'rgba(59, 130, 246, 0.3)', // accent blue
        'rgba(168, 85, 247, 0.25)', // variant purple
        'rgba(244, 114, 182, 0.25)', // variant pink
        'rgba(96, 165, 250, 0.25)', // variant blue
        'rgba(192, 132, 252, 0.2)', // light purple
      ];

      for (let w = 0; w < numWaves; w++) {
        const baseY = (canvas.height / (numWaves + 1)) * (w + 1);
        const waveSpeed = 0.3 + Math.random() * 0.5;
        const waveAmplitude = 40 + Math.random() * 60;
        const waveFrequency = 0.002 + Math.random() * 0.003;
        const color = colors[w % colors.length];

        for (let i = 0; i < particlesPerWave; i++) {
          particlesRef.current.push({
            x: (canvas.width / particlesPerWave) * i + Math.random() * 20,
            y: baseY,
            baseY: baseY,
            speed: waveSpeed,
            amplitude: waveAmplitude,
            frequency: waveFrequency,
            phase: Math.random() * Math.PI * 2,
            color: color,
            size: 1 + Math.random() * 1.5,
          });
        }
      }
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.speed;

        // Wrap around
        if (particle.x > canvas.width + 50) {
          particle.x = -50;
        }

        // Calculate wave motion
        const time = Date.now() * 0.001;
        particle.y = particle.baseY +
          Math.sin(particle.x * particle.frequency + particle.phase + time) * particle.amplitude;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();

        // Draw connections to nearby particles (creates mesh effect)
        particlesRef.current.forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 80 && Math.abs(particle.baseY - otherParticle.baseY) < 10) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = particle.color.replace('0.3', '0.05').replace('0.25', '0.03').replace('0.2', '0.02');
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
        isTransitioning ? 'scale-150 opacity-80' : ''
      }`}
      style={{ filter: 'blur(1px)' }}
    />
  );
};

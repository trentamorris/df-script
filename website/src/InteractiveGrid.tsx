import React, { useEffect, useRef } from "react";

export default function InteractiveGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Grid spacing details
    const spacing = 35; 
    const dots: Array<{
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      vx: number;
      vy: number;
    }> = [];

    // Initialize dots in a grid
    const initGrid = () => {
      dots.length = 0;
      const cols = Math.floor(width / spacing) + 2;
      const rows = Math.floor(height / spacing) + 2;
      
      const startX = (width - (cols - 1) * spacing) / 2;
      const startY = (height - (rows - 1) * spacing) / 2;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = startX + c * spacing;
          const y = startY + r * spacing;
          dots.push({
            x,
            y,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
          });
        }
      }
    };

    initGrid();

    // Mouse coordinates (defaulted to off-screen coordinate)
    const mouse = { x: -1000, y: -1000, active: false };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    // Reset mouse coordinates to far off-screen to clear repulsion forces
    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    // Listen to window focus loss
    const handleBlur = () => {
      handleMouseLeave();
    };

    // Listen to mouse moving out of the document viewport edge
    const handleMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget || (e.relatedTarget as HTMLElement).nodeName === "HTML") {
        handleMouseLeave();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseout", handleMouseOut);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initGrid();
    };
    window.addEventListener("resize", handleResize);

    // Physics parameters matching premium repulsion kinetics
    const forceRadius = 110; 
    const ease = 0.08;      
    const friction = 0.85;   
    const repelStrength = 0.35; 

    // Animation frame tick
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        // Delta vector from mouse to particle
        let dx = dot.x - mouse.x;
        let dy = dot.y - mouse.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        let fx = 0;
        let fy = 0;

        // Apply repulsion only if mouse is active and near
        if (mouse.active && dist < forceRadius) {
          const force = (forceRadius - dist) / forceRadius; // 0 to 1
          const angle = Math.atan2(dy, dx);
          fx = Math.cos(angle) * force * repelStrength * 10;
          fy = Math.sin(angle) * force * repelStrength * 10;
        }

        // Elastic return vector force pulling dot back to anchor coordinate
        const rx = (dot.baseX - dot.x) * ease;
        const ry = (dot.baseY - dot.y) * ease;

        // Apply forces, damp with friction drag
        dot.vx = (dot.vx + fx + rx) * friction;
        dot.vy = (dot.vy + fy + ry) * friction;

        dot.x += dot.vx;
        dot.y += dot.vy;

        // Visual logic: Solid white monochromatic particles
        // Faintly visible when sedentary, glowing and expanding slightly when hovered
        let opacity = 0.18; 
        let size = 1.0;     
        let fillStyle = "#ffffff";

        if (mouse.active && dist < forceRadius) {
          const influence = (forceRadius - dist) / forceRadius;
          opacity = 0.18 + influence * 0.42; // scales up to 0.60 opacity near the cursor
          size = 1.0 + influence * 0.8;       // scales up to 1.8px
        }

        ctx.fillStyle = fillStyle;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const ramps = ["#378ADD","#1D9E75","#D85A30","#D4537E","#7F77DD"];

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const nodes = Array.from({ length: 46 }, () => ({
      x: Math.random() * canvas!.width,
      y: Math.random() * canvas!.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      color: ramps[Math.floor(Math.random() * ramps.length)],
      r: 3 + Math.random() * 4,
    }));

    let animId: number;
    function step() {
      ctx.fillStyle = "#050b14";
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas!.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas!.height) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 130) {
            ctx.strokeStyle = a.color;
            ctx.globalAlpha = (1 - dist / 130) * 0.35;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 0.85;
      for (const n of nodes) {
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(step);
    }
    step();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", borderBottom: "0.5px solid #e5e5e5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 500, border: "0.5px solid #e5e5e5" }}>FW</div>
          <div>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>François Wagner</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>Formation professionnelle</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "18px", fontSize: "13px" }}>
          <a href="/formations" style={{ color: "#666", textDecoration: "none" }}>Formations</a>
          <a href="#" style={{ color: "#666", textDecoration: "none" }}>À propos</a>
          <a href="#" style={{ color: "#666", textDecoration: "none" }}>Contact</a>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <a href="/connexion" style={{ fontSize: "13px", padding: "6px 14px", border: "1px solid #e5e5e5", borderRadius: "6px", textDecoration: "none", color: "#000" }}>Se connecter</a>
          <a href="/creer-un-compte" style={{ fontSize: "13px", padding: "6px 14px", background: "#000", color: "#fff", borderRadius: "6px", textDecoration: "none" }}>Créer un compte</a>
        </div>
      </nav>

      <div style={{ position: "relative", width: "100%", height: "380px", overflow: "hidden", background: "#050b14" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
        <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 2rem", maxWidth: "560px" }}>
          <span style={{ display: "inline-block", fontSize: "11px", color: "#bcd8ff", background: "rgba(55,138,221,0.18)", padding: "4px 10px", borderRadius: "6px", marginBottom: "14px", width: "fit-content" }}>Formateur indépendant</span>
          <h1 style={{ fontSize: "30px", fontWeight: 500, lineHeight: 1.25, margin: "0 0 8px", color: "#f4f7fb" }}>
            Des formations concrètes,<br />
            <span style={{ fontStyle: "italic", color: "#9fb8d9" }}>pensées pour le terrain.</span>
          </h1>
          <p style={{ fontSize: "14px", color: "#a9bdd6", lineHeight: 1.7, margin: "0 0 20px" }}>
            J'accompagne les organismes de formation dans le développement des compétences de leurs apprenants.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <a href="/formations" style={{ background: "#f4f7fb", color: "#0a1018", padding: "9px 16px", fontSize: "13px", borderRadius: "6px", textDecoration: "none" }}>Découvrir les formations →</a>
            <a href="/creer-un-compte" style={{ padding: "9px 16px", fontSize: "13px", background: "transparent", color: "#f4f7fb", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: "6px", textDecoration: "none" }}>Créer un compte organisme</a>
          </div>
        </div>
      </div>

      <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 500, margin: "0 0 14px" }}>Nos formations phares</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {["Habilitation électrique", "Sécurité électrique", "Prévention des risques", "Formation sur-mesure"].map((f) => (
            <div key={f} style={{ border: "0.5px solid #e5e5e5", borderRadius: "8px", padding: "1rem" }}>
              <p style={{ fontSize: "13px", fontWeight: 500, margin: "0 0 4px" }}>{f}</p>
              <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>Intra / Inter entreprise</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

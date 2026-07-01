export default function HomePage() {
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
        <div style={{ display: "flex", gap: "18px", fontSize: "13px", color: "#666" }}>
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
        <canvas id="neuralCanvas" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}></canvas>
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
            <a href="/formations" style={{ background: "#f4f7fb", color: "#0a1018", border: "none", padding: "9px 16px", fontSize: "13px", borderRadius: "6px", textDecoration: "none" }}>Découvrir les formations →</a>
            <a href="/creer-un-compte" style={{ padding: "9px 16px", fontSize: "13px", background: "transparent", color: "#f4f7fb", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: "6px", textDecoration: "none" }}>Créer un compte organisme</a>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var canvas = document.getElementById('neuralCanvas');
          if (!canvas) return;
          var ctx = canvas.getContext('2d');
          function resize(){
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
          }
          resize();
          window.addEventListener('resize', resize);
          var nodes = [];
          for(var i=0;i<20;i++){
            var arms=[];
            for(var a=0;a<5+Math.floor(Math.random()*3);a++){
              arms.push({angle:Math.random()*Math.PI*2,len:60+Math.random()*100,bend:(Math.random()-0.5)*1.2});
            }
            nodes.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,vx:(Math.random()-0.5)*0.06,vy:(Math.random()-0.5)*0.06,r:6+Math.random()*6,arms:arms,pulse:Math.random()*Math.PI*2});
          }
          var t=0;
          function step(){
            t++;
            ctx.fillStyle='#050b14';
            ctx.fillRect(0,0,canvas.width,canvas.height);
            for(var i=0;i<nodes.length;i++){
              var n=nodes[i];
              n.x+=n.vx; n.y+=n.vy;
              if(n.x<40||n.x>canvas.width-40) n.vx*=-1;
              if(n.y<40||n.y>canvas.height-40) n.vy*=-1;
            }
            for(var i=0;i<nodes.length;i++){
              for(var j=i+1;j<nodes.length;j++){
                var a=nodes[i],b=nodes[j];
                var dx=a.x-b.x,dy=a.y-b.y;
                var dist=Math.sqrt(dx*dx+dy*dy);
                if(dist<150){
                  var mx=(a.x+b.x)/2+Math.sin(t*0.012+i+j)*18;
                  var my=(a.y+b.y)/2+Math.cos(t*0.012+i+j)*18;
                  ctx.strokeStyle='#4f93e8';
                  ctx.globalAlpha=(1-dist/150)*0.3;
                  ctx.lineWidth=0.7;
                  ctx.beginPath();
                  ctx.moveTo(a.x,a.y);
                  ctx.quadraticCurveTo(mx,my,b.x,b.y);
                  ctx.stroke();
                }
              }
            }
            for(var i=0;i<nodes.length;i++){
              var n=nodes[i];
              ctx.globalAlpha=0.55;
              for(var s=0;s<n.arms.length;s++){
                var ang=n.arms[s].angle+Math.sin(t*0.01+s)*0.15;
                var len=n.r*(2.2+0.4*Math.sin(t*0.02+s*1.7));
                var mx2=n.x+Math.cos(ang)*len*0.6+Math.cos(ang+0.6)*3;
                var my2=n.y+Math.sin(ang)*len*0.6+Math.sin(ang+0.6)*3;
                ctx.strokeStyle='#4f93e8'; ctx.lineWidth=1;
                ctx.beginPath(); ctx.moveTo(n.x,n.y);
                ctx.quadraticCurveTo(mx2,my2,n.x+Math.cos(ang)*len,n.y+Math.sin(ang)*len);
                ctx.stroke();
              }
              var grad=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r*2.6);
              grad.addColorStop(0,'rgba(120,175,245,0.95)');
              grad.addColorStop(0.5,'rgba(60,120,210,0.45)');
              grad.addColorStop(1,'rgba(60,120,210,0)');
              ctx.fillStyle=grad; ctx.globalAlpha=1;
              ctx.beginPath(); ctx.arc(n.x,n.y,n.r*2.6,0,Math.PI*2); ctx.fill();
              ctx.fillStyle='#cfe2fb';
              ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
              var glow=0.7+0.3*Math.sin(t*0.04+n.pulse);
              var sg=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,9*glow);
              sg.addColorStop(0,'rgba(255,210,225,0.9)');
              sg.addColorStop(0.4,'rgba(220,90,140,0.55)');
              sg.addColorStop(1,'rgba(220,90,140,0)');
              ctx.fillStyle=sg;
              ctx.beginPath(); ctx.arc(n.x,n.y,9*glow,0,Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha=1;
            requestAnimationFrame(step);
          }
          step();
        })();
      `}} />

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

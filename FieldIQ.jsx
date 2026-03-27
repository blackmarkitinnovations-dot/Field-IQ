import { useState, useEffect, useRef, useMemo } from "react";

// ── Storage ───────────────────────────────────────────────────────────────────
const STORE_KEY = "fieldiq_v2";
const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch { return null; } };
const save  = d => localStorage.setItem(STORE_KEY, JSON.stringify(d));
const uid   = () => Math.random().toString(36).slice(2, 9);

const defaultState = () => ({
  players: [],
  gameInfo: { team: "", gameNumber: "", date: "", type: "" },
  plays: [],
});

// ── Snapshot encode/decode (for share link) ───────────────────────────────────
function encodeSnapshot(stats, gameInfo) {
  const snap = {
    g: gameInfo,
    p: stats.map(p => ({
      n: p.name, num: p.number, pos: p.positions,
      c: p.caught.length, m: p.missed.length, f: p.flag.length, s: p.score,
      isQb: p.isQb, comp: p.comp.length, inc: p.inc.length,
      thrown: p.thrown.length, compPct: p.compPct,
    })),
    ts: Date.now(),
  };
  try { return btoa(encodeURIComponent(JSON.stringify(snap))); } catch { return null; }
}
function decodeSnapshot(str) {
  try { return JSON.parse(decodeURIComponent(atob(str))); } catch { return null; }
}

// ── QR Code ───────────────────────────────────────────────────────────────────
function QRCode({ url }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=00e5ff&bgcolor=0f1923&data=${encodeURIComponent(url)}`;
  return (
    <div style={{ display:"flex",justifyContent:"center",margin:"8px 0 16px" }}>
      <div style={{ padding:10,background:"#0f1923",borderRadius:14,border:"1px solid #00e5ff33" }}>
        <img src={src} width={160} height={160} alt="QR Code" style={{ display:"block",borderRadius:6 }}/>
      </div>
    </div>
  );
}

// ── Read-only snapshot ────────────────────────────────────────────────────────
function ReadOnlyView({ snap }) {
  const { g, p: players, ts } = snap;
  const maxCatches = Math.max(1, ...players.map(p => p.c));
  const maxFlags   = Math.max(1, ...players.map(p => p.f));
  const ranked     = [...players].sort((a,b) => b.s - a.s);
  const sharedAt   = ts ? new Date(ts).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "";

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#080f17",minHeight:"100vh",color:"#fff",maxWidth:480,margin:"0 auto",paddingBottom:40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700;900&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
      `}</style>
      <div style={{ background:"linear-gradient(160deg,#0a1e35,#05111e)",padding:"24px 20px 18px",position:"relative",overflow:"hidden" }}>
        <svg style={{ position:"absolute",top:0,right:0,opacity:.05 }} width="200" height="100" viewBox="0 0 200 100">
          {[0,20,40,60,80,100,120,140,160,180,200].map(x=><line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#fff" strokeWidth=".5"/>)}
          <line x1="0" y1="50" x2="200" y2="50" stroke="#fff" strokeWidth="1"/>
        </svg>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <svg width="32" height="32" viewBox="0 0 36 36"><ellipse cx="18" cy="18" rx="14" ry="9" fill="#c97b3c"/><ellipse cx="18" cy="18" rx="14" ry="9" fill="none" stroke="#a0612c" strokeWidth="1.5"/><line x1="8" y1="18" x2="28" y2="18" stroke="#fff" strokeWidth="1.5"/><line x1="14" y1="13" x2="14" y2="23" stroke="#fff" strokeWidth="1.2"/><line x1="18" y1="11" x2="18" y2="25" stroke="#fff" strokeWidth="1.2"/><line x1="22" y1="13" x2="22" y2="23" stroke="#fff" strokeWidth="1.2"/></svg>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:4,lineHeight:1,background:"linear-gradient(90deg,#fff,#00e5ff 60%,#0090a8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>FieldIQ</div>
            <div style={{ fontSize:9,color:"#00e5ff99",letterSpacing:3,textTransform:"uppercase" }}>Stats Snapshot · Read Only</div>
          </div>
          {g.team && <div style={{ marginLeft:"auto",textAlign:"right" }}><div style={{ fontSize:13,color:"#00e5ff",fontWeight:700 }}>{g.team}</div>{g.gameNumber&&<div style={{ fontSize:10,color:"#666" }}>Game #{g.gameNumber}</div>}</div>}
        </div>
        <div style={{ display:"flex",gap:10,marginTop:12,flexWrap:"wrap",alignItems:"center" }}>
          {g.date&&<span style={{ fontSize:11,color:"#888" }}>{g.date}</span>}
          {g.type&&<span style={{ fontSize:10,background:"#ffffff11",color:"#888",borderRadius:20,padding:"2px 9px" }}>{g.type}</span>}
          <span style={{ fontSize:10,color:"#334",marginLeft:"auto" }}>Shared {sharedAt}</span>
        </div>
      </div>
      <div style={{ padding:"16px 14px",animation:"fadeIn .3s ease" }}>
        <div style={{ fontSize:11,color:"#888",letterSpacing:2,textTransform:"uppercase",marginBottom:10 }}>🏆 Player Rankings</div>
        <div style={{ fontSize:10,color:"#445",marginBottom:14 }}>Score = catches×2 + flag pulls</div>
        {ranked.map((p,i) => {
          const catchPct  = Math.round(p.c / maxCatches * 100);
          const flagPct   = Math.round(p.f / maxFlags * 100);
          const catchRate = (p.c+p.m)>0 ? Math.round(p.c/(p.c+p.m)*100) : 0;
          const rankColor = i===0?"#ffd700":i===1?"#c0c0c0":i===2?"#cd7f32":"#334";
          return (
            <div key={i} style={{ background:i===0?"linear-gradient(135deg,#112030,#0e1a2a)":"#111d29",borderRadius:13,marginBottom:7,border:i===0?"1px solid #00e5ff28":"1px solid #1a2636",padding:"12px 14px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:rankColor,minWidth:18,textAlign:"center" }}>{i+1}</div>
                <div style={{ background:"#00e5ff18",color:"#00e5ff",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,borderRadius:6,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{p.num}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:14 }}>{p.n}</div>
                  <div style={{ display:"flex",gap:3,marginTop:2 }}>
                    {p.pos.map(pos=><span key={pos} style={{ background:pos==="quarterback"?"#ff6b3522":"#00e5ff22",color:pos==="quarterback"?"#ff6b35":"#00e5ff",border:`1px solid ${pos==="quarterback"?"#ff6b3555":"#00e5ff55"}`,borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700,textTransform:"uppercase" }}>{pos==="quarterback"?"QB":"PL"}</span>)}
                  </div>
                </div>
                <div style={{ display:"flex",gap:6,alignItems:"center",flexShrink:0 }}>
                  <span style={{ fontSize:13,color:"#22c55e",fontWeight:700 }}>{p.c}C</span>
                  <span style={{ fontSize:10,color:"#334" }}>·</span>
                  <span style={{ fontSize:13,color:"#f59e0b",fontWeight:700 }}>{p.f}F</span>
                  {p.isQb&&p.thrown>0&&<><span style={{ fontSize:10,color:"#334" }}>·</span><span style={{ fontSize:13,color:"#ff6b35",fontWeight:700 }}>{p.compPct}%</span></>}
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:"#00e5ff",lineHeight:1 }}>{p.s}</div>
                  <div style={{ fontSize:8,color:"#445",textTransform:"uppercase",letterSpacing:.8 }}>IQ</div>
                </div>
              </div>
              <div style={{ display:"flex",gap:6,marginBottom:10 }}>
                {[{v:p.c,l:"Catches",col:"#22c55e"},{v:p.m,l:"Missed",col:"#ef4444"},{v:p.f,l:"Flag Pulls",col:"#f59e0b"}].map(s=>(
                  <div key={s.l} style={{ flex:1,background:"#0a1420",borderRadius:8,padding:"8px 4px",textAlign:"center",border:`1px solid ${s.col}33` }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:s.col,lineHeight:1 }}>{s.v}</div>
                    <div style={{ fontSize:9,color:"#667",textTransform:"uppercase",letterSpacing:.8,marginTop:1 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:"#0a1420",borderRadius:9,padding:"10px 10px 4px" }}>
                {[
                  {label:"Catches vs Best",pct:catchPct,color:"#22c55e",sub:`${p.c} · ${catchPct}%`},
                  {label:"Flag Pulls vs Best",pct:flagPct,color:"#f59e0b",sub:`${p.f} · ${flagPct}%`},
                  ...(p.isQb?[{label:"Pass Completion %",pct:p.compPct,color:"#ff6b35",sub:p.thrown>0?`${p.comp}/${p.thrown} · ${p.compPct}%`:"No attempts"}]:[]),
                  ...((p.c+p.m)>0?[{label:"Catch Rate",pct:catchRate,color:"#00e5ff",sub:`${catchRate}%`}]:[]),
                ].map(bar=>(
                  <div key={bar.label} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#888",marginBottom:3 }}>
                      <span style={{ textTransform:"uppercase",letterSpacing:.8 }}>{bar.label}</span>
                      <span style={{ color:bar.color,fontWeight:700 }}>{bar.sub}</span>
                    </div>
                    <div style={{ background:"#080f17",borderRadius:5,height:8,overflow:"hidden" }}>
                      <div style={{ height:"100%",borderRadius:5,background:`linear-gradient(90deg,${bar.color}88,${bar.color})`,width:`${Math.max(bar.pct,2)}%`,boxShadow:`0 0 6px ${bar.color}44` }}/>
                    </div>
                  </div>
                ))}
              </div>
              {p.isQb&&p.thrown>0&&(
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:9,color:"#ff6b3577",letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>As Quarterback</div>
                  <div style={{ display:"flex",gap:6 }}>
                    {[{v:p.comp,l:"Comp",col:"#22c55e"},{v:p.inc,l:"Inc",col:"#ef4444"},{v:p.thrown,l:"Att",col:"#ff6b35"}].map(s=>(
                      <div key={s.l} style={{ flex:1,background:"#0a1420",borderRadius:8,padding:"8px 4px",textAlign:"center",border:`1px solid ${s.col}33` }}>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:s.col,lineHeight:1 }}>{s.v}</div>
                        <div style={{ fontSize:9,color:"#667",textTransform:"uppercase",letterSpacing:.8,marginTop:1 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div style={{ textAlign:"center",marginTop:24,padding:"16px",background:"#0f1923",borderRadius:12,border:"1px solid #1a2636" }}>
          <div style={{ fontSize:11,color:"#556" }}>Powered by</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:3,color:"#00e5ff66" }}>FieldIQ</div>
        </div>
      </div>
    </div>
  );
}

// ── Share sheet ───────────────────────────────────────────────────────────────
function ShareSheet({ url, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(url).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); }); };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#0f1923",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,padding:"24px 20px 40px",borderTop:"2px solid #00e5ff55",animation:"slideUp .25s ease" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#fff" }}>Share Stats</span>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#aaa",fontSize:22,cursor:"pointer" }}>✕</button>
        </div>
        <p style={{ fontSize:12,color:"#888",marginBottom:16,lineHeight:1.5 }}>Anyone with this link sees a <span style={{ color:"#00e5ff" }}>read-only snapshot</span> — no editing, no setup access.</p>
        <QRCode url={url} />
        <div style={{ display:"flex",gap:8,alignItems:"center",background:"#1a2636",borderRadius:10,padding:"10px 14px",marginBottom:14 }}>
          <span style={{ flex:1,fontSize:12,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{url}</span>
          <button onClick={copy} style={{ background:copied?"#22c55e22":"#00e5ff22",border:`1px solid ${copied?"#22c55e":"#00e5ff"}55`,color:copied?"#22c55e":"#00e5ff",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0 }}>
            {copied?"✓ Copied":"Copy Link"}
          </button>
        </div>
        {navigator.share && <button onClick={()=>navigator.share({title:"FieldIQ Stats",url})} style={{ width:"100%",background:"linear-gradient(135deg,#00e5ff,#0090a8)",border:"none",color:"#fff",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Share via…</button>}
      </div>
    </div>
  );
}

// ── Reusable components ───────────────────────────────────────────────────────
function Badge({ children, color="#00e5ff" }) {
  return <span style={{ background:color+"22",color,border:`1px solid ${color}55`,borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase" }}>{children}</span>;
}
function Sheet({ title, onClose, children, accent="#00e5ff" }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#0f1923",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,padding:"24px 20px 40px",borderTop:`2px solid ${accent}55`,animation:"slideUp .25s ease",maxHeight:"85vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#fff" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#aaa",fontSize:22,cursor:"pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function FInput({ label, ...props }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label&&<label style={{ display:"block",fontSize:11,letterSpacing:1,color:"#888",marginBottom:5,textTransform:"uppercase" }}>{label}</label>}
      <input {...props} style={{ width:"100%",background:"#1a2636",border:"1px solid #2a3a4a",borderRadius:10,color:"#fff",padding:"12px 14px",fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"inherit",...props.style }}/>
    </div>
  );
}
function Btn({ children, onClick, variant="primary", full, style:s }) {
  const bg = variant==="primary"?"linear-gradient(135deg,#00e5ff,#0090a8)":variant==="ghost"?"transparent":variant==="danger"?"#c0392b22":"#1e2d3d";
  const border = variant==="ghost"?"1px solid #2a3a4a":variant==="danger"?"1px solid #c0392b55":"none";
  const color  = variant==="danger"?"#c0392b":"#fff";
  return <button onClick={onClick} style={{ background:bg,border,color,borderRadius:10,padding:"13px 18px",fontSize:14,fontWeight:700,cursor:"pointer",width:full?"100%":"auto",letterSpacing:.5,fontFamily:"inherit",...s }}>{children}</button>;
}
function FSelect({ label, value, onChange, options, placeholder }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label&&<label style={{ display:"block",fontSize:11,letterSpacing:1,color:"#888",marginBottom:5,textTransform:"uppercase" }}>{label}</label>}
      <select value={value} onChange={onChange} style={{ width:"100%",background:"#1a2636",border:"1px solid #2a3a4a",borderRadius:10,color:value?"#fff":"#666",padding:"12px 14px",fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}>
        {placeholder&&<option value="">{placeholder}</option>}
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function PlayerSearch({ players, value, onChange }) {
  const [query,setQuery]=useState(""); const [open,setOpen]=useState(false); const ref=useRef();
  const selected=players.find(p=>p.id===value);
  const filtered=query?players.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())||p.number.toString().includes(query)):players;
  useEffect(()=>{ const h=e=>{ if(ref.current&&!ref.current.contains(e.target))setOpen(false); }; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  return (
    <div ref={ref} style={{ position:"relative",marginBottom:14 }}>
      <label style={{ display:"block",fontSize:11,letterSpacing:1,color:"#888",marginBottom:5,textTransform:"uppercase" }}>Player</label>
      <div style={{ display:"flex",alignItems:"center",background:"#1a2636",border:"1px solid #2a3a4a",borderRadius:10,padding:"12px 14px",cursor:"pointer" }} onClick={()=>{ setOpen(true); setQuery(""); }}>
        {selected?<><span style={{ color:"#00e5ff",fontWeight:700,marginRight:8 }}>#{selected.number}</span><span style={{ color:"#fff" }}>{selected.name}</span></>:<span style={{ color:"#666",fontSize:15 }}>Search by name or # …</span>}
        {selected&&<button onClick={e=>{ e.stopPropagation(); onChange(null); }} style={{ marginLeft:"auto",background:"none",border:"none",color:"#888",fontSize:16,cursor:"pointer" }}>✕</button>}
      </div>
      {open&&(
        <div style={{ position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:"#0f1923",border:"1px solid #2a3a4a",borderRadius:10,maxHeight:220,overflowY:"auto",marginTop:4 }}>
          <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type to filter…" style={{ width:"100%",background:"#1a2636",border:"none",borderBottom:"1px solid #2a3a4a",color:"#fff",padding:"10px 14px",fontSize:14,outline:"none",boxSizing:"border-box",borderRadius:"10px 10px 0 0" }}/>
          {filtered.length===0&&<div style={{ padding:"12px 14px",color:"#666",fontSize:14 }}>No players found</div>}
          {filtered.map(p=>(
            <div key={p.id} onClick={()=>{ onChange(p.id); setOpen(false); }} style={{ padding:"12px 14px",cursor:"pointer",display:"flex",gap:10,alignItems:"center",borderBottom:"1px solid #1a2636",color:"#fff",fontSize:14 }} onMouseEnter={e=>e.currentTarget.style.background="#1a2636"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{ color:"#00e5ff",fontWeight:700,minWidth:32 }}>#{p.number}</span><span>{p.name}</span>
              <span style={{ marginLeft:"auto",display:"flex",gap:4 }}>{p.positions.map(pos=><Badge key={pos} color={pos==="quarterback"?"#ff6b35":"#00e5ff"}>{pos==="quarterback"?"QB":"PL"}</Badge>)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function BarGraph({ label, pct, color, sublabel }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#888",marginBottom:3 }}><span style={{ textTransform:"uppercase",letterSpacing:.8 }}>{label}</span><span style={{ color,fontWeight:700 }}>{sublabel}</span></div>
      <div style={{ background:"#080f17",borderRadius:5,height:8,overflow:"hidden" }}><div style={{ height:"100%",borderRadius:5,background:`linear-gradient(90deg,${color}88,${color})`,width:`${Math.max(pct,2)}%`,transition:"width .6s cubic-bezier(.4,0,.2,1)",boxShadow:`0 0 6px ${color}44` }}/></div>
    </div>
  );
}
function MiniStat({ value, label, color, plays, onOpen }) {
  const tappable=plays.length>0;
  return (
    <div onClick={()=>tappable&&onOpen()} style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"6px 10px",borderRadius:8,background:tappable?"#0a1420":"transparent",border:`1px solid ${tappable?color+"33":"transparent"}`,cursor:tappable?"pointer":"default",position:"relative",minWidth:52 }}>
      <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color,lineHeight:1,letterSpacing:.5 }}>{value}</span>
      <span style={{ fontSize:9,color:"#667",textTransform:"uppercase",letterSpacing:.8,marginTop:1 }}>{label}</span>
      {tappable&&<span style={{ position:"absolute",top:3,right:4,fontSize:7,color:color+"99" }}>▼</span>}
    </div>
  );
}
function DrillDown({ playerName, statLabel, plays, allPlayers, color, onClose }) {
  const icons={caught:"🙌",missed:"❌",flag:"🚩"};
  const byGame={};
  plays.forEach(p=>{ const key=p.gameNumber||"__none__"; if(!byGame[key])byGame[key]={gameNumber:p.gameNumber,gameType:p.gameType,gameDate:p.gameDate,team:p.team,plays:[]}; byGame[key].plays.push(p); });
  const games=Object.values(byGame).sort((a,b)=>(+(a.gameNumber||99))-(+(b.gameNumber||99)));
  return (
    <Sheet title={`${playerName} · ${statLabel}`} onClose={onClose} accent={color}>
      <div style={{ fontSize:12,color:"#888",marginBottom:18 }}>{plays.length} total · tap outside to close</div>
      {games.map(g=>(
        <div key={g.gameNumber||"none"} style={{ marginBottom:18 }}>
          <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8,padding:"8px 12px",background:"#1a2636",borderRadius:10,borderLeft:`3px solid ${color}` }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:17,color,letterSpacing:1 }}>{g.gameNumber?`Game #${g.gameNumber}`:"No Game # Set"}</div>
            {g.gameType&&<Badge color="#888">{g.gameType}</Badge>}
            {g.gameDate&&<span style={{ fontSize:11,color:"#666" }}>{g.gameDate}</span>}
            {g.team&&<span style={{ fontSize:11,color:"#666" }}>{g.team}</span>}
            <div style={{ marginLeft:"auto",background:color+"22",color,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700 }}>{g.plays.length} play{g.plays.length!==1?"s":""}</div>
          </div>
          {g.plays.map((play,i)=>{ const qb=play.qbId?allPlayers.find(p=>p.id===play.qbId):null; return (
            <div key={play.id} style={{ background:"#1a2636",borderRadius:9,padding:"9px 12px",marginBottom:5,display:"flex",alignItems:"center",gap:10,borderLeft:`3px solid ${color}66` }}>
              <span style={{ fontSize:15 }}>{icons[play.result]||"•"}</span>
              <div><div style={{ fontWeight:600,fontSize:13,color:"#fff" }}>Play #{i+1}</div>{qb&&<div style={{ fontSize:11,color:"#888" }}>QB: #{qb.number} {qb.name}</div>}</div>
              <div style={{ marginLeft:"auto",fontSize:11,color:"#445" }}>{new Date(play.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
            </div>
          ); })}
        </div>
      ))}
    </Sheet>
  );
}

// ── Compact expandable player card ────────────────────────────────────────────
function PlayerCard({ p, rank, maxCatches, maxFlags, onDrill }) {
  const [expanded,setExpanded]=useState(false);
  const isQb=p.positions.includes("quarterback");
  const rankColor=rank===0?"#ffd700":rank===1?"#c0c0c0":rank===2?"#cd7f32":"#334";
  const catchPct=Math.round(p.caught.length/maxCatches*100);
  const flagPct=Math.round(p.flag.length/maxFlags*100);
  const catchRate=(p.caught.length+p.missed.length)>0?Math.round(p.caught.length/(p.caught.length+p.missed.length)*100):0;
  return (
    <div style={{ background:rank===0?"linear-gradient(135deg,#112030,#0e1a2a)":"#111d29",borderRadius:13,marginBottom:7,border:rank===0?"1px solid #00e5ff28":"1px solid #1a2636",overflow:"hidden" }}>
      <div onClick={()=>setExpanded(e=>!e)} style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 12px",cursor:"pointer" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:rankColor,minWidth:18,textAlign:"center" }}>{rank+1}</div>
        <div style={{ background:"#00e5ff18",color:"#00e5ff",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,borderRadius:6,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{p.number}</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontWeight:700,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{p.name}</div>
          <div style={{ display:"flex",gap:3,marginTop:2 }}>{p.positions.map(pos=><Badge key={pos} color={pos==="quarterback"?"#ff6b35":"#00e5ff"}>{pos==="quarterback"?"QB":"PL"}</Badge>)}</div>
        </div>
        <div style={{ display:"flex",gap:5,alignItems:"center",flexShrink:0 }}>
          <span style={{ fontSize:12,color:"#22c55e",fontWeight:700 }}>{p.caught.length}C</span>
          <span style={{ fontSize:10,color:"#334" }}>·</span>
          <span style={{ fontSize:12,color:"#f59e0b",fontWeight:700 }}>{p.flag.length}F</span>
          {isQb&&p.thrown.length>0&&<><span style={{ fontSize:10,color:"#334" }}>·</span><span style={{ fontSize:12,color:"#ff6b35",fontWeight:700 }}>{p.compPct}%</span></>}
        </div>
        <div style={{ textAlign:"right",flexShrink:0,marginLeft:4 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#00e5ff",lineHeight:1 }}>{p.score}</div>
          <div style={{ fontSize:8,color:"#445",textTransform:"uppercase",letterSpacing:.8 }}>IQ</div>
        </div>
        <div style={{ fontSize:11,color:"#445",marginLeft:2,transform:expanded?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s" }}>▼</div>
      </div>
      {expanded&&(
        <div style={{ padding:"0 12px 14px",animation:"fadeIn .2s ease" }}>
          <div style={{ height:1,background:"#1a2a3a",marginBottom:12 }}/>
          <div style={{ display:"flex",gap:6,marginBottom:12 }}>
            <MiniStat value={p.caught.length} label="Catches" color="#22c55e" plays={p.caught} onOpen={()=>onDrill(p.name,"Catches",p.caught,"#22c55e")}/>
            <MiniStat value={p.missed.length} label="Missed" color="#ef4444" plays={p.missed} onOpen={()=>onDrill(p.name,"Missed",p.missed,"#ef4444")}/>
            <MiniStat value={p.flag.length} label="Flag Pulls" color="#f59e0b" plays={p.flag} onOpen={()=>onDrill(p.name,"Flag Pulls",p.flag,"#f59e0b")}/>
          </div>
          <div style={{ background:"#0a1420",borderRadius:9,padding:"10px 10px 4px",marginBottom:isQb&&p.thrown.length>0?10:0 }}>
            <BarGraph label="Catches vs Best" pct={catchPct} color="#22c55e" sublabel={`${p.caught.length} · ${catchPct}%`}/>
            <BarGraph label="Flag Pulls vs Best" pct={flagPct} color="#f59e0b" sublabel={`${p.flag.length} · ${flagPct}%`}/>
            {isQb&&<BarGraph label="Pass Completion %" pct={p.compPct} color="#ff6b35" sublabel={p.thrown.length>0?`${p.comp.length}/${p.thrown.length} · ${p.compPct}%`:"No attempts"}/>}
            {(p.caught.length+p.missed.length)>0&&<BarGraph label="Catch Rate" pct={catchRate} color="#00e5ff" sublabel={`${catchRate}%`}/>}
          </div>
          {isQb&&p.thrown.length>0&&(
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:9,color:"#ff6b3577",letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>As Quarterback</div>
              <div style={{ display:"flex",gap:6 }}>
                <MiniStat value={p.comp.length} label="Comp" color="#22c55e" plays={p.comp} onOpen={()=>onDrill(`${p.name} (QB)`,"Completions",p.comp,"#22c55e")}/>
                <MiniStat value={p.inc.length} label="Inc" color="#ef4444" plays={p.inc} onOpen={()=>onDrill(`${p.name} (QB)`,"Incomplete",p.inc,"#ef4444")}/>
                <MiniStat value={p.thrown.length} label="Att" color="#ff6b35" plays={p.thrown} onOpen={()=>onDrill(`${p.name} (QB)`,"All Attempts",p.thrown,"#ff6b35")}/>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Export / Import / Danger sheet ────────────────────────────────────────────
function BackupSheet({ data, onImport, onClose, showToast }) {
  const fileRef = useRef();

  const handleExport = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type:"application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const team = data.gameInfo?.team || "fieldiq";
    a.href = url;
    a.download = `${team.replace(/\s+/g,"-").toLowerCase()}-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded! ✓");
  };

  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.players || !parsed.plays) throw new Error("Invalid file");
        onImport(parsed);
        showToast("Data restored! ✓");
        onClose();
      } catch {
        showToast("Invalid backup file","#ef4444");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Sheet title="Backup & Restore" onClose={onClose} accent="#f59e0b">
      {/* Export */}
      <div style={{ background:"#1a2636",borderRadius:12,padding:"16px",marginBottom:14 }}>
        <div style={{ fontWeight:700,fontSize:14,marginBottom:4 }}>📤 Export Backup</div>
        <div style={{ fontSize:12,color:"#888",lineHeight:1.6,marginBottom:12 }}>
          Save all your players, game info, and play history as a file on your device. Use this to back up your data or move it to another device.
        </div>
        <button onClick={handleExport} style={{ width:"100%",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",color:"#fff",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          Download Backup File
        </button>
      </div>

      {/* Import */}
      <div style={{ background:"#1a2636",borderRadius:12,padding:"16px",marginBottom:14 }}>
        <div style={{ fontWeight:700,fontSize:14,marginBottom:4 }}>📥 Restore Backup</div>
        <div style={{ fontSize:12,color:"#888",lineHeight:1.6,marginBottom:12 }}>
          Load a previously exported backup file. <span style={{ color:"#ef4444" }}>This will replace all current data.</span>
        </div>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display:"none" }}/>
        <button onClick={()=>fileRef.current.click()} style={{ width:"100%",background:"#1e2d3d",border:"1px solid #2a3a4a",color:"#fff",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          Choose Backup File…
        </button>
      </div>

      <div style={{ fontSize:11,color:"#445",lineHeight:1.6,textAlign:"center" }}>
        💡 Tip: Export a backup before clearing your browser cache or switching devices.
      </div>
    </Sheet>
  );
}

// ── Delete player confirmation ────────────────────────────────────────────────
function DeletePlayerSheet({ player, playCount, onConfirm, onClose }) {
  return (
    <Sheet title="Remove Player?" onClose={onClose} accent="#ef4444">
      <div style={{ background:"#1a2636",borderRadius:12,padding:"16px",marginBottom:20,display:"flex",gap:14,alignItems:"center" }}>
        <div style={{ background:"#00e5ff18",color:"#00e5ff",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,borderRadius:8,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{player.number}</div>
        <div>
          <div style={{ fontWeight:700,fontSize:16 }}>{player.name}</div>
          <div style={{ fontSize:12,color:"#888",marginTop:2 }}>
            {playCount > 0 ? <span><span style={{ color:"#ef4444" }}>{playCount} play{playCount!==1?"s":""}</span> will also be deleted</span> : "No plays recorded"}
          </div>
        </div>
      </div>
      <div style={{ fontSize:13,color:"#888",marginBottom:20,lineHeight:1.6 }}>
        This will permanently remove <strong style={{ color:"#fff" }}>{player.name}</strong> and all their recorded plays. This cannot be undone.
      </div>
      <div style={{ display:"flex",gap:10 }}>
        <button onClick={onClose} style={{ flex:1,background:"#1e2d3d",border:"1px solid #2a3a4a",color:"#fff",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Cancel</button>
        <button onClick={onConfirm} style={{ flex:1,background:"linear-gradient(135deg,#ef4444,#c0392b)",border:"none",color:"#fff",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Remove Player</button>
      </div>
    </Sheet>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function FieldIQ() {
  const [data, setData]     = useState(() => load() || defaultState());
  const [tab, setTab]       = useState(0);
  const [modal, setModal]   = useState(null); // "addPlayer"|"gameInfo"|"backup"
  const [toast, setToast]   = useState(null);
  const [drill, setDrill]   = useState(null);
  const [shareUrl, setShareUrl] = useState(null);
  const [deletePlayer, setDeletePlayer] = useState(null); // player object to confirm delete

  // check for read-only share param
  const snapParam = useMemo(() => {
    const p = new URLSearchParams(window.location.search).get("snap");
    return p ? decodeSnapshot(p) : null;
  }, []);

  const [iPlayerId, setIPlayerId] = useState(null);
  const [iResult, setIResult]     = useState("");
  const [iQbId, setIQbId]         = useState("");
  const [pForm, setPForm]         = useState({ number:"", name:"", positions:[] });
  const [gForm, setGForm]         = useState(data.gameInfo);

  const update = fn => setData(prev => { const next = fn(prev); save(next); return next; });
  const showToast = (msg, color="#00e5ff") => { setToast({msg,color}); setTimeout(()=>setToast(null),2500); };

  const qbs = data.players.filter(p => p.positions.includes("quarterback"));
  const needsQb  = iResult==="caught" || iResult==="missed";
  const canSubmit = iPlayerId && iResult && (needsQb ? iQbId : true);

  const submitPlay = () => {
    if (!canSubmit) return;
    update(prev => ({ ...prev, plays: [...prev.plays, {
      id:uid(), ts:Date.now(), playerId:iPlayerId, result:iResult,
      qbId:needsQb?iQbId:null,
      gameNumber:prev.gameInfo.gameNumber, gameType:prev.gameInfo.type,
      gameDate:prev.gameInfo.date, team:prev.gameInfo.team,
    }]}));
    showToast("Play recorded! ✓");
    setIPlayerId(null); setIResult(""); setIQbId("");
  };

  const togglePos = pos => setPForm(f => ({ ...f, positions: f.positions.includes(pos) ? f.positions.filter(p=>p!==pos) : [...f.positions,pos] }));

  const submitPlayer = () => {
    if (!pForm.number||!pForm.name||pForm.positions.length===0) { showToast("Fill all fields!","#ff6b35"); return; }
    update(prev => ({ ...prev, players: [...prev.players, { id:uid(), ...pForm }] }));
    setPForm({ number:"", name:"", positions:[] });
    showToast("Player added!"); setModal(null);
  };

  const submitGame = () => { update(prev => ({ ...prev, gameInfo: gForm })); showToast("Game info saved!"); setModal(null); };

  const confirmDeletePlayer = () => {
    if (!deletePlayer) return;
    update(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== deletePlayer.id),
      plays:   prev.plays.filter(p => p.playerId !== deletePlayer.id),
    }));
    showToast(`${deletePlayer.name} removed`,"#ef4444");
    setDeletePlayer(null);
  };

  // stats
  const allStats = data.players.map(p => {
    const myPlays = data.plays.filter(pl => pl.playerId===p.id);
    const caught  = myPlays.filter(pl => pl.result==="caught");
    const missed  = myPlays.filter(pl => pl.result==="missed");
    const flag    = myPlays.filter(pl => pl.result==="flag");
    const isQb    = p.positions.includes("quarterback");
    const thrown  = data.plays.filter(pl => pl.qbId===p.id && (pl.result==="caught"||pl.result==="missed"));
    const comp    = thrown.filter(pl => pl.result==="caught");
    const inc     = thrown.filter(pl => pl.result==="missed");
    const compPct = thrown.length ? Math.round(comp.length/thrown.length*100) : 0;
    const score   = caught.length*2 + flag.length;
    return { ...p, myPlays, caught, missed, flag, isQb, thrown, comp, inc, compPct, score };
  });

  const maxCatches = Math.max(1, ...allStats.map(p=>p.caught.length));
  const maxFlags   = Math.max(1, ...allStats.map(p=>p.flag.length));
  const ranked     = [...allStats].sort((a,b) => b.score - a.score);

  const openShare = () => {
    const encoded = encodeSnapshot(ranked, data.gameInfo);
    if (!encoded) { showToast("Nothing to share yet!","#ff6b35"); return; }
    setShareUrl(`${window.location.origin}${window.location.pathname}?snap=${encoded}`);
  };

  // read-only view
  if (snapParam) return <ReadOnlyView snap={snapParam}/>;

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#080f17",minHeight:"100vh",color:"#fff",maxWidth:480,margin:"0 auto",position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700;900&display=swap');
        @keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2a3a4a;border-radius:2px}
        select option{background:#0f1923}
      `}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(160deg,#0a1e35 0%,#05111e 100%)",padding:"24px 20px 0",position:"relative",overflow:"hidden" }}>
        <svg style={{ position:"absolute",top:0,right:0,opacity:.05 }} width="200" height="100" viewBox="0 0 200 100">
          {[0,20,40,60,80,100,120,140,160,180,200].map(x=><line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#fff" strokeWidth=".5"/>)}
          <line x1="0" y1="50" x2="200" y2="50" stroke="#fff" strokeWidth="1"/>
        </svg>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:4 }}>
          <svg width="36" height="36" viewBox="0 0 36 36"><ellipse cx="18" cy="18" rx="14" ry="9" fill="#c97b3c"/><ellipse cx="18" cy="18" rx="14" ry="9" fill="none" stroke="#a0612c" strokeWidth="1.5"/><line x1="8" y1="18" x2="28" y2="18" stroke="#fff" strokeWidth="1.5"/><line x1="14" y1="13" x2="14" y2="23" stroke="#fff" strokeWidth="1.2"/><line x1="18" y1="11" x2="18" y2="25" stroke="#fff" strokeWidth="1.2"/><line x1="22" y1="13" x2="22" y2="23" stroke="#fff" strokeWidth="1.2"/></svg>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:38,letterSpacing:4,lineHeight:1,background:"linear-gradient(90deg,#fff 0%,#00e5ff 60%,#0090a8 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>FieldIQ</div>
            <div style={{ fontSize:10,color:"#00e5ff99",letterSpacing:3,textTransform:"uppercase",marginTop:-2 }}>Flag Football Tracker</div>
          </div>
          {data.gameInfo.team&&(
            <div style={{ marginLeft:"auto",textAlign:"right" }}>
              <div style={{ fontSize:12,color:"#00e5ff",fontWeight:700 }}>{data.gameInfo.team}</div>
              {data.gameInfo.gameNumber&&<div style={{ fontSize:10,color:"#666" }}>Game #{data.gameInfo.gameNumber}</div>}
            </div>
          )}
        </div>
        <div style={{ display:"flex" }}>
          {["⚙ Setup","✚ Input","📊 Player IQ"].map((t,i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{ flex:1,background:"none",border:"none",padding:"12px 0",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,letterSpacing:.5,color:tab===i?"#00e5ff":"#556",borderBottom:tab===i?"2px solid #00e5ff":"2px solid transparent",transition:"all .2s" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 14px",animation:"fadeIn .25s ease" }} key={tab}>

        {/* ══ SETUP ══ */}
        {tab===0&&(
          <div>
            <p style={{ color:"#888",fontSize:13,marginBottom:16,lineHeight:1.5 }}>Add players and set game info before tracking.</p>

            {/* action buttons */}
            <div style={{ display:"flex",gap:10,marginBottom:24 }}>
              <button onClick={()=>{ setPForm({number:"",name:"",positions:[]}); setModal("addPlayer"); }} style={{ flex:1,background:"linear-gradient(135deg,#00e5ff18,#00e5ff08)",border:"1px solid #00e5ff44",borderRadius:14,padding:"18px 12px",cursor:"pointer",textAlign:"center",color:"#fff" }}>
                <div style={{ fontSize:26,marginBottom:5 }}>👤</div>
                <div style={{ fontWeight:700,fontSize:13 }}>Add Player</div>
                <div style={{ fontSize:11,color:"#888",marginTop:1 }}>{data.players.length} added</div>
              </button>
              <button onClick={()=>{ setGForm(data.gameInfo); setModal("gameInfo"); }} style={{ flex:1,background:"linear-gradient(135deg,#ff6b3518,#ff6b3508)",border:"1px solid #ff6b3544",borderRadius:14,padding:"18px 12px",cursor:"pointer",textAlign:"center",color:"#fff" }}>
                <div style={{ fontSize:26,marginBottom:5 }}>🏟</div>
                <div style={{ fontWeight:700,fontSize:13 }}>Game Info</div>
                <div style={{ fontSize:11,color:"#888",marginTop:1 }}>{data.gameInfo.team||"Not set"}</div>
              </button>
              <button onClick={()=>setModal("backup")} style={{ flex:1,background:"linear-gradient(135deg,#f59e0b18,#f59e0b08)",border:"1px solid #f59e0b44",borderRadius:14,padding:"18px 12px",cursor:"pointer",textAlign:"center",color:"#fff" }}>
                <div style={{ fontSize:26,marginBottom:5 }}>💾</div>
                <div style={{ fontWeight:700,fontSize:13 }}>Backup</div>
                <div style={{ fontSize:11,color:"#888",marginTop:1 }}>Export / Import</div>
              </button>
            </div>

            {/* roster */}
            {data.players.length>0&&(
              <>
                <div style={{ fontSize:11,color:"#888",letterSpacing:2,textTransform:"uppercase",marginBottom:10 }}>
                  Roster — tap 🗑 to remove a player
                </div>
                {data.players.map(p=>{
                  const playCount = data.plays.filter(pl=>pl.playerId===p.id).length;
                  return (
                    <div key={p.id} style={{ background:"#1a2636",borderRadius:12,padding:"12px 14px",marginBottom:7,display:"flex",alignItems:"center",gap:12 }}>
                      <div style={{ background:"#00e5ff22",color:"#00e5ff",fontFamily:"'Bebas Neue',sans-serif",fontSize:18,borderRadius:7,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{p.number}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:700,fontSize:14 }}>{p.name}</div>
                        <div style={{ display:"flex",gap:4,marginTop:3,alignItems:"center" }}>
                          {p.positions.map(pos=><Badge key={pos} color={pos==="quarterback"?"#ff6b35":"#00e5ff"}>{pos==="quarterback"?"QB":"Player"}</Badge>)}
                          {playCount>0&&<span style={{ fontSize:10,color:"#556" }}>{playCount} play{playCount!==1?"s":""}</span>}
                        </div>
                      </div>
                      <button
                        onClick={()=>setDeletePlayer(p)}
                        style={{ background:"#ef444418",border:"1px solid #ef444433",color:"#ef4444",borderRadius:8,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:15,flexShrink:0 }}>
                        🗑
                      </button>
                    </div>
                  );
                })}
              </>
            )}
            {data.players.length===0&&(
              <div style={{ textAlign:"center",padding:"40px 20px",color:"#556" }}>
                <div style={{ fontSize:40,marginBottom:10 }}>🏈</div>
                <div style={{ fontSize:14 }}>No players yet. Tap "Add Player" to get started!</div>
              </div>
            )}
          </div>
        )}

        {/* ══ INPUT ══ */}
        {tab===1&&(
          <div>
            {data.players.length===0?(
              <div style={{ textAlign:"center",padding:"50px 20px",color:"#556" }}>
                <div style={{ fontSize:40,marginBottom:10 }}>⚙️</div>
                <div style={{ fontSize:14,marginBottom:16 }}>Add players in Setup first!</div>
                <Btn onClick={()=>setTab(0)} variant="ghost">Go to Setup →</Btn>
              </div>
            ):(
              <>
                <p style={{ color:"#888",fontSize:13,marginBottom:18,lineHeight:1.5 }}>Record each play as it happens.</p>
                <div style={{ background:"#0f1923",borderRadius:16,padding:16,border:"1px solid #1a2a3a" }}>
                  <div style={{ fontSize:11,color:"#00e5ff99",letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>Step 1 — Who had the play?</div>
                  <PlayerSearch players={data.players} value={iPlayerId} onChange={id=>{ setIPlayerId(id); setIResult(""); setIQbId(""); }}/>
                  {iPlayerId&&(
                    <div style={{ animation:"fadeIn .2s ease" }}>
                      <div style={{ fontSize:11,color:"#00e5ff99",letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>Step 2 — What happened?</div>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14 }}>
                        {[{value:"caught",label:"🙌 Caught",color:"#22c55e"},{value:"missed",label:"❌ Missed",color:"#ef4444"},{value:"flag",label:"🚩 Flag Pull",color:"#f59e0b"}].map(opt=>(
                          <button key={opt.value} onClick={()=>{ setIResult(opt.value); setIQbId(""); }} style={{ background:iResult===opt.value?opt.color+"33":"#1a2636",border:`1.5px solid ${iResult===opt.value?opt.color:"#2a3a4a"}`,borderRadius:10,padding:"12px 4px",cursor:"pointer",color:"#fff",fontSize:13,fontWeight:700,fontFamily:"inherit",transition:"all .15s" }}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {iPlayerId&&needsQb&&(
                    <div style={{ animation:"fadeIn .2s ease" }}>
                      <div style={{ fontSize:11,color:"#ff6b3599",letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>Step 3 — Which QB threw it?</div>
                      {qbs.length===0
                        ?<div style={{ color:"#666",fontSize:13,marginBottom:14 }}>No QBs set up yet!</div>
                        :<FSelect value={iQbId} onChange={e=>setIQbId(e.target.value)} placeholder="Select QB…" options={qbs.map(q=>({value:q.id,label:`#${q.number} ${q.name}`}))}/>
                      }
                    </div>
                  )}
                  {canSubmit&&<div style={{ animation:"fadeIn .2s ease" }}><Btn full onClick={submitPlay}>Record Play ✓</Btn></div>}
                </div>
                {data.plays.length>0&&(
                  <div style={{ marginTop:22 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                      <div style={{ fontSize:11,color:"#888",letterSpacing:2,textTransform:"uppercase" }}>Recent Plays ({data.plays.length})</div>
                      <button onClick={()=>{ if(window.confirm("Clear all plays?")) update(prev=>({...prev,plays:[]})); }} style={{ background:"none",border:"none",color:"#c0392b",fontSize:12,cursor:"pointer" }}>Clear all</button>
                    </div>
                    {[...data.plays].reverse().slice(0,8).map(play=>{
                      const player=data.players.find(p=>p.id===play.playerId);
                      const qb=play.qbId?data.players.find(p=>p.id===play.qbId):null;
                      const clr={caught:"#22c55e",missed:"#ef4444",flag:"#f59e0b"};
                      const ico={caught:"🙌",missed:"❌",flag:"🚩"};
                      return(
                        <div key={play.id} style={{ background:"#1a2636",borderRadius:10,padding:"9px 13px",marginBottom:6,display:"flex",alignItems:"center",gap:10,borderLeft:`3px solid ${clr[play.result]}` }}>
                          <span style={{ fontSize:17 }}>{ico[play.result]}</span>
                          <div><span style={{ fontWeight:700,fontSize:13 }}>#{player?.number} {player?.name}</span>{qb&&<span style={{ color:"#888",fontSize:12 }}> · QB #{qb.number}</span>}</div>
                          <div style={{ marginLeft:"auto",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2 }}>
                            <Badge color={clr[play.result]}>{play.result}</Badge>
                            {play.gameNumber&&<span style={{ fontSize:10,color:"#556" }}>Game #{play.gameNumber}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ PLAYER IQ ══ */}
        {tab===2&&(
          <div>
            {data.plays.length===0?(
              <div style={{ textAlign:"center",padding:"50px 20px",color:"#556" }}>
                <div style={{ fontSize:40,marginBottom:10 }}>📊</div>
                <div style={{ fontSize:14,marginBottom:16 }}>No plays recorded yet!</div>
                <Btn onClick={()=>setTab(1)} variant="ghost">Go to Input →</Btn>
              </div>
            ):(
              <>
                <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:12 }}>
                  {data.gameInfo.team&&(
                    <div style={{ flex:1,background:"#1a2636",borderRadius:12,padding:"10px 13px",borderLeft:"3px solid #ff6b35",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,color:"#ff6b35" }}>{data.gameInfo.team}</span>
                      {data.gameInfo.gameNumber&&<span style={{ fontSize:11,color:"#888" }}>Game #{data.gameInfo.gameNumber}</span>}
                      {data.gameInfo.type&&<Badge color="#888">{data.gameInfo.type}</Badge>}
                    </div>
                  )}
                  <button onClick={openShare} style={{ background:"linear-gradient(135deg,#00e5ff22,#00e5ff11)",border:"1px solid #00e5ff44",borderRadius:12,padding:"10px 14px",cursor:"pointer",color:"#00e5ff",fontFamily:"inherit",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6,flexShrink:0,whiteSpace:"nowrap" }}>
                    <span style={{ fontSize:16 }}>↗</span> Share
                  </button>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#556",marginBottom:12 }}>
                  <span>👆</span><span>Tap a row to expand · tap a stat to see game details</span>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8,padding:"0 12px",marginBottom:6 }}>
                  <div style={{ width:18 }}/><div style={{ width:30 }}/><div style={{ flex:1 }}/>
                  <div style={{ fontSize:9,color:"#445",letterSpacing:.8,textTransform:"uppercase",display:"flex",gap:14,marginRight:4 }}>
                    <span style={{ color:"#22c55e55" }}>C</span><span style={{ color:"#f59e0b55" }}>F</span><span style={{ color:"#ff6b3555" }}>QB%</span>
                  </div>
                  <div style={{ fontSize:9,color:"#445",letterSpacing:.8,textTransform:"uppercase",width:38,textAlign:"right" }}>IQ</div>
                  <div style={{ width:14 }}/>
                </div>
                {ranked.map((p,i)=>(
                  <PlayerCard key={p.id} p={p} rank={i} maxCatches={maxCatches} maxFlags={maxFlags}
                    onDrill={(name,label,plays,color)=>setDrill({playerName:name,statLabel:label,plays,color})}/>
                ))}
                {ranked.length===0&&<div style={{ color:"#556",fontSize:13 }}>No stats yet.</div>}
              </>
            )}
          </div>
        )}
      </div>

      {/* ══ MODALS ══ */}
      {modal==="addPlayer"&&(
        <Sheet title="Add Player" onClose={()=>setModal(null)}>
          <FInput label="Jersey Number" type="number" value={pForm.number} onChange={e=>setPForm(f=>({...f,number:e.target.value}))} placeholder="e.g. 12"/>
          <FInput label="Player Name" value={pForm.name} onChange={e=>setPForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Alex Johnson"/>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block",fontSize:11,letterSpacing:1,color:"#888",marginBottom:8,textTransform:"uppercase" }}>Position (select all that apply)</label>
            <div style={{ display:"flex",gap:10 }}>
              {["player","quarterback"].map(pos=>(
                <button key={pos} onClick={()=>togglePos(pos)} style={{ flex:1,background:pForm.positions.includes(pos)?(pos==="quarterback"?"#ff6b3533":"#00e5ff22"):"#1a2636",border:`1.5px solid ${pForm.positions.includes(pos)?(pos==="quarterback"?"#ff6b35":"#00e5ff"):"#2a3a4a"}`,borderRadius:10,padding:"12px 8px",cursor:"pointer",color:"#fff",fontFamily:"inherit",fontWeight:700,fontSize:13 }}>{pos==="quarterback"?"🏈 QB":"🏃 Player"}</button>
              ))}
            </div>
          </div>
          <Btn full onClick={submitPlayer}>Save Player</Btn>
        </Sheet>
      )}
      {modal==="gameInfo"&&(
        <Sheet title="Game Info" onClose={()=>setModal(null)} accent="#ff6b35">
          <div style={{ background:"#1a2636",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#888",lineHeight:1.6 }}>ℹ️ Update before each new game. Each play saves a snapshot so stats stay accurate across games.</div>
          <FInput label="Team Name" value={gForm.team} onChange={e=>setGForm(f=>({...f,team:e.target.value}))} placeholder="e.g. Thunder Hawks"/>
          <FInput label="Game Number" type="number" value={gForm.gameNumber} onChange={e=>setGForm(f=>({...f,gameNumber:e.target.value}))} placeholder="e.g. 3"/>
          <FInput label="Date" type="date" value={gForm.date} onChange={e=>setGForm(f=>({...f,date:e.target.value}))}/>
          <FSelect label="Type of Game" value={gForm.type} onChange={e=>setGForm(f=>({...f,type:e.target.value}))} placeholder="Select type…" options={[{value:"Regular Season",label:"Regular Season"},{value:"Playoff",label:"Playoff"},{value:"Championship",label:"Championship"},{value:"Scrimmage",label:"Scrimmage"},{value:"Tournament",label:"Tournament"}]}/>
          <Btn full onClick={submitGame}>Save Game Info</Btn>
        </Sheet>
      )}
      {modal==="backup"&&(
        <BackupSheet data={data} onImport={imported=>update(()=>imported)} onClose={()=>setModal(null)} showToast={showToast}/>
      )}

      {drill&&<DrillDown {...drill} allPlayers={data.players} onClose={()=>setDrill(null)}/>}
      {shareUrl&&<ShareSheet url={shareUrl} onClose={()=>setShareUrl(null)}/>}
      {deletePlayer&&<DeletePlayerSheet player={deletePlayer} playCount={data.plays.filter(p=>p.playerId===deletePlayer.id).length} onConfirm={confirmDeletePlayer} onClose={()=>setDeletePlayer(null)}/>}

      {toast&&(
        <div style={{ position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.color+"ee",color:"#fff",padding:"12px 24px",borderRadius:50,fontWeight:700,fontSize:14,zIndex:300,animation:"toastIn .3s ease",whiteSpace:"nowrap",boxShadow:`0 4px 20px ${toast.color}66` }}>{toast.msg}</div>
      )}
    </div>
  );
}

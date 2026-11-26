/* بيئة التطوير */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const code=$('#code'), hl=$('#highlight'), nums=$('#lineNumbers'),
      con=$('#console'), statusMsg=$('#statusMsg'), saveState=$('#saveState');

/* --- syntax highlight --- */
const KWS=Object.keys(Barmej.KEYWORDS).concat(['صنف','جديد','يرث','هذا','الأب','استورد']);
const KW_RE=new RegExp('('+KWS.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','g');
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function highlight(src){
  const lines=src.split('\n'); const out=[];
  for(const line of lines){
    let s=esc(line), res='', i=0;
    // string-aware highlighting per line
    const parts=[]; let cur='', instr=false, q='';
    for(const ch of line){
      if(instr){ cur+=ch; if(ch===q){ parts.push({t:'s',v:cur}); cur=''; instr=false; } }
      else if(ch==='"'||ch==="'"){ if(cur)parts.push({t:'p',v:cur}); cur=ch; instr=true; q=ch; }
      else if(ch==='#'){ if(cur)parts.push({t:'p',v:cur}); parts.push({t:'c',v:line.slice(line.indexOf(ch, parts.reduce((a,p)=>a+p.v.length,0)))}); cur=''; break; }
      else cur+=ch;
    }
    if(cur) parts.push({t:instr?'s':'p',v:cur});
    let html='';
    for(const part of parts){
      if(part.t==='s') html+='<span class="s">'+esc(part.v)+'</span>';
      else if(part.t==='c') html+='<span class="c">'+esc(part.v)+'</span>';
      else {
        let h=esc(part.v);
        h=h.replace(/([٠-٩0-9]+(?:[\.٫][٠-٩0-9]+)?)/g,'<span class="n">$1</span>');
        h=h.replace(KW_RE,'<span class="k">$1</span>');
        html+=h;
      }
    }
    out.push(html||' ');
  }
  return out.join('\n');
}
const breakpoints=new Set();
function renderHL(){
  hl.innerHTML=highlight(code.value)+'\n';
  const n=code.value.split('\n').length;
  let s=''; for(let i=1;i<=n;i++) s+='<span class="ln'+(breakpoints.has(i)?' bp':'')+'" data-l="'+i+'">'+i+'</span>'+(i<n?'\n':'');
  nums.innerHTML=s;
  hl.scrollTop=code.scrollTop; hl.scrollLeft=code.scrollLeft;
}
code.addEventListener('input',()=>{ renderHL(); autosave(); $('#errBar').classList.add('hidden'); });
function showErrLine(line){
  const lh=parseFloat(getComputedStyle(code).lineHeight)||23.25;
  const bar=$('#errBar');
  bar.style.top=(12+(line-1)*lh-code.scrollTop)+'px';
  bar.classList.remove('hidden'); bar.classList.remove('step-mode');
}
code.addEventListener('scroll',()=>{ hl.scrollTop=code.scrollTop; hl.scrollLeft=code.scrollLeft; nums.scrollTop=code.scrollTop; });
function insText(txt,caretBack){
  code.focus(); let ok=false; try{ ok=txt===''?document.execCommand('delete'):document.execCommand('insertText',false,txt); }catch(err){}
  if(!ok){ const s=code.selectionStart; code.value=code.value.slice(0,s)+txt+code.value.slice(code.selectionEnd); code.selectionStart=code.selectionEnd=s+txt.length; }
  if(caretBack){ code.selectionStart=code.selectionEnd=code.selectionStart-caretBack; }
  renderHL(); autosave();
}
const PAIRS={'{':'}','[':']','(':')','"':'"'};
code.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing) return;
  const v=code.value, s=code.selectionStart, en=code.selectionEnd, prev=v[s-1], next=v[en];
  if(e.key==='Enter'&&!e.shiftKey){
    e.preventDefault();
    const ls=v.lastIndexOf('\n',s-1)+1; const line=v.slice(ls,s); const ind=(line.match(/^[ \t]*/)||[''])[0];
    const opens=/[\{\[\(]\s*$/.test(line.replace(/#.*$/,'')) ;
    if(opens&&(next==='}'||next===']'||next===')')) insText('\n'+ind+'  \n'+ind,ind.length+1);
    else insText('\n'+ind+(opens?'  ':''));
    return;
  }
  if(PAIRS[e.key]&&s===en){
    const closer=PAIRS[e.key];
    if(e.key==='"'&&next==='"'){ e.preventDefault(); code.selectionStart=code.selectionEnd=s+1; return; }
    if(e.key==='"'&&/[\wء-ي]/.test(prev||'')) return;
    if(next===undefined||/[\s\)\]\}\n]/.test(next)){ e.preventDefault(); insText(e.key+closer,1); return; }
  }
  if((e.key==='}'||e.key===']'||e.key===')')&&s===en&&next===e.key){ e.preventDefault(); code.selectionStart=code.selectionEnd=s+1; return; }
  if(e.key==='Backspace'&&s===en&&prev&&PAIRS[prev]&&next===PAIRS[prev]){ e.preventDefault(); code.selectionStart=s-1; code.selectionEnd=s+1; insText(''); return; }
});
code.addEventListener('keydown',e=>{
  if(e.key==='Tab'){ e.preventDefault();
    const s=code.selectionStart; code.value=code.value.slice(0,s)+'  '+code.value.slice(code.selectionEnd);
    code.selectionStart=code.selectionEnd=s+2; renderHL(); autosave(); }
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); runProgram(); }
});

/* --- turtle graphics --- */
const turtlePanel=$('#turtlePanel'), tc=$('#turtleCanvas'), tctx=tc.getContext('2d');
const AR_COLORS={'أحمر':'#ff4757','احمر':'#ff4757','أزرق':'#3b82f6','ازرق':'#3b82f6','أخضر':'#22c55e','اخضر':'#22c55e','أصفر':'#eab308','اصفر':'#eab308','أسود':'#111418','اسود':'#111418','أبيض':'#ffffff','ابيض':'#ffffff','برتقالي':'#f97316','بنفسجي':'#a855f7','وردي':'#ec4899','رمادي':'#9ca3af','سماوي':'#06b6d4','بني':'#92400e','ذهبي':'#d4af37'};
let turtle=null;
function turtleReset(){
  turtle={x:0,y:0,ang:-90,pen:true,color:'#2dd4a7',w:2};
  tctx.setTransform(1,0,0,1,0,0);
  tctx.clearRect(0,0,tc.width,tc.height);
  tctx.setTransform(1,0,0,1,tc.width/2,tc.height/2);
  tctx.lineCap='round'; tctx.lineJoin='round';
}
const SPRITE_PAL={'1':'#111827','2':'#ef4444','3':'#f59e0b','4':'#fde047','5':'#22c55e','6':'#3b82f6','7':'#a855f7','8':'#f9fafb','9':'#92400e'};
function turtleHandle(o){
  turtlePanel.classList.remove('hidden');
  if(!turtle) turtleReset();
  const T=turtle, rad=d=>d*Math.PI/180;
  switch(o.op){
    case 'clear': turtleReset(); return;
    case 'fd': case 'bk': { const d=o.op==='fd'?o.n:-o.n;
      const nx=T.x+d*Math.cos(rad(T.ang)), ny=T.y+d*Math.sin(rad(T.ang));
      if(T.pen){ tctx.strokeStyle=T.color; tctx.lineWidth=T.w;
        tctx.beginPath(); tctx.moveTo(T.x,T.y); tctx.lineTo(nx,ny); tctx.stroke(); }
      T.x=nx; T.y=ny; break; }
    case 'rt': T.ang+=o.z; break;
    case 'lt': T.ang-=o.z; break;
    case 'color': T.color=AR_COLORS[o.c]||o.c; break;
    case 'width': T.w=Math.max(1,o.n); break;
    case 'up': T.pen=false; break;
    case 'down': T.pen=true; break;
    case 'goto': if(T.pen){ tctx.strokeStyle=T.color; tctx.lineWidth=T.w; tctx.beginPath(); tctx.moveTo(T.x,T.y); tctx.lineTo(o.x,o.y); tctx.stroke(); } T.x=o.x; T.y=o.y; break;
    case 'circle': tctx.strokeStyle=T.color; tctx.lineWidth=T.w; tctx.beginPath(); tctx.arc(T.x,T.y,Math.abs(o.r),0,Math.PI*2); tctx.stroke(); break;
    case 'dot': tctx.fillStyle=T.color; tctx.beginPath(); tctx.arc(T.x,T.y,Math.abs(o.n||6),0,Math.PI*2); tctx.fill(); break;
    case 'rect': T.lastRect={x:T.x-o.w/2,y:T.y-o.h/2,w:o.w,h:o.h};
      tctx.strokeStyle=T.color; tctx.lineWidth=T.w; tctx.strokeRect(T.lastRect.x,T.lastRect.y,o.w,o.h); break;
    case 'fill': if(T.lastRect){ tctx.fillStyle=T.color; tctx.fillRect(T.lastRect.x,T.lastRect.y,T.lastRect.w,T.lastRect.h); } break;
    case 'emoji': tctx.save(); tctx.translate(T.x,T.y); tctx.rotate(rad(o.ang||0)); tctx.font=(o.size||40)+'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif'; tctx.textAlign='center'; tctx.textBaseline='middle'; tctx.fillText(o.t,0,0); tctx.restore(); break;
    case 'tiles': { const rows=o.rows, s=o.size||40, w=Math.max(...rows.map(r=>r.length)), x0=-w*s/2, y0=-rows.length*s/2;
      rows.forEach((r,j)=>{ for(let i=0;i<r.length;i++){ const ch=r[i], x=x0+i*s, y=y0+j*s; if(ch==='#'){ tctx.fillStyle='#475569'; tctx.fillRect(x,y,s+0.5,s+0.5); tctx.fillStyle='#64748b'; tctx.fillRect(x,y,s+0.5,s*0.12); tctx.fillStyle='#334155'; tctx.fillRect(x,y+s*0.88,s+0.5,s*0.12+0.5); } else { const c=SPRITE_PAL[ch]; if(c){ tctx.fillStyle=c; tctx.fillRect(x,y,s+0.5,s+0.5); } } } }); break; }
    case 'pixels': { const PAL=SPRITE_PAL, rows=o.rows, s=o.size||10, w=Math.max(...rows.map(r=>r.length)), x0=T.x-w*s/2, y0=T.y-rows.length*s/2;
      rows.forEach((r,j)=>{ for(let i=0;i<r.length;i++){ const c=PAL[r[i]]; if(c){ tctx.fillStyle=c; tctx.fillRect(x0+i*s,y0+j*s,s+0.5,s+0.5); } } }); break; }
    case 'bg': tctx.save(); tctx.fillStyle=AR_COLORS[o.c]||o.c; tctx.fillRect(-tc.width,-tc.height,tc.width*2,tc.height*2); tctx.restore(); break;
    case 'text': tctx.fillStyle=T.color; tctx.font='bold '+(o.size||22)+'px Tahoma,Arial'; tctx.textAlign='center'; tctx.direction='rtl'; tctx.fillText(o.t,T.x,T.y); break;
  }
}
/* --- draw speed --- */
let drawDelay=0;
try{ drawDelay=parseInt(localStorage.getItem('barmej-drawdelay'))||0; }catch(e){}
function renderSpeed(){ $('#drawSpeed').value=String(drawDelay); }
$('#drawSpeed').addEventListener('change',ev=>{ drawDelay=parseInt(ev.target.value)||0;
  try{ localStorage.setItem('barmej-drawdelay',String(drawDelay)); }catch(e){}
  toast(drawDelay? 'الرسم هيبقى متحرك 🐢':'الرسم هيبقى فوري ⚡'); });
renderSpeed();

/* --- sound --- */
let actx=null;
function beep(freq,ms,delay){
  if(muted) return;
  try{
    if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='triangle'; o.frequency.value=freq;
    const t0=actx.currentTime+(delay||0)/1000;
    g.gain.setValueAtTime(.18,t0);
    g.gain.exponentialRampToValueAtTime(.001,t0+(ms||200)/1000);
    o.connect(g); g.connect(actx.destination);
    o.start(t0); o.stop(t0+(ms||200)/1000);
  }catch(e){}
}
$('#clearTurtle').addEventListener('click',()=>{ turtleReset(); });

/* --- fullscreen canvas --- */
$('#fullscreenBtn').addEventListener('click',()=>{
  try{
    if(document.fullscreenElement){ document.exitFullscreen(); }
    else { turtlePanel.requestFullscreen(); }
  }catch(e){ toast('المتصفح مش بيدعم ملء الشاشة'); }
});

/* --- touch d-pad --- */
(function(){
  const pad=$('#touchPad');
  let padWanted=false;
  try{ padWanted=localStorage.getItem('barmej-pad')==='1' || ('ontouchstart' in window); }catch(e){}
  if(padWanted) pad.classList.remove('hidden');
  $('#padBtn').addEventListener('click',()=>{
    pad.classList.toggle('hidden');
    const on=!pad.classList.contains('hidden');
    try{ localStorage.setItem('barmej-pad',on?'1':'0'); }catch(e){}
    toast(on?'أسهم اللمس ظهرت 🎮':'أسهم اللمس اختفت');
  });
  pad.querySelectorAll('.tp').forEach(b=>{
    const k=b.dataset.k;
    b.addEventListener('pointerdown',ev=>{ ev.preventDefault(); pressedKey=k; });
    b.addEventListener('pointerup',()=>{ if(pressedKey===k) pressedKey=''; });
    b.addEventListener('pointerleave',()=>{ if(pressedKey===k) pressedKey=''; });
  });
})();

/* --- freehand drawing --- */
let freehand=false, drawing=false, lastX=0, lastY=0;
$('#freehandBtn').addEventListener('click',()=>{
  freehand=!freehand;
  $('#freehandBtn').classList.toggle('active-ghost',freehand);
  turtlePanel.classList.remove('hidden');
  if(!turtle) turtleReset();
  toast(freehand?'✏️ ارسم بالماوس على اللوحة':'اتقفل الرسم الحر');
});
function canvasPos(ev){
  const r=tc.getBoundingClientRect(); if(!r.width||!r.height) return {x:0,y:0};
  const k=Math.min(r.width/tc.width,r.height/tc.height); /* object-fit:contain */
  const cx=(ev.clientX-r.left-(r.width-tc.width*k)/2)/k, cy=(ev.clientY-r.top-(r.height-tc.height*k)/2)/k;
  return {x:cx-tc.width/2, y:cy-tc.height/2};
}
tc.addEventListener('pointerdown',ev=>{ if(!freehand) return; drawing=true;
  if(!turtle) turtleReset();
  const p=canvasPos(ev); lastX=p.x; lastY=p.y; tc.setPointerCapture(ev.pointerId); });
tc.addEventListener('pointermove',ev=>{ if(!freehand||!drawing) return;
  const p=canvasPos(ev);
  tctx.strokeStyle=turtle.color; tctx.lineWidth=turtle.w;
  tctx.beginPath(); tctx.moveTo(lastX,lastY); tctx.lineTo(p.x,p.y); tctx.stroke();
  lastX=p.x; lastY=p.y; });
tc.addEventListener('pointerup',()=>{ drawing=false; });
/* --- mouse/touch for programs: ماوس_س ماوس_ص ماوس_مضغوط نقرة --- */
const mouse={x:0,y:0,down:false}; let clickQ=null;
tc.addEventListener('pointerdown',ev=>{ const p=canvasPos(ev); mouse.x=p.x; mouse.y=p.y; mouse.down=true; clickQ={x:p.x,y:p.y}; });
tc.addEventListener('pointermove',ev=>{ const p=canvasPos(ev); mouse.x=p.x; mouse.y=p.y; });
tc.addEventListener('pointerup',()=>{ mouse.down=false; });
tc.addEventListener('pointercancel',()=>{ mouse.down=false; });
tc.style.touchAction='none';

/* --- console --- */
function println(txt,cls){ const d=document.createElement('div'); d.className=cls||'out'; d.textContent=txt; con.appendChild(d); con.scrollTop=con.scrollHeight; }
function clearConsole(){ con.innerHTML=''; }

/* --- keyboard input (مفتاح) --- */
const KEYMAP={'ArrowUp':'فوق','ArrowDown':'تحت','ArrowLeft':'يسار','ArrowRight':'يمين',' ':'مسافة','Enter':'إدخال','Escape':'خروج'};
let pressedKey='';
window.addEventListener('keydown',e=>{ if(e.target===code) return; pressedKey=KEYMAP[e.key]||e.key; });
window.addEventListener('keyup',()=>{ pressedKey=''; });

/* --- run --- */
function askInline(q){
  return new Promise(res=>{
    const row=document.createElement('div'); row.className='ask-row';
    const label=document.createElement('span'); label.textContent=(q||'أدخل قيمة:');
    const inp=document.createElement('input'); inp.className='ask-input'; inp.dir='rtl'; inp.setAttribute('placeholder','اكتب هنا ودوس إدخال…');
    const btn=document.createElement('button'); btn.className='run small'; btn.textContent='✔';
    let settled=false;
    function done(){ if(settled) return; settled=true; const v=inp.value;
      row.remove(); println('❯ '+label.textContent+' '+v,'ask-echo'); res(v); }
    btn.addEventListener('click',done);
    inp.addEventListener('keydown',e=>{ if(e.key==='Enter') done(); });
    row.appendChild(label); row.appendChild(inp); row.appendChild(btn);
    con.appendChild(row); con.scrollTop=con.scrollHeight; inp.focus();
  });
}
function chooseInline(q,opts){
  return new Promise(res=>{
    const row=document.createElement('div'); row.className='ask-row';
    const label=document.createElement('span'); label.textContent=(q||'اختار:');
    row.appendChild(label);
    let settled=false;
    (opts||[]).forEach(o=>{
      const b=document.createElement('button'); b.className='choice-chip'; b.textContent=o;
      b.addEventListener('click',()=>{ if(settled) return; settled=true;
        row.remove(); println('❯ '+label.textContent+' '+o,'ask-echo'); res(o); });
      row.appendChild(b);
    });
    con.appendChild(row); con.scrollTop=con.scrollHeight;
  });
}
function makeIO(){
  return {
    print:s=>println(s),
    clear:()=>clearConsole(),
    ask:q=>{ const a=window.prompt(q||'أدخل قيمة:'); return a===null?'':a; },
    askAsync:q=>askInline(q),
    chooseAsync:(q,opts)=>chooseInline(q,opts),
    draw:o=>{ turtleHandle(o); return drawDelay>0? {__sleep:drawDelay} : null; },
    beep:(f,m,d)=>beep(f,m,d),
    key:()=>pressedKey,
    mouse:()=>mouse,
    module:n=>{ const p=getPrograms(); n=String(n).replace(/\.برمج$/,''); return Object.prototype.hasOwnProperty.call(p,n)?p[n]:null; },
    click:()=>{ const c=clickQ; clickQ=null; return c; }
  };
}
function resetRunUI(){
  clearConsole();
  turtle=null; turtlePanel.classList.add('hidden'); clickQ=null;
  if(/نقرة|ماوس_/.test(code.value)){ turtleReset(); turtlePanel.classList.remove('hidden'); }
  const bar=$('#errBar'); bar.classList.add('hidden'); bar.classList.remove('step-mode');
  $('#stepBar').classList.add('hidden'); $('#varsPanel').classList.add('hidden');
  stepper=null;
}
let runSeq=0;
let lastTrace=0;
function traceLine(line){
  const now=performance.now();
  if(now-lastTrace<80) return;
  lastTrace=now;
  showStepLine(line);
}
function histAll(){ try{ return JSON.parse(localStorage.getItem('barmej-hist')||'{}'); }catch(e){ return {}; } }
function histSnap(){ try{ const h=histAll(), k=currentProgram, l=h[k]||[]; if(!code.value.trim()||(l.length&&l[0].c===code.value)) return; l.unshift({t:Date.now(),c:code.value}); h[k]=l.slice(0,25); localStorage.setItem('barmej-hist',JSON.stringify(h)); }catch(e){} }
async function runProgram(){
  const myRun=++runSeq;
  histSnap();
  resetRunUI();
  println('▶ بدأ التنفيذ…','sys');
  const t0=performance.now();
  lastTrace=0;
  const rb=$('#runBtn'); rb.disabled=true; rb.textContent='⏳ بيشتغل…';
  const r=await Barmej.runSourceAsync(code.value,makeIO(),null,traceLine);
  rb.disabled=false; rb.textContent='▶ شغّل';
  if(myRun!==runSeq) { return; }
  $('#errBar').classList.add('hidden');
  const ms=Math.round(performance.now()-t0);
  if(r.ok){ println('✔ انتهى التنفيذ في '+ms+' م.ث','sys'); statusMsg.textContent='نجح التنفيذ'; try{ achCheck({ran:true,code:code.value}); }catch(e){} }
  else{
    println('✖ خطأ: '+r.error,'err');
    if(r.line){ println('في السطر '+r.line,'err-line'); showErrLine(r.line); }
    statusMsg.textContent='فيه خطأ — السطر '+(r.line||'?');
  }
}
/* على الموبايل: لو البرنامج لعبة (رسم + ماوس/مفتاح) نفتحه بوضع اللعبة عشان اللوحة تبقى كبيرة */
function phoneGame(){
  try{
    if(!window.matchMedia('(max-width:760px)').matches || document.body.classList.contains('app-mode')) return;
    const c=code.value;
    if(/ماوس_|مفتاح\(|نقرة/.test(c) && /خلفية|مستطيل|رمز\(/.test(c)){
      enterAppMode();
      toast('🎮 وضع اللعبة — دوس «تعديل» عشان ترجع للكود');
    }
  }catch(e){}
}
$('#runBtn').addEventListener('click',()=>{ phoneGame(); runProgram(); });
$('#clearConsole').addEventListener('click',clearConsole);

/* --- step-by-step mode --- */
let stepper=null;
function showStepLine(line){
  const lh=parseFloat(getComputedStyle(code).lineHeight)||23.25;
  const bar=$('#errBar');
  bar.style.top=(12+(line-1)*lh-code.scrollTop)+'px';
  bar.classList.add('step-mode'); bar.classList.remove('hidden');
}
let prevVars={};
function renderVars(vars){
  const b=$('#varsBody'); b.innerHTML=''; const old=prevVars; prevVars=Object.assign({},vars);
  const ks=Object.keys(vars);
  if(!ks.length){ b.innerHTML='<div class="var-row" style="color:var(--muted)">مفيش متغيرات لسه</div>'; return; }
  ks.forEach(k=>{
    const d=document.createElement('div'); d.className='var-row';
    const n=document.createElement('span'); n.className='var-name'; n.textContent=k;
    const v=document.createElement('span'); v.className='var-val'; v.textContent=vars[k]; if(old[k]!==undefined&&old[k]!==vars[k]) d.classList.add('changed'); else if(old[k]===undefined&&Object.keys(old).length) d.classList.add('changed');
    d.appendChild(n); d.appendChild(v); b.appendChild(d);
  });
}
function stopStepMode(msg){
  stepper=null; prevVars={};
  $('#stepBar').classList.add('hidden');
  const bar=$('#errBar'); bar.classList.add('hidden'); bar.classList.remove('step-mode');
  if(msg) println(msg,'sys');
}
function doStep(){
  if(!stepper) return;
  let s;
  try{ s=stepper.step(); }
  catch(e){
    println('✖ خطأ: '+(e.message||e),'err');
    if(e.line){ println('في السطر '+e.line,'err-line'); showErrLine(e.line); }
    stopStepMode(); statusMsg.textContent='فيه خطأ — السطر '+(e.line||'?');
    return;
  }
  if(s.done){ stopStepMode('✔ خلص البرنامج'); statusMsg.textContent='نجح التنفيذ'; return; }
  showStepLine(s.line); renderVars(s.vars);
  statusMsg.textContent='وضع الخطوة — السطر '+s.line;
}
$('#stepBtn').addEventListener('click',()=>{ try{ achCheck({step:true}); }catch(e){}
  runSeq++;
  resetRunUI();
  const r=Barmej.createStepper(code.value,makeIO());
  if(!r.ok){
    println('✖ خطأ: '+r.error,'err');
    if(r.line){ println('في السطر '+r.line,'err-line'); showErrLine(r.line); }
    return;
  }
  stepper=r.stepper;
  $('#stepBar').classList.remove('hidden'); $('#varsPanel').classList.remove('hidden');
  println('👣 وضع الخطوة: هينفذ سطر سطر مع كل ضغطة «التالية»، والمتغيرات قدامك','sys');
  doStep();
});
$('#nextStep').addEventListener('click',doStep);
nums.addEventListener('click',e=>{ const l=+(e.target.dataset&&e.target.dataset.l); if(!l) return; if(breakpoints.has(l)) breakpoints.delete(l); else breakpoints.add(l); renderHL(); toast(breakpoints.has(l)?'🔴 نقطة توقف عند السطر '+l:'اتشالت نقطة التوقف'); });
$('#toBreak').addEventListener('click',()=>{ if(!stepper) return; if(!breakpoints.size){ toast('اضغط على رقم سطر عشان تحط 🔴 نقطة توقف'); return; }
  let s, start=null, n=0;
  try{ do{ s=stepper.step(); n++; if(start===null&&!s.done) start=s.line; }while(!s.done&&n<20000&&!(breakpoints.has(s.line)&&n>1)); }
  catch(e){ println('✖ خطأ: '+(e.message||e),'err'); if(e.line){ println('في السطر '+e.line,'err-line'); showErrLine(e.line); } stopStepMode(); return; }
  if(s.done){ stopStepMode('✔ خلص البرنامج'); statusMsg.textContent='نجح التنفيذ'; return; }
  showStepLine(s.line); renderVars(s.vars); statusMsg.textContent=(breakpoints.has(s.line)?'🔴 وقفت عند نقطة التوقف — السطر ':'وضع الخطوة — السطر ')+s.line; });
$('#finishSteps').addEventListener('click',()=>{
  if(!stepper) return;
  try{ stepper.runSync(); stopStepMode('✔ خلص البرنامج'); statusMsg.textContent='نجح التنفيذ'; }
  catch(e){
    println('✖ خطأ: '+(e.message||e),'err');
    if(e.line){ println('في السطر '+e.line,'err-line'); showErrLine(e.line); }
    stopStepMode();
  }
});
$('#stopSteps').addEventListener('click',()=>stopStepMode('⏹ اتوقف وضع الخطوة'));

/* --- autocomplete chips --- */
const BUILTINS=['طول','أضف','احذف','يحتوي','عشوائي','قرب','جذر','مطلق','أكبر','أصغر','نص','رقم','نوع','جزء','حروف','فصل','وصل','مفاتيح','قيم','اسأل','امسح','قدم','ورا','يمين','شمال','لون','سمك','ارفع','انزل','اذهب','دائرة','نقطة','امسح_اللوحة','مستطيل','املأ','نص_على_اللوحة','رمز','خلفية','بكسلات','خريطة_بلاط','بلاطة_عند','احفظ','استرجع','لحن','صوت','نغمة','وقت','بدّل','رتّب','اعكس','مجموع','اخلط','فهرس','كرر_نص','استنى','مفتاح','مدى','قطع','جيب','جتا','ظا','باي','اختار','ساعات','دقائق','ثواني','أول','آخر','فريد','عدد_مرات','خريطة','صفّي','اختزل','جد','أي','كل','رتب_حسب','مسافة','زاوية','تصادم','داخل','ماوس_س','ماوس_ص','ماوس_مضغوط','نقرة'];
const ALL_WORDS=[...KWS,...BUILTINS];
const suggestBar=$('#suggestBar');
function currentWord(){
  const pos=code.selectionStart;
  const before=code.value.slice(0,pos);
  const m=before.match(/[\u0620-\u065F\u066E-\u06D3a-zA-Z_][\u0620-\u065F\u066E-\u06D3a-zA-Z_0-9]*$/);
  return m? m[0] : '';
}
function renderSuggest(){
  const w=currentWord();
  suggestBar.innerHTML='';
  if(!w||w.length<1) return;
  const matches=ALL_WORDS.filter(x=>x!==w&&x.startsWith(w)).slice(0,10);
  for(const mch of matches){
    const b=document.createElement('button'); b.className='suggest-chip'; b.textContent=mch;
    b.addEventListener('click',()=>{
      const pos=code.selectionStart;
      code.value=code.value.slice(0,pos-w.length)+mch+code.value.slice(pos);
      code.selectionStart=code.selectionEnd=pos-w.length+mch.length;
      code.focus(); renderHL(); renderSuggest(); autosave();
    });
    suggestBar.appendChild(b);
  }
}
code.addEventListener('keyup',renderSuggest);
code.addEventListener('click',renderSuggest);

/* --- editor font size --- */
let editorFont=15;
try{ editorFont=parseInt(localStorage.getItem('barmej-font'))||15; }catch(e){}
function applyFont(){
  code.style.fontSize=editorFont+'px'; hl.style.fontSize=editorFont+'px';
  const lh=Math.round(editorFont*1.55*10)/10;
  code.style.lineHeight=lh+'px'; hl.style.lineHeight=lh+'px'; nums.style.lineHeight=lh+'px'; nums.style.fontSize=(editorFont-3)+'px';
  try{ localStorage.setItem('barmej-font',String(editorFont)); }catch(e){}
}
$('#fontUp').addEventListener('click',()=>{ editorFont=Math.min(24,editorFont+1); applyFont(); renderHL(); });
$('#formatBtn').addEventListener('click',()=>{
  const before=code.value, after=Barmej.format(before);
  if(before===after||before.trim()+'\n'===after){ toast('الكود منسّق بالفعل ✨'); return; }
  code.focus(); code.select();
  let ok=false; try{ ok=document.execCommand('insertText',false,after); }catch(e){}
  if(!ok||code.value!==after){ code.value=after; }
  code.dispatchEvent(new Event('input')); renderHL();
  toast('اتنسّق الكود ✨ (Ctrl+Z للتراجع)');
});
document.addEventListener('keydown',e=>{ if(e.shiftKey&&(e.ctrlKey||e.metaKey)&&(e.key==='F'||e.key==='f')&&document.activeElement===code){ e.preventDefault(); $('#formatBtn').click(); } });
$('#fontDown').addEventListener('click',()=>{ editorFont=Math.max(11,editorFont-1); applyFont(); renderHL(); });
applyFont();

/* --- mute --- */
let muted=false;
try{ muted=localStorage.getItem('barmej-muted')==='1'; }catch(e){}
function renderMute(){ $('#muteBtn').textContent=muted?'🔇':'🔊'; }
$('#muteBtn').addEventListener('click',()=>{ muted=!muted; renderMute(); try{ localStorage.setItem('barmej-muted',muted?'1':'0'); }catch(e){} toast(muted?'الصوت اتقفل':'الصوت اتفتح'); });
renderMute();

/* --- autosave --- */
let saveTimer=null;
function autosave(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{
  try{ localStorage.setItem('barmej-code',code.value);
    const p=getPrograms(); p[currentProgram]=code.value; savePrograms(p);
    saveState.textContent='اتحفظ تلقائيًا ✓'; }catch(e){}
},600); }

/* --- share --- */
const b64u={enc:u8=>{ let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); },
  dec:t=>{ t=t.replace(/-/g,'+').replace(/_/g,'/'); while(t.length%4) t+='='; const s=atob(t), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; }};
async function zPipe(u8,Ctor){ const st=new Ctor('deflate-raw'); const w=st.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(st.readable).arrayBuffer()); }
async function makeHash(suffix){
  const plain='#code='+encodeURIComponent(btoa(unescape(encodeURIComponent(code.value))))+(suffix||'');
  try{ if(typeof CompressionStream==='undefined') return plain;
    const z='#z='+b64u.enc(await zPipe(new TextEncoder().encode(code.value),CompressionStream))+(suffix||'');
    return z.length<plain.length?z:plain; }catch(e){ return plain; }
}
async function copyLink(suffix,okMsg){ try{ achCheck({shared:true}); }catch(e){}
  const hash=await makeHash(suffix); const url=location.origin+location.pathname+hash;
  try{ if(!navigator.clipboard) throw 0; await navigator.clipboard.writeText(url); toast(okMsg); }
  catch(e){ location.hash=hash; toast('الرابط في شريط العنوان — انسخه'); } }
$('#shareBtn').addEventListener('click',()=>copyLink('','اتنسخ رابط المشاركة! أي حد يفتحه هيلاقي كودك'));
$('#appLinkBtn').addEventListener('click',()=>copyLink('&run&app','اتنسخ رابط التطبيق 📱 — بيفتح برنامجك لوحده وبيشتغل فورًا'));
window.__barmejMakeHash=makeHash;
$('#exportBtn').addEventListener('click',async()=>{
  try{
    toast('بجهّز الملف… ⏳');
    const get=async u=>{ const r=await fetch(u); if(!r.ok) throw new Error(u); return r.text(); };
    const [html,css,lang,les,ide]=await Promise.all(['index.html','style.css','lang.js','lessons.js','ide.js'].map(get));
    const esc=s=>s.replace(/<\/script/gi,'<\\/script');
    const hash='#code='+encodeURIComponent(btoa(unescape(encodeURIComponent(code.value))))+'&run&app';
    let out=html.replace(/<link rel="stylesheet"[^>]*>/,()=>'<style>'+css+'</style>');
    out=out.replace(/<script src="lang\.js[^>]*><\/script>/,()=>'<script>if(!location.hash)location.hash='+JSON.stringify(hash)+'<\/script>\n<script>'+esc(lang)+'<\/script>');
    out=out.replace(/<script src="lessons\.js[^>]*><\/script>/,()=>'<script>'+esc(les)+'<\/script>');
    out=out.replace(/<script src="ide\.js[^>]*><\/script>/,()=>'<script>'+esc(ide)+'<\/script>');
    const name=(currentProgram||'برنامجي').replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g,'_');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([out],{type:'text/html'})); a.download=name+'.html';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    toast('نزل «'+name+'.html» 📦 — افتحه في أي متصفح، شغال أوفلاين وبدون إنترنت');
  }catch(e){ toast('معرفتش أجهّز الملف (لازم تفتح الصفحة من الموقع مش من ملف)'); }
});
function enterAppMode(){ document.body.classList.add('app-mode'); document.title=(code.value.match(/^#\s*(.+)/)||[0,'برمِج'])[1].slice(0,40)+' — برمِج'; }
$('#appRerun').addEventListener('click',()=>runProgram());
$('#appEdit').addEventListener('click',()=>{ document.body.classList.remove('app-mode'); try{ history.replaceState(null,'',location.pathname); }catch(e){} });
let zPending=null;
function loadFromHash(){
  const z=location.hash.match(/#z=([^&]*)/);
  if(z&&typeof DecompressionStream!=='undefined'){
    zPending=zPipe(b64u.dec(z[1]),DecompressionStream).then(u8=>{ code.value=new TextDecoder().decode(u8); renderHL(); toast('اتحمل كود مشترك ✔'); }).catch(()=>{ toast('الرابط ده مش سليم'); });
    return true;
  }
  const m=location.hash.match(/#code=([^&]*)/);
  if(m){
    try{ code.value=decodeURIComponent(escape(atob(decodeURIComponent(m[1]))));
      toast('اتحمل كود مشترك ✔'); return true;
    }catch(e){}
  }
  return false;
}

/* --- theme --- */
$('#themeBtn').addEventListener('click',()=>{ try{ achCheck({theme:true}); }catch(e){}
  document.body.classList.toggle('light');
  try{ localStorage.setItem('barmej-theme',document.body.classList.contains('light')?'light':'dark'); }catch(e){}
});
try{ if(localStorage.getItem('barmej-theme')==='light') document.body.classList.add('light'); }catch(e){}

/* --- tabs --- */
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===t));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  $('#panel-'+t.dataset.panel).classList.add('active');
}));

/* --- export canvas --- */
$('#saveTurtle').addEventListener('click',()=>{
  try{
    const a=document.createElement('a');
    a.download='رسمة-برمج.png'; a.href=tc.toDataURL('image/png'); a.click();
    toast('اتحفظت الصورة 💾');
  }catch(e){ toast('معرفتش أحفظ الصورة'); }
});

/* --- programs drawer --- */
const drawer=$('#programsDrawer'), programsList=$('#programsList');
let currentProgram=localStorage.getItem('barmej-current')||'برنامجي';
function getPrograms(){ try{ return JSON.parse(localStorage.getItem('barmej-programs')||'{}'); }catch(e){ return {}; } }
function savePrograms(p){ try{ localStorage.setItem('barmej-programs',JSON.stringify(p)); }catch(e){} }
function stashCurrent(){ const p=getPrograms(); p[currentProgram]=code.value; savePrograms(p); }
function renderPrograms(){
  const p=getPrograms(); programsList.innerHTML='';
  const names=Object.keys(p);
  if(!names.length){ programsList.innerHTML='<div style="padding:14px;color:var(--muted)">لسه مفيش برامج محفوظة — الكود الحالي بيتحفظ لوحده.</div>'; }
  names.forEach(n=>{
    const d=document.createElement('div');
    d.className='program-item'+(n===currentProgram?' active':'');
    d.innerHTML='<span></span>'+(names.length>1?'<button class="del" title="امسح">✕</button>':'<span></span>'); d.firstChild.textContent=n;
    d.querySelector('.del')?.addEventListener('click',ev=>{ ev.stopPropagation();
      const pp=getPrograms(); delete pp[n]; savePrograms(pp);
      if(n===currentProgram){ currentProgram=Object.keys(pp)[0]||'برنامجي'; code.value=pp[currentProgram]||''; $('#fileName').textContent=currentProgram+'.برمج'; renderHL(); }
      renderPrograms(); });
    d.addEventListener('click',()=>{
      stashCurrent();
      currentProgram=n; const pp=getPrograms();
      code.value=pp[n]||''; $('#fileName').textContent=n+'.برمج';
      try{localStorage.setItem('barmej-current',n);}catch(e){}
      renderHL(); renderPrograms(); drawer.classList.add('hidden');
    });
    programsList.appendChild(d);
  });
}
$('#programsBtn').addEventListener('click',()=>{ stashCurrent(); renderPrograms(); drawer.classList.toggle('hidden'); });
$('#closeDrawer').addEventListener('click',()=>drawer.classList.add('hidden'));
$('#newProgramBtn').addEventListener('click',()=>{
  const name=window.prompt('اسم البرنامج الجديد؟');
  if(!name) return;
  stashCurrent();
  currentProgram=name.trim();
  const p=getPrograms(); p[currentProgram]=p[currentProgram]||'اطبع "أهلاً من '+currentProgram+'"';
  savePrograms(p);
  code.value=p[currentProgram];
  $('#fileName').textContent=currentProgram+'.برمج';
  try{localStorage.setItem('barmej-current',currentProgram);}catch(e){}
  renderHL(); toast('برنامج جديد: '+currentProgram);
});

/* --- file import/export --- */
$('#downloadBtn').addEventListener('click',()=>{
  try{
    const blob=new Blob([code.value],{type:'text/plain;charset=utf-8'});
    const a=document.createElement('a');
    a.download=currentProgram+'.برمج.txt'; a.href=URL.createObjectURL(blob); a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),3000);
    toast('اتنزّل البرنامج كملف 💾');
  }catch(e){ toast('معرفتش أنزّل الملف'); }
});
$('#importBtn').addEventListener('click',()=>$('#importFile').click());
$('#importFile').addEventListener('change',ev=>{
  const f=ev.target.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{ code.value=String(rd.result||''); renderHL(); autosave(); toast('اتحمل الملف ✔'); };
  rd.onerror=()=>toast('معرفتش أقرا الملف');
  rd.readAsText(f);
  ev.target.value='';
});

/* --- toast --- */
let toastTimer=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2600); }

/* --- lessons --- */
const lessonList=$('#lessonList'); let currentLesson=0;
const doneLessons=new Set(JSON.parse(localStorage.getItem('barmej-lessons-done')||'[]'));
function renderLessonList(){
  lessonList.innerHTML='';
  BARMEJ_LESSONS.forEach((l,i)=>{
    const d=document.createElement('div');
    d.className='lesson-item'+(i===currentLesson?' active':'');
    d.innerHTML='<span class="done-mark">'+(doneLessons.has(l.id)?'✔':'○')+'</span><span>'+l.id+'. '+l.title+'</span>';
    d.addEventListener('click',()=>{ currentLesson=i; renderLesson(); });
    lessonList.appendChild(d);
  });
}
function renderLesson(){
  const l=BARMEJ_LESSONS[currentLesson];
  $('#lessonTitle').textContent=l.id+'. '+l.title;
  $('#lessonText').innerHTML=l.text;
  $('#lessonResult').className='lesson-result'; $('#lessonResult').textContent='';
  renderLessonList();
}
$('#tryLesson').addEventListener('click',()=>{
  code.value=BARMEJ_LESSONS[currentLesson].starter; renderHL(); autosave();
  document.querySelector('.tab[data-panel="editor"]').click(); toast('اتحط الكود في المحرر — دوس شغّل');
});
$('#checkLesson').addEventListener('click',()=>{
  const l=BARMEJ_LESSONS[currentLesson];
  const out=[]; const ops=[];
  const io={print:s=>out.push(String(s)),ask:()=> '5',draw:o=>{ops.push(o); turtleHandle(o);}};
  turtle=null; turtlePanel.classList.add('hidden'); $('#errBar').classList.add('hidden');
  const r=Barmej.runSource(code.value,io);
  const res=$('#lessonResult');
  if(!r.ok){ res.className='lesson-result bad'; res.textContent='فيه خطأ في الكود: '+r.error+(r.line?' (سطر '+r.line+')':''); return; }
  const problem=l.check(out,ops);
  if(problem){ res.className='lesson-result bad'; res.textContent='لسه مش مظبوط: '+problem; }
  else{ res.className='lesson-result ok'; res.textContent='ممتاز! الحل صح 🎉';
    doneLessons.add(l.id);
    try{localStorage.setItem('barmej-lessons-done',JSON.stringify([...doneLessons]));}catch(e){}
    renderLessonList(); try{ achCheck(); }catch(e){}
    if(currentLesson<BARMEJ_LESSONS.length-1) setTimeout(()=>{ currentLesson++; renderLesson(); },1400);
  }
});

/* --- challenges --- */
const challengeList=$('#challengeList'); let currentChallenge=0;
const doneChallenges=new Set(JSON.parse(localStorage.getItem('barmej-challenges-done')||'[]'));
/* --- daily challenge --- */
function dayKey(d){ d=d||new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dailyState(){ try{ const s=JSON.parse(localStorage.getItem('barmej-daily')||'{}'); return {last:s.last||'',streak:s.streak||0,best:s.best||0}; }catch(e){ return {last:'',streak:0,best:0}; } }
function dailyIndex(){ const d=new Date(); const n=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000); return n%BARMEJ_CHALLENGES.length; }
function dailyStreakNow(){ const s=dailyState(), t=dayKey(), y=dayKey(new Date(Date.now()-864e5)); return (s.last===t||s.last===y)? s.streak : 0; }
function recordDaily(){ const s=dailyState(), t=dayKey(); if(s.last===t) return false;
  const y=dayKey(new Date(Date.now()-864e5)); s.streak=(s.last===y)? s.streak+1 : 1; s.best=Math.max(s.best,s.streak); s.last=t;
  try{ localStorage.setItem('barmej-daily',JSON.stringify(s)); }catch(e){} return true; }
function renderDaily(){ const el=document.createElement('div'); el.id='dailyBanner'; el.className='daily-banner'; const i=dailyIndex(), s=dailyState(), done=s.last===dayKey(), st=dailyStreakNow();
  el.innerHTML='<div class="daily-top"><b>⭐ تحدي اليوم</b><span class="daily-streak">🔥 '+st+' يوم متتالي</span></div><div class="daily-title">'+(i+1)+'. '+BARMEJ_CHALLENGES[i].title+'</div><button class="run small" id="dailyGo">'+(done?'✔ اتحل النهارده — اعمله تاني':'▶ ابدأ تحدي اليوم')+'</button>';
  el.querySelector('#dailyGo').addEventListener('click',()=>{ currentChallenge=i; renderChallenge(); }); challengeList.appendChild(el); }
function renderChallengeList(){
  challengeList.innerHTML='';
  renderDaily();
  BARMEJ_CHALLENGES.forEach((l,i)=>{
    const d=document.createElement('div');
    d.className='lesson-item'+(i===currentChallenge?' active':'');
    d.innerHTML='<span class="done-mark">'+(doneChallenges.has(l.id)?'✔':'○')+'</span><span>'+(i+1)+'. '+l.title+'</span>';
    d.addEventListener('click',()=>{ currentChallenge=i; renderChallenge(); });
    challengeList.appendChild(d);
  });
}
function renderChallenge(){
  const l=BARMEJ_CHALLENGES[currentChallenge];
  $('#challengeTitle').textContent=(currentChallenge+1)+'. '+l.title;
  $('#challengeText').innerHTML=l.text;
  $('#challengeResult').className='lesson-result'; $('#challengeResult').textContent='';
  renderChallengeList();
}
$('#tryChallenge').addEventListener('click',()=>{
  code.value=BARMEJ_CHALLENGES[currentChallenge].starter; renderHL(); autosave();
  document.querySelector('.tab[data-panel="editor"]').click(); toast('اتحط التحدي في المحرر');
});
$('#checkChallenge').addEventListener('click',()=>{
  const l=BARMEJ_CHALLENGES[currentChallenge];
  const out=[]; const ops=[];
  const io={print:s=>out.push(String(s)),ask:()=> '5',draw:o=>{ops.push(o); turtleHandle(o);}};
  turtle=null; turtlePanel.classList.add('hidden');
  const r=Barmej.runSource(code.value,io);
  const res=$('#challengeResult');
  if(!r.ok){ res.className='lesson-result bad'; res.textContent='فيه خطأ في الكود: '+r.error+(r.line?' (سطر '+r.line+')':''); return; }
  const problem=l.check(out,ops);
  if(problem){ res.className='lesson-result bad'; res.textContent='لسه مش مظبوط: '+problem; }
  else{ res.className='lesson-result ok'; res.textContent='تحدي محلول! 🏆';
    doneChallenges.add(l.id); let dailyNew=false; if(currentChallenge===dailyIndex()) dailyNew=recordDaily(); if(dailyNew) res.textContent='تحدي اليوم اتحل! ⭐🔥 سلسلتك: '+dailyStreakNow()+' يوم'; try{ setTimeout(()=>achCheck({streak:dailyStreakNow()}),0); }catch(e){}
    try{localStorage.setItem('barmej-challenges-done',JSON.stringify([...doneChallenges]));}catch(e){}
    renderChallengeList(); }
});

const _normAr=s=>(s||'').toLowerCase().replace(/[\u0640\u064B-\u065F]/g,'').replace(/[\u0623\u0625\u0622]/g,'\u0627').replace(/\u0649/g,'\u064A').replace(/\u0629/g,'\u0647');
/* --- examples --- */
const exList=$('#exampleList');
const EX_CATS=[['all','الكل',()=>true],['fav','⭐ مفضلتي',(e,k)=>favSet.has(k)],['game','🎮 ألعاب',e=>/(مفتاح|ماوس_|نقرة)\s*\(/.test(e.code)||/ثعبان|لعبة/.test(e.title+e.desc)],['draw','🎨 رسم',e=>/(قدم|اذهب|دائرة|نقطة|رمز|بكسلات)\s*\(/.test(e.code)],['music','🎵 موسيقى',e=>/لحن\s*\(/.test(e.code)||/موسيق|نغم|عيد ميلاد|عازف|بيانو/.test(e.title+e.desc)],['learn','📚 تعلّم',e=>!/(قدم|اذهب|دائرة|نقطة|رمز|بكسلات|لحن|نغمة|صوت|مفتاح|ماوس_|نقرة)\s*\(/.test(e.code)]];
let favSet=new Set(); try{ favSet=new Set(JSON.parse(localStorage.getItem('barmej-fav-ex')||'[]')); }catch(e){}
let exCat='all'; const exCards=[];
function saveFav(){ try{ localStorage.setItem('barmej-fav-ex',JSON.stringify([...favSet])); }catch(e){} }
BARMEJ_EXAMPLES.forEach(ex=>{
  const c=document.createElement('div'); c.className='example-card';
  c.innerHTML='<button class="fav-btn" title="مفضلة">☆</button><h3>'+ex.title+'</h3><p>'+ex.desc+'</p><div class="card-actions"><button class="run small">▶ شغّلها فورًا</button></div>';
  function load(){ code.value=ex.code; renderHL(); autosave();
    document.querySelector('.tab[data-panel="editor"]').click(); }
  c.addEventListener('click',()=>{ load(); toast('اتحمل مثال «'+ex.title+'» — دوس شغّل'); });
  c.querySelector('.run').addEventListener('click',ev=>{ ev.stopPropagation(); load(); runProgram(); });
  const fb=c.querySelector('.fav-btn');
  fb.addEventListener('click',ev=>{ ev.stopPropagation(); if(favSet.has(ex.title)) favSet.delete(ex.title); else favSet.add(ex.title); saveFav(); fb.textContent=favSet.has(ex.title)?'★':'☆'; fb.classList.toggle('on',favSet.has(ex.title)); filterExamples(); });
  fb.textContent=favSet.has(ex.title)?'★':'☆'; fb.classList.toggle('on',favSet.has(ex.title));
  exList.appendChild(c); exCards.push({ex,c,load});
});
function filterExamples(){ const q=_normAr($('#exSearch').value.trim()); const cat=EX_CATS.find(x=>x[0]===exCat); let n=0;
  exCards.forEach(o=>{ const ok=cat[2](o.ex,o.ex.title)&&(!q||_normAr(o.ex.title+' '+o.ex.desc).includes(q)); o.c.style.display=ok?'':'none'; if(ok) n++; });
  $('#exCount').textContent=n+' مثال'; }
EX_CATS.forEach(([k,label])=>{ const b=document.createElement('button'); b.className='chip'+(k==='all'?' on':''); b.textContent=label; b.dataset.k=k;
  b.addEventListener('click',()=>{ exCat=k; $('#exChips').querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b)); filterExamples(); }); $('#exChips').appendChild(b); });
$('#exSearch').addEventListener('input',filterExamples);
$('#exRandom').addEventListener('click',()=>{ const o=exCards[Math.floor(Math.random()*exCards.length)]; o.load(); toast('🎲 «'+o.ex.title+'» — دوس شغّل'); });
filterExamples();

/* --- docs --- */
$('#docsSearch').addEventListener('input',ev=>{
  const q=_normAr(ev.target.value.trim());
  const root=$('#docsContent');
  const kids=[...root.children];
  kids.forEach(el=>{ el.style.display=''; });
  root.querySelectorAll('tr').forEach(tr=>{ tr.style.display=''; });
  if(!q) return;
  /* قسّم الدليل لأقسام: كل h2 مع اللي بعده لحد h2 التاني، والمقدمة قسم لوحدها */
  const sections=[]; let cur=[];
  kids.forEach(el=>{ if(el.tagName==='H2'){ if(cur.length) sections.push(cur); cur=[el]; } else cur.push(el); });
  if(cur.length) sections.push(cur);
  sections.forEach(sec=>{
    const head=sec[0].tagName==='H2'?_normAr(sec[0].textContent):'';
    const whole=sec.some(el=>_normAr(el.textContent).includes(q));
    if(!whole){ sec.forEach(el=>{ el.style.display='none'; }); return; }
    if(head.includes(q)) return; /* العنوان نفسه مطابق: اعرض القسم كله */
    sec.forEach(el=>{
      if(el.tagName==='TABLE'){
        const trs=[...el.querySelectorAll('tr')]; let any=false;
        trs.forEach(tr=>{ const m=_normAr(tr.textContent).includes(q); tr.style.display=m?'':'none'; if(m) any=true; });
        el.style.display=any?'':'none';
      }
    });
  });
});

$('#docsContent').innerHTML=`
<h1>دليل لغة برمِج</h1>
<p>برمِج لغة برمجة عربية كاملة بتشتغل في المتصفح. الأرقام العربية (١٢٣) والإنجليزية (123) مقبولة، والفاصلة العربية (،) والإنجليزية (,) مقبولة.</p>

<h2>الطباعة</h2>
<pre>اطبع "أهلاً"        # أو: اكتب "أهلاً"
اطبع ١ + ٢           # النتيجة: 3</pre>

<h2>المتغيرات</h2>
<pre>خلي اسم = "محمد"    # أو: متغير اسم = "محمد"
اسم = "علي"          # تعديل</pre>

<h2>الشروط</h2>
<pre>لو س &gt; ١٠ {
  اطبع "كبير"
} وإلا لو س == ١٠ {
  اطبع "عشرة بالظبط"
} وإلا {
  اطبع "صغير"
}</pre>

<h2>الحلقات</h2>
<pre>كرر ٥ { اطبع عداد }          # 1 2 3 4 5
كرر ٣، م { اطبع م }          # عداد باسمك
طالما س &lt; ١٠ { س = س + ١ }   # بشرط
لكل عنصر في [١، ٢، ٣] { اطبع عنصر }
قف      # يخرج من الحلقة
كمل     # يكمل للفة اللي بعدها</pre>

<h2>الدوال</h2>
<pre>دالة جمع(أ، ب) {
  ارجع أ + ب
}
اطبع جمع(٣، ٤)</pre>

<h2>القوائم والقواميس</h2>
<pre>خلي ق = [١، ٢، ٣]
أضف(ق، ٤)          # إضافة
اطبع ق[٠]           # أول عنصر (الفهرس من صفر)
اطبع ق[-١]          # آخر عنصر
ق[١] = ٩٩           # تعديل

خلي ش = {اسم: "علي"، عمر: ٣٠}
اطبع ش.اسم          # أو ش["اسم"]
ش.مدينة = "الإسكندرية"</pre>

<h2>المدخلات</h2>
<pre>خلي اسم = اسأل("اسمك إيه؟")
خلي عمر = رقم(اسأل("عمرك؟"))   # حوّل النص لرقم</pre>

<h2>التعامل مع الأخطاء</h2>
<pre>جرّب {
  اطبع ١ / ٠
} لو_خطأ سبب {
  اطبع "حصل خطأ: " + سبب
}</pre>
<p>لو حصل خطأ جوه كتلة <code>جرّب</code> البرنامج مش بيقف، وبينفذ كتلة <code>لو_خطأ</code> ورسالة الخطأ بتتحط في المتغير اللي بعدها.</p>

<h2>الأصناف (برمجة كائنية) 🧱</h2>
<p>الصنف قالب للكائنات. <code>بناء</code> بتتنفذ عند الإنشاء بـ <code>جديد</code>، و<code>هذا</code> هو الكائن نفسه:</p>
<pre>صنف لاعب {
  دالة بناء(اسم) { هذا.اسم = اسم
    هذا.نقاط = ٠ }
  دالة سجّل() { هذا.نقاط = هذا.نقاط + ١ }
}
خلي ل = جديد لاعب("سارة")
ل.سجّل()
اطبع ل.نقاط</pre>
<p><b>الوراثة:</b> <code>صنف ساحر يرث مقاتل { ... }</code> — الابن بياخد دوال الأب، وتقدر تغيّرها، وتنادي الأصلية بـ <code>الأب.اسم()</code> (حتى <code>الأب.بناء(...)</code>). <code>نوع(ل)</code> بترجّع اسم الصنف.</p>
<h2>دوال بتاخد دوال 🧩</h2>
<p>الدالة قيمة عادية: تتحط في متغير، وتتبعت، وتترجع. وفي دالة بدون اسم: <code>دالة(س): س * ٢</code> (سطر واحد) أو <code>دالة(س) { ... }</code>.</p>
<table><tr><td><code>خريطة(ق، د)</code></td><td>قائمة جديدة فيها د(عنصر) لكل عنصر</td></tr>
<tr><td><code>صفّي(ق، د)</code></td><td>العناصر اللي د ترجّع لها صح</td></tr>
<tr><td><code>اختزل(ق، د، بداية)</code></td><td>تجمّع القائمة: د(المتراكم، العنصر)</td></tr>
<tr><td><code>جد(ق، د)</code></td><td>أول عنصر يحقق الشرط (أو فراغ)</td></tr>
<tr><td><code>أي(ق، د)</code> <code>كل(ق، د)</code></td><td>هل في عنصر / هل كل العناصر تحقق الشرط</td></tr>
<tr><td><code>رتب_حسب(ق، د، "تنازلي")</code></td><td>ترتيب حسب القيمة اللي د بترجّعها</td></tr></table>
<pre>خلي ع = دالة(ن) { ارجع دالة(م): م + ن }
اطبع ع(١٠)(٥)   # ١٥</pre>
<h2>الماوس واللمس 🖱️</h2>
<p>برنامجك يقدر يتفاعل مع الضغط على اللوحة (بالماوس أو بالإصبع على الموبايل):</p>
<table><tr><td><code>نقرة()</code></td><td>لو في ضغطة جديدة بترجّع [س، ص] (مرة واحدة لكل ضغطة)، وإلا فراغ</td></tr>
<tr><td><code>لحن("دو ري مي+ صول:2 _"، ٣٠٠)</code></td><td>يعزف لحن كامل: + أعلى، - أوطى، :٢ نوتة طويلة، _ سكوت. الرقم = مللي ثانية للنوتة</td></tr>
<tr><td><code>احفظ(اسم، قيمة)</code></td><td>يحفظ رقم أو نص أو قائمة في المتصفح (للأرقام القياسية)، وتفضل بعد ما تقفل الصفحة</td></tr>\n<tr><td><code>استرجع(اسم، افتراضي)</code></td><td>يرجّع القيمة المحفوظة، أو القيمة الافتراضية لو مفيش حاجة محفوظة</td></tr>\n<tr><td><code>خريطة_بلاط(صفوف، حجم)</code></td><td>يرسم عالم من بلاط في منتصف اللوحة: # = جدار، أرقام ١-٩ ألوان، نقطة = فاضي</td></tr>\n<tr><td><code>بلاطة_عند(صفوف، حجم، س، ص)</code></td><td>يرجّع الحرف اللي في الخريطة عند النقطة (للتصادم مع الجدران). برا الخريطة = #</td></tr>\n<tr><td><code>بكسلات(شكل، حجم)</code></td><td>يرسم شخصية من قائمة صفوف نصية (٠-٩ ألوان، نقطة = شفاف) مكان القلم. ارسمها بزر 🎨</td></tr>
<tr><td><code>رمز("🚀"، حجم، زاوية)</code></td><td>يرسم إيموجي (شخصية/سبرايت) مكان القلم، وممكن تلفّه بزاوية</td></tr>
<tr><td><code>خلفية("لون")</code></td><td>يملا اللوحة كلها بلون (أول سطر في كل إطار لعبة)</td></tr>
<tr><td><code>مسافة(س١،ص١،س٢،ص٢)</code></td><td>المسافة بين نقطتين</td></tr>
<tr><td><code>تصادم(س١،ص١،نق١،س٢،ص٢،نق٢)</code></td><td>صح لو دايرتين لمسوا بعض</td></tr>
<tr><td><code>داخل(س،ص،مس،مص،عرض،طول)</code></td><td>صح لو النقطة جوه المستطيل</td></tr>
<tr><td><code>زاوية(س١،ص١،س٢،ص٢)</code></td><td>الاتجاه من نقطة لنقطة بالدرجات (يتوافق مع «يمين»)</td></tr>
<tr><td><code>ماوس_س()</code> <code>ماوس_ص()</code></td><td>مكان المؤشر دلوقتي على اللوحة</td></tr>
<tr><td><code>ماوس_مضغوط()</code></td><td>صح لو الزر أو الإصبع نازل</td></tr></table>
<p>الإحداثيات نفس إحداثيات القلم: المنتصف (٠، ٠). جرّب أمثلة «اضرب الهدف» و«لوحة الرسم».</p>
<h2>المكتبات: استورد 📚</h2>
<p><code>استورد "اسم"</code> بتجيب دوال جاهزة لبرنامجك. المكتبات الجاهزة مكتوبة بلغة برمج نفسها:</p>
<table><tr><td><code>"رياضيات"</code></td><td>مضروب · قاسم_مشترك · أولي · فيبوناتشي · متوسط · وسيط</td></tr>
<tr><td><code>"نصوص"</code></td><td>عدد_الكلمات · متناظر · أطول_كلمة · تكرار_الحروف</td></tr>
<tr><td><code>"قوائم"</code></td><td>مجموعات · تسطيح · تقاطع · اتحاد</td></tr></table>
<pre>استورد "رياضيات"
اطبع مضروب(٥)    # ١٢٠
اطبع أولي(٩٧)     # صحيح</pre>
<p><b>مكتبتك أنت:</b> احفظ برنامج في «📂 برامجي» باسم (مثلاً <code>أدواتي</code>) وبعدين في أي برنامج تاني اكتب <code>استورد "أدواتي"</code> وهتاخد كل دوالّه. (انتبه: كود البرنامج بيتنفذ كله وقت الاستيراد.)</p>
<h2>الوقت والألعاب</h2>
<pre>استنى(١٠٠٠)        # يوقف التنفيذ ثانية (بالمللي ثانية)
خلي م = مفتاح()    # المفتاح المدوس عليه دلوقتي: يمين يسار فوق تحت مسافة…</pre>
<p>مع <code>طالما</code> + <code>استنى</code> + <code>مفتاح</code> تقدر تعمل ألعاب حية! جرّب مثال «لعبة: حرّك المربع».</p>

<h2>التنفيذ خطوة بخطوة 👣</h2>
<p>زر «خطوة بخطوة» جنب «شغّل» بينفذ برنامجك سطر سطر: السطر الحالي بينور بالأخضر، وكل المتغيرات بقيمها بتظهر في لوحة «المتغيرات دلوقتي». مفيد جدًا لو برنامجك بيعمل حاجة مش متوقعة وعايز تفهم بيحصل إيه.</p>

<h2>العمليات</h2>
<table>
<tr><th>العملية</th><th>الرمز</th></tr>
<tr><td>جمع، طرح، ضرب، قسمة</td><td>+ - * /</td></tr>
<tr><td>باقي القسمة، القوة</td><td>% ^</td></tr>
<tr><td>مقارنة</td><td>== != &lt; &gt; &lt;= &gt;=</td></tr>
<tr><td>منطق</td><td>و ، أو ، مش</td></tr>
<tr><td>قيم ثابتة</td><td>صحيح ، غلط ، فراغ</td></tr>
</table>

<h2>الدوال الجاهزة</h2>
<table>
<tr><th>الدالة</th><th>وظيفتها</th></tr>
<tr><td><code>طول(س)</code></td><td>طول نص أو قائمة</td></tr>
<tr><td><code>أضف(ق، عنصر)</code></td><td>يضيف لآخر القائمة</td></tr>
<tr><td><code>احذف(ق، فهرس)</code></td><td>يحذف عنصر ويرجعه</td></tr>
<tr><td><code>يحتوي(ق، عنصر)</code></td><td>هل القائمة/النص فيه العنصر؟</td></tr>
<tr><td><code>عشوائي(أ، ب)</code></td><td>رقم عشوائي بين أ وب، أو عنصر عشوائي من قائمة</td></tr>
<tr><td><code>قرب(س، خانات)</code></td><td>تقريب</td></tr>
<tr><td><code>جذر(س)</code> <code>مطلق(س)</code></td><td>رياضيات</td></tr>
<tr><td><code>جيب(ز)</code> <code>جتا(ز)</code> <code>ظا(ز)</code></td><td>دوال مثلثية بالدرجات — وثابت <code>باي</code> جاهز</td></tr>
<tr><td><code>مدى(ن)</code> <code>مدى(أ، ب)</code></td><td>قائمة أرقام من ١ لـ ن، أو من أ لـ ب</td></tr>
<tr><td><code>قطع(ق، من، ل)</code></td><td>جزء من قائمة أو نص</td></tr>
<tr><td><code>أكبر(...)</code> <code>أصغر(...)</code></td><td>أكبر/أصغر قيمة</td></tr>
<tr><td><code>نص(س)</code> <code>رقم(س)</code></td><td>تحويل الأنواع</td></tr>
<tr><td><code>نوع(س)</code></td><td>نوع القيمة: رقم، نص، قائمة، قاموس…</td></tr>
<tr><td><code>جزء(نص، من، ل)</code></td><td>قطعة من النص</td></tr>
<tr><td><code>فصل(نص، فاصل)</code></td><td>يقسم النص لقائمة</td></tr>
<tr><td><code>وصل(ق، فاصل)</code></td><td>يلزق القائمة في نص</td></tr>
<tr><td><code>حروف(نص)</code></td><td>قائمة حروف</td></tr>
<tr><td><code>أول(ق)</code> <code>آخر(ق)</code></td><td>أول أو آخر عنصر في قائمة (أو حرف في نص)</td></tr>
<tr><td><code>فريد(ق)</code></td><td>قائمة بدون تكرار</td></tr>
<tr><td><code>عدد_مرات(ق، س)</code></td><td>كام مرة ظهر س في القائمة أو النص</td></tr>
<tr><td><code>مفاتيح(قاموس)</code> <code>قيم(قاموس)</code></td><td>مفاتيح أو قيم القاموس</td></tr>
<tr><td><code>اسأل(سؤال)</code></td><td>يسأل المستخدم ويرجع إجابته</td></tr>
<tr><td><code>اختار(سؤال، قائمة)</code></td><td>يعرض أزرار اختيار ويرجع اللي اتاختار</td></tr>
<tr><td><code>ساعات()</code> <code>دقائق()</code> <code>ثواني()</code></td><td>الساعة والدقائق والثواني الحالية من ساعة الجهاز</td></tr>
<tr><td><code>نغمة("دو")</code></td><td>يعزف نغمة موسيقية: دو ري مي فا صول لا سي دو_عالية</td></tr>
<tr><td><code>صوت(تردد، مدة)</code></td><td>صوت بتردد ومدة معينين (للمؤثرات)</td></tr>
<tr><td><code>استنى(مللي)</code></td><td>يوقف التنفيذ مؤقتًا (للألعاب والعدادات)</td></tr>
<tr><td><code>مفتاح()</code></td><td>اسم المفتاح المدوس عليه حاليًا (أو نص فاضي)</td></tr>
<tr><td><code>امسح()</code></td><td>يمسح شاشة الخرج</td></tr>
</table>

<h2>الرسم بالقلم</h2>
<p>أوامر بترسم على لوحة الرسم:</p>
<table>
<tr><th>الأمر</th><th>وظيفته</th></tr>
<tr><td><code>قدم(مسافة)</code> <code>ورا(مسافة)</code></td><td>يمشي القلم قدّام أو ورا</td></tr>
<tr><td><code>يمين(زاوية)</code> <code>شمال(زاوية)</code></td><td>يلف بالدرجات</td></tr>
<tr><td><code>لون("أحمر")</code></td><td>لون القلم — أسماء عربية أو كود لون</td></tr>
<tr><td><code>سمك(ن)</code></td><td>سمك الخط</td></tr>
<tr><td><code>ارفع()</code> <code>انزل()</code></td><td>رفع/إنزال القلم (مش بيرسم وهو مرفوع)</td></tr>
<tr><td><code>اذهب(س، ص)</code></td><td>ينتقل لنقطة (منتصف اللوحة = ٠، ٠)</td></tr>
<tr><td><code>دائرة(نصف)</code> <code>نقطة(حجم)</code></td><td>يرسم دائرة أو نقطة</td></tr>
<tr><td><code>امسح_اللوحة()</code></td><td>يمسح الرسم</td></tr>
</table>
<p>الألوان المتاحة بالعربي: أحمر، أزرق، أخضر، أصفر، أسود، أبيض، برتقالي، بنفسجي، وردي، رمادي، سماوي، بني، ذهبي.</p>

<h2>الحفظ والاسترجاع 💾</h2>
<p><code>احفظ(اسم، قيمة)</code> بتخزّن رقم أو نص أو قائمة في متصفحك، و<code>استرجع(اسم، افتراضي)</code> بترجعها حتى بعد ما تقفل الصفحة. لو مفيش حاجة محفوظة بترجع القيمة الافتراضية.</p>
<pre>خلي أفضل = استرجع("نتيجتي"، ٠)
لو نقاط &gt; أفضل { احفظ("نتيجتي"، نقاط) }</pre>

<h2>الخرائط والبلاط 🧱</h2>
<p>الخريطة قائمة صفوف نصية: <code>#</code> جدار و<code>.</code> أرض (وأي رمز تاني تفسّره بنفسك). <code>خريطة_بلاط(خريطة، حجم)</code> بترسمها، و<code>بلاطة_عند(خريطة، حجم، س، ص)</code> بترجّع الحرف اللي في المكان ده (عشان تعرف لو خبطت في جدار). زر 🗺️ فوق بيفتح «محرر الخرائط» ترسم فيه خريطتك بالماوس وتنسخها كود.</p>
<pre>خلي خريطة = ["####"، "#..#"، "####"]
خريطة_بلاط(خريطة، ٤٠)
لو بلاطة_عند(خريطة، ٤٠، س، ص) == "#" { اطبع "جدار!" }</pre>

<h2>نقاط التوقف والمنقّح 🔴</h2>
<p>دوس على رقم أي سطر في المحرر عشان تحط نقطة توقف 🔴. بعدين «👣 خطوة بخطوة» وزر «🔴 لحد نقطة التوقف»: البرنامج بيقف عند السطر، وتشوف المتغيرات في اللوحة (اللي اتغيّر بيتلوّن).</p>

<h2>المشاركة والنسخ الاحتياطي 🔗</h2>
<p>زر «🔗 مشاركة» بيعمل رابط قصير فيه الكود (روابط <code>#z=</code> مضغوطة)، وزر «📱 تطبيق» بيعمل رابط يفتح اللعبة لوحدها على الموبايل. من «📂 برامجي» تقدر تعمل 💼 نسخة احتياطية لكل برامجك في ملف و📥 تستردها بعدين.</p>

<h2>تعليقات</h2>
<pre># تعليق في سطر واحد
// تعليق تاني</pre>

<h2>اختصارات</h2>
<p><b>📱 رابط تطبيق:</b> زر «📱 تطبيق» فوق بينسخ رابط بيفتح برنامجك لوحده بدون المحرر وبيشغّله فورًا. ابعته لأي حد، وهو يلعب لعبتك على موبايله من غير ما يشوف الكود (وفيه زر «✏️ افتح الكود» لو عايز يشوفه).</p>
<p><code>Ctrl + Shift + F</code> (أو زر «✨ نسّق») بينسّق الكود ويظبط المسافات. وبمجرد ما تكتب <code>{</code> أو <code>(</code> أو <code>"</code> المحرر بيقفلها لوحده، و<code>Enter</code> بيكمل المسافة تلقائيًا.</p>
<p><code>Ctrl + Enter</code> لتشغيل البرنامج من الكيبورد. الكود بيتحفظ تلقائيًا في متصفحك، وزر «مشاركة» بيعمل رابط فيه الكود.</p>
`;





/* --- guided tour --- */
(function(){
  const STEPS=[
    ['#code','📝 هنا بتكتب كودك بالعربي. بيكمّل الأقواس لوحده وبينسّق (✨) لما تحب.','editor'],
    ['#runBtn','▶ دوس «شغّل» والنتيجة بتظهر على الشمال. وفيه «خطوة بخطوة» لو عايز تتابع المتغيرات.','editor'],
    ['#histBtn','🕘 كل تشغيل بيتسجل كنسخة، فتقدر ترجع لأي نسخة قديمة.','editor'],
    ['.tab[data-panel="lessons"]','🎓 ٣٣ درس تفاعلي: بتقرا وتحل وبيتحقق من حلك لوحده.','editor'],
    ['.tab[data-panel="challenges"]','🧩 تحديات، وفوقها ⭐ تحدي اليوم بسلسلة أيام متتالية.','editor'],
    ['.tab[data-panel="examples"]','🎮 ٦١ مثال: ألعاب ومنصات وموسيقى ورسم. دوّر وضيف مفضلتك ⭐.','editor'],
    ['#spriteBtn','🎨 ارسم شخصيتك بالبكسل وحطها في الكود بضغطة.','editor'],
    ['#pianoBtn','🎹 لحّن على البيانو وانزّل اللحن كسطر كود.','editor'],
    ['#appLinkBtn','📱 رابط تطبيق بيفتح لعبتك لوحدها، و📦 ملف HTML بيشتغل أوفلاين. شاركها مع أصحابك!','editor']
  ];
  const ov=$('#tourOverlay'), card=$('#tourCard'); let i=0, hiEl=null;
  function clearHi(){ if(hiEl){ hiEl.classList.remove('tour-hi'); hiEl=null; } }
  function show(){ clearHi(); const s=STEPS[i];
    if(s[2]==='editor'&&!document.querySelector('#panel-editor.active')) document.querySelector('.tab[data-panel="editor"]').click();
    const el=document.querySelector(s[0]); if(el){ el.classList.add('tour-hi'); hiEl=el; try{ el.scrollIntoView({block:'center',inline:'center'}); }catch(e){} }
    $('#tourText').textContent=s[1]; $('#tourStep').textContent=(i+1)+' / '+STEPS.length;
    $('#tourPrev').style.visibility=i?'visible':'hidden'; $('#tourNext').textContent=i===STEPS.length-1?'تمام 👍':'التالي';
    const r=el?el.getBoundingClientRect():{left:0,top:0,width:0,height:0,bottom:60};
    const top=Math.min(window.innerHeight-170,Math.max(10,r.bottom+14));
    card.style.top=top+'px'; card.style.left=Math.max(10,Math.min(window.innerWidth-card.offsetWidth-10,r.left+r.width/2-card.offsetWidth/2))+'px'; }
  function start(){ i=0; ov.classList.remove('hidden'); show(); }
  function end(){ ov.classList.add('hidden'); clearHi(); try{ localStorage.setItem('barmej-toured','1'); }catch(e){} }
  $('#tourNext').addEventListener('click',()=>{ if(i>=STEPS.length-1) end(); else { i++; show(); } });
  $('#tourPrev').addEventListener('click',()=>{ if(i>0){ i--; show(); } });
  $('#tourSkip').addEventListener('click',end);
  $('#tourBtn').addEventListener('click',start);
  const wt=$('#welcomeTour'); if(wt) wt.addEventListener('click',()=>{ $('#welcomeModal').classList.add('hidden'); try{ localStorage.setItem('barmej-welcomed','1'); }catch(e){} start(); });
  window.addEventListener('keydown',e=>{ if(ov.classList.contains('hidden')) return; if(e.key==='Escape') end(); if(e.key==='ArrowLeft') $('#tourNext').click(); });
})();

/* --- backup / restore --- */
(function(){
  const KEYS=['barmej-programs','barmej-lessons-done','barmej-challenges-done','barmej-fav-ex','barmej-daily','barmej-hist'];
  $('#backupBtn').addEventListener('click',()=>{ stashCurrent();
    const data={app:'barmej',v:1,time:new Date().toISOString(),keys:{}};
    try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(KEYS.includes(k)||k.startsWith('barmej-data:')) data.keys[k]=localStorage.getItem(k); } }catch(e){}
    const n=Object.keys(getPrograms()).length;
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})); a.download='نسخة-برمج-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    toast('نزلت نسخة احتياطية فيها '+n+' برنامج 💼'); });
  $('#restoreBtn').addEventListener('click',()=>$('#restoreFile').click());
  $('#restoreFile').addEventListener('change',async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    try{ const d=JSON.parse(await f.text()); if(!d||d.app!=='barmej'||typeof d.keys!=='object') throw 0; const r=restoreData(d.keys); toast('اتسترجع '+r.progs+' برنامج جديد ✅'); renderPrograms(); }
    catch(err){ toast('الملف ده مش نسخة احتياطية من برمج'); } });
  function restoreData(keys){ let progs=0; const cur=getPrograms();
    try{ const inc=JSON.parse(keys['barmej-programs']||'{}'); for(const n of Object.keys(inc)){ if(typeof inc[n]!=='string') continue; const name=String(n).slice(0,60); if(cur[name]===undefined){ cur[name]=inc[n]; progs++; } else if(cur[name]!==inc[n]){ let m=name+' (مستورد)', i=2; while(cur[m]!==undefined) m=name+' (مستورد '+(i++)+')'; cur[m]=inc[n]; progs++; } } }catch(e){}
    savePrograms(cur);
    const union=(k,set)=>{ try{ const inc=JSON.parse(keys[k]||'[]'); if(Array.isArray(inc)){ inc.forEach(x=>set.add(x)); localStorage.setItem(k,JSON.stringify([...set])); } }catch(e){} };
    union('barmej-lessons-done',doneLessons); union('barmej-challenges-done',doneChallenges);
    try{ renderLessonList(); }catch(e){}
    for(const k of Object.keys(keys)){ if(k.startsWith('barmej-data:')&&typeof keys[k]==='string'){ try{ if(localStorage.getItem(k)===null) localStorage.setItem(k,keys[k]); }catch(e){} } }
    return {progs}; }
  window.__barmejRestore=restoreData;
})();
/* --- snippets --- */
(function(){
  const SN=[["🔁 حلقة عدّ", "كرر ٥ {\n  اطبع \"رقم \" + عداد\n}\n"], ["🔂 لكل عنصر", "لكل ع في [١، ٢، ٣] {\n  اطبع ع\n}\n"], ["❓ لو وإلا", "خلي س = ١٥\nلو س > ١٠ {\n  اطبع \"كبير\"\n} وإلا {\n  اطبع \"صغير\"\n}\n"], ["🧮 دالة", "دالة جمع(أ، ب) {\n  ارجع أ + ب\n}\nاطبع جمع(٢، ٣)\n"], ["📋 قائمة وعمليات", "خلي ق = [٣، ١، ٢]\nأضف(ق، ٤)\nاطبع رتّب(ق)\nاطبع مجموع(ق)\n"], ["📖 قاموس", "خلي شخص = {اسم: \"منى\"، عمر: ٢٥}\nاطبع شخص.اسم\n"], ["🛡️ معالجة أخطاء", "جرّب {\n  اطبع رقم(\"abc\")\n} لو_خطأ ح {\n  اطبع \"حصل خطأ: \" + ح\n}\n"], ["🧱 صنف", "صنف حيوان {\n  دالة بناء(اسم) {\n    هذا.اسم = اسم\n  }\n  دالة صوت() {\n    اطبع هذا.اسم + \" بيتكلم\"\n  }\n}\nخلي ح = جديد حيوان(\"قطة\")\nح.صوت()\n"], ["⚡ دالة بلا اسم", "خلي ضعف = دالة(س): س * ٢\nاطبع خريطة([١، ٢، ٣]، ضعف)\n"], ["🎨 ارسم مربع", "كرر ٤ {\n  قدم(١٠٠)\n  يمين(٩٠)\n}\n"], ["🎵 لحن", "لحن(\"دو ري مي فا صول لا سي دو+\"، ٣٠٠)\n"], ["🎮 قالب لعبة (حلقة إطارات)", "خلي س = ٠\nخلي ص = ٠\nطالما صح {\n  خلي م = مفتاح()\n  لو م == \"يمين\" { س = س + ٨ }\n  لو م == \"يسار\" { س = س - ٨ }\n  لو ماوس_مضغوط() { س = ماوس_س()؛ ص = ماوس_ص() }\n  خلفية(\"أسود\")\n  ارفع()\n  اذهب(س، ص)\n  رمز(\"🚀\"، ٥٠)\n  استنى(٢٠)\n}\n"], ["💥 تصادم", "خلي س = ٠\nخلي ص = ٠\nخلي هدف_س = ١٠\nخلي هدف_ص = ١٠\nلو تصادم(س، ص، ٢٥، هدف_س، هدف_ص، ٢٠) {\n  اطبع \"لمسته!\"\n}\n"], ["🖱️ ضغطة الماوس", "خلي ض = نقرة()\nلو ض != فراغ {\n  اطبع \"ضغطت على \" + ض[٠] + \"، \" + ض[١]\n}\n"], ["📦 استورد مكتبة", "استورد \"رياضيات\"\nاطبع مضروب(٥)\n"], ["🎲 عشوائي", "اطبع عشوائي(١، ١٠)\nخلي ألوان = [\"أحمر\"، \"أخضر\"، \"أزرق\"]\nاطبع ألوان[عشوائي(٠، ٢)]\n"], ["⏳ انتظار", "اطبع \"ثانية واحدة…\"\nاستنى(١٠٠٠)\nاطبع \"خلصت\"\n"],["💾 احفظ أحسن نتيجة", "خلي أفضل = استرجع(\"نتيجتي\"، ٠)\nخلي نقاط = ١٢\nلو نقاط > أفضل {\n  احفظ(\"نتيجتي\"، نقاط)\n  أفضل = نقاط\n}\nاطبع \"أفضل نتيجة: \" + أفضل\n"],["🧱 خريطة بلاط", "خلي خريطة = [\n  \"########\",\n  \"#......#\",\n  \"#..##..#\",\n  \"#......#\",\n  \"########\"\n]\nخلفية(\"#0f172a\")\nخريطة_بلاط(خريطة، ٤٠)\nاطبع بلاطة_عند(خريطة، ٤٠، ٠، ٠)\n"],["📋 قايمة قواميس", "خلي منتجات = [\n  {اسم: \"قلم\"، سعر: ١٠}،\n  {اسم: \"كتاب\"، سعر: ٣٠}\n]\nخلي مجموع = ٠\nلكل م في منتجات {\n  اطبع م.اسم + \" بـ \" + م.سعر\n  مجموع = مجموع + م.سعر\n}\nاطبع \"الإجمالي: \" + مجموع\n"],["🔁 دالة تنادي نفسها", "دالة مضروب(ن) {\n  لو ن <= ١ { ارجع ١ }\n  ارجع ن * مضروب(ن - ١)\n}\nاطبع مضروب(٥)\n"],["🖱️ لمسة على اللوحة", "خلي ضغط_قبل = غلط\nطالما صح {\n  خلي ضغط = ماوس_مضغوط()\n  لو ضغط و مش ضغط_قبل {\n    ارفع()\n    اذهب(ماوس_س()، ماوس_ص())\n    رمز(\"⭐\"، ٣٠)\n  }\n  ضغط_قبل = ضغط\n  استنى(٣٠)\n}\n"],["🏓 مضرب بالماوس", "خلي مضرب = ٠\nطالما صح {\n  مضرب = ماوس_س()\n  خلفية(\"#0b1020\")\n  ارفع()\n  لون(\"#e2e8f0\")\n  اذهب(مضرب، ٢٧٠)\n  مستطيل(١٤٠، ١٦)\n  املأ()\n  استنى(١٦)\n}\n"],["🦘 نط وجاذبية", "خلي ص = ٢٠٠\nخلي رص = ٠\nطالما صح {\n  رص = رص + ٠.٩\n  ص = ص + رص\n  لو ص > ٢٤٠ {\n    ص = ٢٤٠\n    رص = ٠\n    لو مفتاح() == \"فوق\" { رص = -١٦ }\n  }\n  خلفية(\"#1e1b4b\")\n  ارفع()\n  لون(\"#34d399\")\n  اذهب(٠، ص)\n  مستطيل(٣٠، ٤٠)\n  املأ()\n  استنى(١٦)\n}\n"],["✏️ ارسم بالسحب", "خلفية(\"#1e293b\")\nطالما صح {\n  لو ماوس_مضغوط() {\n    ارفع()\n    لون(\"#facc15\")\n    اذهب(ماوس_س()، ماوس_ص())\n    نقطة(١٠)\n  }\n  استنى(١٦)\n}\n"],["⚽ كورة بتنط", "خلي س = ٠\nخلي ص = ٠\nخلي رس = ٤\nخلي رص = ٠\nطالما صح {\n  رص = رص + ٠.٥\n  س = س + رس\n  ص = ص + رص\n  لو س > ٤٠٠ أو س < -٤٠٠ { رس = -رس }\n  لو ص > ٢٧٠ {\n    ص = ٢٧٠\n    رص = -رص * ٠.٨\n  }\n  خلفية(\"#0f172a\")\n  ارفع()\n  لون(\"#ef4444\")\n  اذهب(س، ص)\n  نقطة(٣٠)\n  استنى(١٦)\n}\n"],["🎉 مرحلة جديدة", "خلي مرحلة = ١\nخلي أكل = ٠\nدالة كلت() {\n  أكل = أكل + ١\n  لو أكل >= ٥ {\n    مرحلة = مرحلة + ١\n    أكل = ٠\n    اطبع \"🎉 المرحلة \" + مرحلة\n  }\n}\nكرر ١٠ { كلت() }\n"],["🔘 زر على اللوحة", "خلي زر = {س: ٠، ص: ٠، ع: ٢٠٠، ط: ٨٠}\nخلي عدد = ٠\nخلي قبل = غلط\nطالما صح {\n  خلي ض = ماوس_مضغوط()\n  لو ض و مش قبل و مطلق(ماوس_س() - زر.س) < زر.ع / ٢ و مطلق(ماوس_ص() - زر.ص) < زر.ط / ٢ {\n    عدد = عدد + ١\n  }\n  قبل = ض\n  خلفية(\"#0f172a\")\n  ارفع()\n  لون(\"#059669\")\n  اذهب(زر.س، زر.ص)\n  مستطيل(زر.ع، زر.ط)\n  املأ()\n  لون(\"#ffffff\")\n  نص_على_اللوحة(\"ضغطات: \" + عدد، ٢٤)\n  استنى(٣٠)\n}\n"]];
  const list=$('#snipList');
  function render(){ const q=_normAr($('#snipSearch').value.trim()); list.innerHTML='';
    SN.filter(s=>!q||_normAr(s[0]+' '+s[1]).includes(q)).forEach(s=>{
      const d=document.createElement('div'); d.className='snip-item'; d.innerHTML='<b></b><pre></pre>'; d.querySelector('b').textContent=s[0]; d.querySelector('pre').textContent=s[1];
      d.addEventListener('click',()=>{ $('#snipModal').classList.add('hidden'); const sp=code.selectionStart; const pre=(sp>0&&code.value[sp-1]!=='\n')?'\n':''; insText(pre+s[1]); toast('اتضاف: '+s[0]); });
      list.appendChild(d); }); }
  $('#snipBtn').addEventListener('click',()=>{ $('#snipSearch').value=''; render(); $('#snipModal').classList.remove('hidden'); $('#snipSearch').focus(); });
  $('#snipSearch').addEventListener('input',render);
  $('#snipClose').addEventListener('click',()=>$('#snipModal').classList.add('hidden'));
  $('#snipModal').addEventListener('click',e=>{ if(e.target.id==='snipModal') $('#snipModal').classList.add('hidden'); });
})();
/* --- version history --- */
(function(){
  const list=$('#histList');
  function render(){ const l=histAll()[currentProgram]||[]; list.innerHTML='';
    if(!l.length){ list.innerHTML='<div class="hist-empty">لسه مفيش نسخ — شغّل برنامجك وهتتسجل هنا.</div>'; return; }
    l.forEach((v,i)=>{ const d=new Date(v.t); const lines=v.c.split('\n').length; const first=(v.c.split('\n').find(x=>x.trim())||'').slice(0,46);
      const row=document.createElement('div'); row.className='hist-row';
      row.innerHTML='<div><b>'+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})+'</b> <small>'+d.toLocaleDateString('ar-EG')+' · '+lines+' سطر</small><div class="hist-prev"></div></div><button class="ghost small">↩ استرجع</button>';
      row.querySelector('.hist-prev').textContent=first;
      row.querySelector('button').addEventListener('click',()=>{ histSnap(); code.value=v.c; renderHL(); autosave(); $('#histModal').classList.add('hidden'); toast('رجعت للنسخة دي ✅ (والنسخة اللي قبلها اتحفظت)'); });
      list.appendChild(row); }); }
  $('#histBtn').addEventListener('click',()=>{ histSnap(); render(); $('#histModal').classList.remove('hidden'); });
  $('#histClose').addEventListener('click',()=>$('#histModal').classList.add('hidden'));
  $('#histModal').addEventListener('click',e=>{ if(e.target.id==='histModal') $('#histModal').classList.add('hidden'); });
})();
/* --- map editor --- */
(function(){
  const W=16,H=11, grid=$('#mapGrid'), pal=$('#mapPal'); const cells=Array.from({length:H},()=>Array(W).fill('.')); let cur='#', painting=false; const els=[];
  grid.style.gridTemplateColumns='repeat('+W+',1fr)';
  const col=k=>k==='#'?'#64748b':(k==='.'?'':SPRITE_PAL[k]);
  for(let j=0;j<H;j++) for(let i=0;i<W;i++){ const d=document.createElement('div'); d.className='mcell'; d.dataset.i=i; d.dataset.j=j; grid.appendChild(d); els.push(d); }
  function border(){ for(let j=0;j<H;j++) for(let i=0;i<W;i++) cells[j][i]=(i===0||j===0||i===W-1||j===H-1)?'#':'.'; }
  function redraw(){ els.forEach(d=>{ d.style.background=col(cells[+d.dataset.j][+d.dataset.i]); }); }
  function paint(d){ if(!d||!d.classList.contains('mcell')) return; cells[+d.dataset.j][+d.dataset.i]=cur; d.style.background=col(cur); }
  grid.addEventListener('pointerdown',e=>{ e.preventDefault(); painting=true; paint(e.target); });
  grid.addEventListener('pointermove',e=>{ if(painting) paint(document.elementFromPoint(e.clientX,e.clientY)); });
  window.addEventListener('pointerup',()=>{ painting=false; });
  ['#','.','2','3','4','5','6','7','8','9','1'].forEach(k=>{ const b=document.createElement('button'); b.className='spal'+(k===cur?' on':''); b.style.background=k==='.'?'transparent':col(k); b.textContent=k==='.'?'✖':(k==='#'?'🧱':''); b.title=k==='.'?'ممحاة':(k==='#'?'جدار':'لون '+k);
    b.addEventListener('click',()=>{ cur=k; pal.querySelectorAll('.spal').forEach(x=>x.classList.toggle('on',x===b)); }); pal.appendChild(b); });
  border(); redraw();
  $('#mapClear').addEventListener('click',()=>{ cells.forEach(r=>r.fill('.')); redraw(); });
  $('#mapBorder').addEventListener('click',()=>{ border(); redraw(); });
  $('#mapIns').addEventListener('click',()=>{ const sp=code.selectionStart; const pre=(sp>0&&code.value[sp-1]!=='\n')?'\n':'';
    $('#mapModal').classList.add('hidden');
    insText(pre+'خلي خريطة = [\n'+cells.map(r=>'  "'+r.join('')+'"').join('،\n')+'\n]\nخلفية("#0f172a")\nخريطة_بلاط(خريطة، ٣٦)\n'); toast('اتضافت الخريطة في الكود 🗺️'); });
  $('#mapClose').addEventListener('click',()=>$('#mapModal').classList.add('hidden'));
  $('#mapModal').addEventListener('click',e=>{ if(e.target.id==='mapModal') $('#mapModal').classList.add('hidden'); });
  $('#mapBtn').addEventListener('click',()=>$('#mapModal').classList.remove('hidden'));
})();
/* --- sprite editor --- */
(function(){
  const N=12, grid=$('#spriteGrid'), pal=$('#spritePal'); const cells=Array.from({length:N},()=>Array(N).fill('.')); let cur='2';
  const cellEls=[]; let painting=false;
  grid.style.gridTemplateColumns='repeat('+N+',1fr)';
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const d=document.createElement('div'); d.className='scell'; d.dataset.i=i; d.dataset.j=j; grid.appendChild(d); cellEls.push(d); }
  function paint(d){ if(!d||!d.classList.contains('scell')) return; const i=+d.dataset.i,j=+d.dataset.j; cells[j][i]=(cur==='.')?'.':cur; d.style.background=cur==='.'?'':SPRITE_PAL[cur]; }
  grid.addEventListener('pointerdown',e=>{ e.preventDefault(); painting=true; paint(e.target); });
  grid.addEventListener('pointermove',e=>{ if(painting){ paint(document.elementFromPoint(e.clientX,e.clientY)); } });
  window.addEventListener('pointerup',()=>{ painting=false; });
  ['.','1','2','3','4','5','6','7','8','9'].forEach(k=>{ const b=document.createElement('button'); b.className='spal'+(k===cur?' on':''); b.dataset.k=k; b.style.background=k==='.'?'transparent':SPRITE_PAL[k]; b.textContent=k==='.'?'✖':''; b.title=k==='.'?'ممحاة':'لون '+k;
    b.addEventListener('click',()=>{ cur=k; pal.querySelectorAll('.spal').forEach(x=>x.classList.toggle('on',x===b)); }); pal.appendChild(b); });
  function redraw(){ cellEls.forEach(d=>{ const c=cells[+d.dataset.j][+d.dataset.i]; d.style.background=c==='.'?'':SPRITE_PAL[c]; }); }
  $('#spriteClear').addEventListener('click',()=>{ cells.forEach(r=>r.fill('.')); redraw(); });
  $('#spriteFlip').addEventListener('click',()=>{ cells.forEach(r=>r.reverse()); redraw(); });
  $('#spriteIns').addEventListener('click',()=>{ let rows=cells.map(r=>r.join('')); while(rows.length&&/^\.+$/.test(rows[0])) rows.shift(); while(rows.length&&/^\.+$/.test(rows[rows.length-1])) rows.pop();
    if(!rows.length){ toast('ارسم حاجة الأول 🎨'); return; }
    const sp=code.selectionStart; const pre=(sp>0&&code.value[sp-1]!=='\n')?'\n':'';
    $('#spriteModal').classList.add('hidden');
    insText(pre+'خلي شكل = [\n'+rows.map(r=>'  "'+r+'"').join('،\n')+'\n]\nارفع()\nاذهب(٠، ٠)\nبكسلات(شكل، ٢٠)\n'); toast('اتضافت الشخصية في الكود 🎨'); });
  $('#spriteClose').addEventListener('click',()=>$('#spriteModal').classList.add('hidden'));
  $('#spriteModal').addEventListener('click',e=>{ if(e.target.id==='spriteModal') $('#spriteModal').classList.add('hidden'); });
  $('#spriteBtn').addEventListener('click',()=>$('#spriteModal').classList.remove('hidden'));
})();
/* --- piano --- */
(function(){
  const NAMES=['دو','ري','مي','فا','صول','لا','سي','دو+'], FREQ=[261.6,293.7,329.6,349.2,392,440,493.9,523.3], KEYS=['a','s','d','f','g','h','j','k'];
  const keysEl=$('#pianoKeys'), seqEl=$('#pianoSeq'); let seq=[];
  NAMES.forEach((n,i)=>{ const b=document.createElement('button'); b.className='pkey'; b.innerHTML='<span>'+n+'</span><small>'+KEYS[i].toUpperCase()+'</small>'; b.dataset.i=i; keysEl.appendChild(b); });
  function showSeq(){ seqEl.textContent=seq.length? seq.join(' ') : 'اضغط مفاتيح…'; }
  function press(i){ seq.push(NAMES[i]); beep(FREQ[i],350); const b=keysEl.children[i]; b.classList.add('on'); setTimeout(()=>b.classList.remove('on'),180); showSeq(); }
  keysEl.addEventListener('pointerdown',e=>{ const b=e.target.closest('.pkey'); if(b){ e.preventDefault(); press(+b.dataset.i); } });
  window.addEventListener('keydown',e=>{ if($('#pianoModal').classList.contains('hidden')) return; const i=KEYS.indexOf(e.key.toLowerCase()); if(i>=0&&!e.ctrlKey&&!e.metaKey){ e.preventDefault(); press(i); } });
  $('#pianoRest').addEventListener('click',()=>{ seq.push('_'); showSeq(); });
  $('#pianoBack').addEventListener('click',()=>{ seq.pop(); showSeq(); });
  $('#pianoPlay').addEventListener('click',()=>{ let t=0; seq.forEach(n=>{ if(n!=='_'){ const i=NAMES.indexOf(n); beep(FREQ[i],280,t); } t+=300; }); });
  $('#pianoIns').addEventListener('click',()=>{ if(!seq.length){ toast('اضغط كام نوتة الأول'); return; }
    $('#pianoModal').classList.add('hidden'); const sp=code.selectionStart; const pre=(sp>0&&code.value[sp-1]!=='\n')?'\n':''; insText(pre+'لحن("'+seq.join(' ')+'"، ٣٠٠)\n'); toast('اتضاف اللحن في الكود 🎶'); });
  $('#pianoClose').addEventListener('click',()=>$('#pianoModal').classList.add('hidden'));
  $('#pianoModal').addEventListener('click',e=>{ if(e.target.id==='pianoModal') $('#pianoModal').classList.add('hidden'); });
  $('#pianoBtn').addEventListener('click',()=>{ $('#pianoModal').classList.remove('hidden'); });
})();
/* --- achievements: badges, XP, levels, certificate --- */
const ACH_KEY='barmej-ach';
function achState(){ try{ const s=JSON.parse(localStorage.getItem(ACH_KEY)||'{}'); s.badges=s.badges||{}; s.runs=s.runs||0; return s; }catch(e){ return {badges:{},runs:0}; } }
function achSave(s){ try{ localStorage.setItem(ACH_KEY,JSON.stringify(s)); }catch(e){} }
const BADGES=[
 {id:'run1',icon:'🚀',t:'أول تشغيل',d:'شغّل أي برنامج بنجاح',ok:c=>c.ran},
 {id:'run10',icon:'🔁',t:'مواظب',d:'شغّل ١٠ برامج',ok:c=>c.runs>=10},
 {id:'run50',icon:'⚙️',t:'ماكينة',d:'شغّل ٥٠ برنامج',ok:c=>c.runs>=50},
 {id:'les1',icon:'📘',t:'طالب جديد',d:'خلّص درس واحد',ok:c=>c.lessons>=1},
 {id:'les10',icon:'📚',t:'دارس',d:'خلّص ١٠ دروس',ok:c=>c.lessons>=10},
 {id:'lesall',icon:'🎓',t:'خريج برمِج',d:'خلّص كل الدروس',ok:c=>c.lessons>=BARMEJ_LESSONS.length},
 {id:'ch1',icon:'🧩',t:'حلّال ألغاز',d:'حل تحدي واحد',ok:c=>c.challenges>=1},
 {id:'chall',icon:'🏆',t:'بطل التحديات',d:'حل كل التحديات',ok:c=>c.challenges>=BARMEJ_CHALLENGES.length},
 {id:'cls',icon:'🧱',t:'بنّاء الأصناف',d:'استخدم صنف في برنامج شغّال',ok:c=>c.ran&&/(^|\n)\s*صنف\s+\S+/.test(c.code)},
 {id:'lam',icon:'⚡',t:'دالة بلا اسم',d:'اكتب دالة بدون اسم',ok:c=>c.ran&&/دالة\s*\(/.test(c.code)},
 {id:'hof',icon:'🧩',t:'فنان الدوال',d:'استخدم خريطة أو صفّي أو اختزل',ok:c=>c.ran&&/(خريطة|صفّي|اختزل)\s*\(/.test(c.code)},
 {id:'imp',icon:'📦',t:'مستورد',d:'استورد مكتبة',ok:c=>c.ran&&/استورد\s+"/.test(c.code)},
 {id:'try',icon:'🛡️',t:'مسيطر على الأخطاء',d:'استخدم جرّب ولو_خطأ',ok:c=>c.ran&&/جرّب|جرب/.test(c.code)&&/لو_خطأ/.test(c.code)},
 {id:'mouse',icon:'🖱️',t:'تفاعلي',d:'اعمل برنامج بيستجيب للماوس أو اللمس',ok:c=>c.ran&&/نقرة|ماوس_/.test(c.code)},
 {id:'draw',icon:'🎨',t:'رسّام',d:'ارسم على اللوحة',ok:c=>c.ran&&/(قدم|اذهب|دائرة|نقطة|مستطيل)\s*\(/.test(c.code)},
 {id:'snd',icon:'🎵',t:'موسيقار',d:'شغّل صوت أو نغمة',ok:c=>c.ran&&/(نغمة|صوت)\s*\(/.test(c.code)},
 {id:'step',icon:'👣',t:'محقق',d:'جرّب التنفيذ خطوة بخطوة',ok:c=>c.step},
 {id:'daily1',icon:'⭐',t:'تحدي اليوم',d:'حل تحدي اليوم',ok:c=>c.streak>=1},
 {id:'streak3',icon:'🔥',t:'سلسلة نار',d:'حل تحدي اليوم ٣ أيام ورا بعض',ok:c=>c.streak>=3},
 {id:'share',icon:'🔗',t:'ناشر',d:'انسخ رابط مشاركة',ok:c=>c.shared},
 {id:'theme',icon:'🌓',t:'ذواق',d:'بدّل المظهر',ok:c=>c.theme}
];
const LEVELS=[[0,'مبتدئ 🌱'],[40,'متعلم 📗'],[100,'مبرمج 💻'],[180,'محترف 🔥'],[280,'خبير 🚀'],[400,'أسطورة 👑']];
function achXP(s){ return doneLessons.size*10+doneChallenges.size*15+Object.keys(s.badges).length*5; }
function achLevel(xp){ let k=0; for(let j=0;j<LEVELS.length;j++) if(xp>=LEVELS[j][0]) k=j; return k; }
function renderAchBtn(){ const s=achState(), xp=achXP(s), k=achLevel(xp); const b=$('#achBtn'); if(b) b.textContent='🏆 '+(k+1); }
function achCheck(extra){
  const s=achState(); if(extra&&extra.ran) s.runs++;
  const ctx=Object.assign({streak:dailyStreakNow(),runs:s.runs,lessons:doneLessons.size,challenges:doneChallenges.size,code:''},extra||{});
  const newly=[]; for(const b of BADGES){ if(!s.badges[b.id]&&b.ok(ctx)){ s.badges[b.id]=Date.now(); newly.push(b); } }
  achSave(s);
  if(newly.length) toast('🏅 إنجاز جديد: '+newly.map(b=>b.icon+' '+b.t).join('، '));
  renderAchBtn();
}
function renderAchModal(){
  const s=achState(), xp=achXP(s), k=achLevel(xp), cur=LEVELS[k][0], nxt=LEVELS[k+1]?LEVELS[k+1][0]:null;
  const pct=nxt?Math.round((xp-cur)/(nxt-cur)*100):100;
  const earned=Object.keys(s.badges).length;
  let h='<h2>🏆 إنجازاتك</h2><div class="ach-level">'+LEVELS[k][1]+' <small>— '+xp+' نقطة</small></div>'
   +'<div class="ach-bar"><div style="width:'+pct+'%"></div></div>'
   +'<p class="ach-sub">'+(nxt?'باقي '+(nxt-xp)+' نقطة للمستوى '+LEVELS[k+1][1]:'وصلت لأعلى مستوى! 👑')+' · الأوسمة '+earned+'/'+BADGES.length+'</p><div class="ach-grid">';
  for(const b of BADGES){ const on=!!s.badges[b.id]; h+='<div class="ach-card'+(on?' on':'')+'"><div class="ach-ic">'+(on?b.icon:'🔒')+'</div><b>'+b.t+'</b><small>'+b.d+'</small></div>'; }
  h+='</div><div class="ach-foot"><input id="certName" class="cert-name" placeholder="اسمك للشهادة" maxlength="30"><button id="certBtn" class="run small">🎓 شهادتي</button><button id="achClose" class="ghost">إغلاق</button></div>'
   +'<p class="ach-sub">الشهادة بتتفتح لما تخلّص كل الدروس. النقاط: درس ١٠ · تحدي ١٥ · وسام ٥</p>';
  $('#achBox').innerHTML=h;
  $('#achClose').addEventListener('click',()=>$('#achModal').classList.add('hidden'));
  try{ $('#certName').value=localStorage.getItem('barmej-certname')||''; }catch(e){}
  $('#certBtn').addEventListener('click',()=>{
    if(doneLessons.size<BARMEJ_LESSONS.length){ toast('لسه '+(BARMEJ_LESSONS.length-doneLessons.size)+' دروس وتفتح الشهادة 🎓'); return; }
    const nm=($('#certName').value||'').trim()||'مبرمج برمِج'; try{ localStorage.setItem('barmej-certname',nm); }catch(e){}
    makeCertificate(nm,xp,LEVELS[k][1]);
  });
}
function makeCertificate(name,xp,lvl){
  const c=document.createElement('canvas'); c.width=1200; c.height=800; const g=c.getContext('2d');
  g.fillStyle='#0b1220'; g.fillRect(0,0,1200,800);
  g.strokeStyle='#2dd4a7'; g.lineWidth=10; g.strokeRect(30,30,1140,740);
  g.strokeStyle='#f5c542'; g.lineWidth=3; g.strokeRect(52,52,1096,696);
  g.direction='rtl'; g.textAlign='center'; g.fillStyle='#2dd4a7'; g.font='bold 84px Tahoma, Arial, sans-serif'; g.fillText('شهادة إتمام',600,190);
  g.fillStyle='#cbd5e1'; g.font='34px Tahoma, Arial, sans-serif'; g.fillText('تشهد منصة «برمِج» لتعلّم البرمجة بالعربي بأن',600,290);
  g.fillStyle='#f5c542'; g.font='bold 78px Tahoma, Arial, sans-serif'; g.fillText(name,600,410);
  g.fillStyle='#cbd5e1'; g.font='34px Tahoma, Arial, sans-serif'; g.fillText('أكمل بنجاح جميع الدروس التفاعلية ('+doneLessons.size+' درسًا)',600,490);
  g.fillText('وحل '+doneChallenges.size+' تحديًا، وحصل على '+Object.keys(achState().badges).length+' وسامًا',600,545);
  g.fillStyle='#2dd4a7'; g.font='bold 40px Tahoma, Arial, sans-serif'; g.fillText('المستوى: '+lvl+' · '+xp+' نقطة',600,640);
  g.fillStyle='#64748b'; g.font='26px Tahoma, Arial, sans-serif'; g.fillText(new Date().toLocaleDateString('ar-EG'),600,705);
  const a=document.createElement('a'); a.download='شهادة-برمج.png'; a.href=c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  toast('اتنزلت شهادتك 🎓');
}
$('#achBtn').addEventListener('click',()=>{ renderAchModal(); $('#achModal').classList.remove('hidden'); });
$('#achModal').addEventListener('click',e=>{ if(e.target.id==='achModal') $('#achModal').classList.add('hidden'); });
window.__barmejAch={check:achCheck,state:achState,cert:makeCertificate};
renderAchBtn();

/* --- welcome --- */
(function(){
  const m=$('#welcomeModal');
  let seen=null; try{ seen=localStorage.getItem('barmej-welcomed'); }catch(e){}
  if(!seen&&!/[#&](app\b|code=|z=)/.test(location.hash)) m.classList.remove('hidden');
  function dismiss(){ m.classList.add('hidden'); try{ localStorage.setItem('barmej-welcomed','1'); }catch(e){} }
  $('#welcomeClose').addEventListener('click',dismiss);
  $('#welcomeLessons').addEventListener('click',()=>{ dismiss(); document.querySelector('.tab[data-panel="lessons"]').click(); });
})();

/* --- init --- */
if(!loadFromHash()){
  try{ const p=getPrograms();
    if(p[currentProgram]!==undefined){ code.value=p[currentProgram]; $('#fileName').textContent=currentProgram+'.برمج'; }
    else { const saved=localStorage.getItem('barmej-code'); code.value=saved||BARMEJ_EXAMPLES[0].code; }
  }catch(e){ code.value=BARMEJ_EXAMPLES[0].code; }
}
renderHL(); renderLesson(); renderChallenge();
const tabM=location.hash.match(/[#&]tab=(\w+)/);
if(tabM){ const tb=document.querySelector('.tab[data-panel="'+tabM[1]+'"]'); if(tb) tb.click(); }
const _hasC=/#(code|z)=/.test(location.hash);
if(/[#&]app\b/.test(location.hash)&&_hasC){ if(zPending) zPending.then(enterAppMode); else enterAppMode(); }
if(/[#&]run/.test(location.hash)){ if(zPending) zPending.then(()=>setTimeout(runProgram,100)); else setTimeout(runProgram,150); }
})();

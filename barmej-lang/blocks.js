/* 🧩 بلوكات: برمجة بالبلوكات تتحوّل لكود برمِج حقيقي */
(function(){
const $=s=>document.querySelector(s); const KEY='barmej-blocks';
const DEFS={
 print:{lbl:'اطبع',col:'#38bdf8',f:[['القيمة','"أهلاً"']],gen:(v)=>'اطبع '+v[0]},
 let:{lbl:'خلي',col:'#a78bfa',f:[['الاسم','س'],['= القيمة','٠']],gen:v=>'خلي '+v[0]+' = '+v[1]},
 set:{lbl:'غيّر',col:'#a78bfa',f:[['الاسم','س'],['إلى','س + ١']],gen:v=>v[0]+' = '+v[1]},
 repeat:{lbl:'كرر',col:'#f59e0b',f:[['عدد المرات','٥']],box:1,gen:v=>'كرر '+v[0]},
 each:{lbl:'لكل',col:'#f59e0b',f:[['المتغير','ر'],['في','مدى(٥)']],box:1,gen:v=>'لكل '+v[0]+' في '+v[1]},
 while:{lbl:'طالما',col:'#f59e0b',f:[['الشرط','س < ١٠']],box:1,gen:v=>'طالما '+v[0]},
 if:{lbl:'لو',col:'#34d399',f:[['الشرط','س > ٠']],box:1,gen:v=>'لو '+v[0]},
 ifelse:{lbl:'لو / وإلا',col:'#34d399',f:[['الشرط','س > ٠']],box:2,gen:v=>'لو '+v[0]},
 fwd:{lbl:'قدم',col:'#f472b6',f:[['المسافة','١٠٠']],gen:v=>'قدم('+v[0]+')'},
 right:{lbl:'يمين',col:'#f472b6',f:[['درجات','٩٠']],gen:v=>'يمين('+v[0]+')'},
 left:{lbl:'شمال',col:'#f472b6',f:[['درجات','٩٠']],gen:v=>'شمال('+v[0]+')'},
 color:{lbl:'لون',col:'#fb7185',f:[['اللون','"#38bdf8"']],gen:v=>'لون('+v[0]+')'},
 circle:{lbl:'دائرة',col:'#fb7185',f:[['نصف القطر','٥٠']],gen:v=>'دائرة('+v[0]+')'},
 wait:{lbl:'استنى',col:'#94a3b8',f:[['مللي ثانية','٥٠٠']],gen:v=>'استنى('+v[0]+')'},
 call:{lbl:'نداء حر',col:'#94a3b8',f:[['سطر كود','نغمة("دو")']],gen:v=>v[0]}
};
const ORDER=[['🖨️ أساسي',['print','let','set','call']],['🔁 تكرار وشروط',['repeat','each','while','if','ifelse']],['🐢 رسم',['fwd','right','left','color','circle']],['⏱️ وقت',['wait']]];
let ws=[]; try{ ws=JSON.parse(localStorage.getItem(KEY))||[]; }catch(e){}
let target=null; /* {list} */
const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(ws)); }catch(e){} };
const mk=t=>({t,v:DEFS[t].f.map(x=>x[1]),k:[],k2:[]});
function gen(list,ind){ const pad='  '.repeat(ind); let o=[];
  list.forEach(b=>{ const d=DEFS[b.t]; const head=d.gen(b.v);
    if(!d.box) o.push(pad+head);
    else { o.push(pad+head+' {'); o.push(gen(b.k,ind+1)); if(d.box===2){ o.push(pad+'} وإلا {'); o.push(gen(b.k2,ind+1)); } o.push(pad+'}'); } });
  return o.filter(x=>x!=='').join('\n'); }
const code=()=>gen(ws,0);
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
const root=document.createElement('section'); root.id='panel-blocks'; root.className='panel';
root.innerHTML='<div class="bk-top"><b>🧩 برمجة بالبلوكات</b><span class="bk-hint">اضغط بلوك من الجنب يتضاف في المكان المحدد (الإطار الأخضر)، وغيّر القيم جواه.</span></div><div class="bk-main"><div class="bk-pal" id="bkPal"></div><div class="bk-work"><div id="bkTree" class="bk-tree"></div><div class="bk-actions"><button id="bkRun" class="run">▶ شغّل في المحرر</button><button id="bkCopy" class="ghost small">📥 انقل للمحرر</button><button id="bkEx" class="ghost small">✨ مثال: مربع</button><button id="bkEx2" class="ghost small">🌈 مثال: وردة</button><button id="bkClear" class="ghost small">🗑️ فضّي</button></div><div class="bk-code-h">الكود الناتج:</div><pre id="bkCode" class="bk-code"></pre></div></div>';
const dp=$('#panel-docs'); dp.parentNode.insertBefore(root,dp);
const nav=document.querySelector('.tabs'); const tb=document.createElement('button'); tb.className='tab'; tb.dataset.panel='blocks'; tb.textContent='🧩 بلوكات';
const ed=nav.querySelector('[data-panel="challenges"]'); nav.insertBefore(tb,ed?ed.nextSibling:null);
tb.addEventListener('click',()=>{ nav.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===tb)); document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p===root)); render(); });
const pal=$('#bkPal');
ORDER.forEach(([h,ts])=>{ const t=document.createElement('div'); t.className='bk-ph'; t.textContent=h; pal.appendChild(t);
  ts.forEach(k=>{ const b=document.createElement('button'); b.className='bk-pb'; b.style.background=DEFS[k].col; b.textContent='＋ '+DEFS[k].lbl; b.onclick=()=>{ (target||ws).push(mk(k)); save(); render(); }; pal.appendChild(b); }); });
function slot(list,label){ const s=document.createElement('div'); s.className='bk-slot'+(target===list?' sel':''); const h=document.createElement('div'); h.className='bk-slot-h'; h.textContent=(target===list?'● ':'○ ')+label; h.onclick=e=>{ e.stopPropagation(); target=(target===list&&list!==ws)?null:list; render(); }; s.appendChild(h); s.appendChild(renderList(list)); return s; }
function renderList(list){ const w=document.createElement('div'); w.className='bk-list';
  list.forEach((b,i)=>{ const d=DEFS[b.t]; const el=document.createElement('div'); el.className='bk-block'; el.style.borderColor=d.col;
    const row=document.createElement('div'); row.className='bk-row'; const l=document.createElement('span'); l.className='bk-lbl'; l.style.background=d.col; l.textContent=d.lbl; row.appendChild(l);
    d.f.forEach((f,j)=>{ const w2=document.createElement('label'); w2.className='bk-f'; w2.append(f[0]+' '); const inp=document.createElement('input'); inp.value=b.v[j]; inp.dir='rtl'; inp.size=Math.max(4,String(b.v[j]).length+1); inp.oninput=()=>{ b.v[j]=inp.value; inp.size=Math.max(4,inp.value.length+1); save(); upd(); }; w2.appendChild(inp); row.appendChild(w2); });
    const ctl=document.createElement('span'); ctl.className='bk-ctl';
    [['▲',()=>{ if(i>0){ [list[i-1],list[i]]=[list[i],list[i-1]]; } }],['▼',()=>{ if(i<list.length-1){ [list[i+1],list[i]]=[list[i],list[i+1]]; } }],['⧉',()=>{ list.splice(i+1,0,JSON.parse(JSON.stringify(b))); }],['✕',()=>{ list.splice(i,1); if(target&&(target===b.k||target===b.k2)) target=null; }]].forEach(([t,fn])=>{ const x=document.createElement('button'); x.textContent=t; x.className='bk-mini'; x.onclick=()=>{ fn(); save(); render(); }; ctl.appendChild(x); });
    row.appendChild(ctl); el.appendChild(row);
    if(d.box) el.appendChild(slot(b.k,d.box===2?'لو صح:':'جوّه:'));
    if(d.box===2) el.appendChild(slot(b.k2,'وإلا:'));
    w.appendChild(el); });
  if(!list.length&&list===ws){ const e=document.createElement('div'); e.className='bk-empty'; e.textContent='مفيش بلوكات لسه. اضغط بلوك من الجنب 👈'; w.appendChild(e); }
  return w; }
function upd(){ $('#bkCode').textContent=code()||'// الكود هيظهر هنا'; }
function render(){ const t=$('#bkTree'); t.innerHTML=''; const rs=document.createElement('div'); rs.className='bk-slot'+(target===null?' sel':''); const h=document.createElement('div'); h.className='bk-slot-h'; h.textContent=(target===null?'● ':'○ ')+'البرنامج الرئيسي'; h.onclick=()=>{ target=null; render(); }; rs.appendChild(h); rs.appendChild(renderList(ws)); t.appendChild(rs); upd(); }
function toEditor(run){ const c=code(); if(!c) return; const ta=$('#code'); ta.value=c; ta.dispatchEvent(new Event('input',{bubbles:true})); const e=nav.querySelector('[data-panel="editor"]'); if(e) e.click(); if(run){ setTimeout(()=>$('#runBtn').click(),150); } }
$('#bkRun').onclick=()=>toEditor(true); $('#bkCopy').onclick=()=>toEditor(false);
$('#bkClear').onclick=()=>{ ws=[]; target=null; save(); render(); };
const B=(t,v,k,k2)=>({t,v,k:k||[],k2:k2||[]});
$('#bkEx').onclick=()=>{ ws=[B('color',['"#38bdf8"']),B('repeat',['٤'],[B('fwd',['١٠٠']),B('right',['٩٠'])])]; target=null; save(); render(); };
$('#bkEx2').onclick=()=>{ ws=[B('repeat',['١٢'],[B('color',['قوس_قزح(عداد)']),B('circle',['٦٠']),B('right',['٣٠'])])]; ws.unshift(B('call',['استورد "ألوان"'])); target=null; save(); render(); };
window.BARMEJ_BLOCKS={gen,mk,DEFS,B};
render();
})();

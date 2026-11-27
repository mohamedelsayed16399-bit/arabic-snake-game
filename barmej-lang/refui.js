/* واجهة 📖 مرجع الدوال داخل تبويب الدليل */
(function(){
const $=s=>document.querySelector(s); const R=window.BARMEJ_REF||[]; if(!R.length) return;
const norm=s=>(s||'').toLowerCase().replace(/[\u0640\u064B-\u065F]/g,'').replace(/[\u0623\u0625\u0622]/g,'\u0627').replace(/\u0649/g,'\u064A').replace(/\u0629/g,'\u0647');
const panel=$('#panel-docs'); if(!panel) return;
const wrap=document.createElement('div'); wrap.className='ref-wrap';
wrap.innerHTML='<div class="ref-head"><b>📖 مرجع الدوال</b><span class="ref-count"></span><button class="ghost small" id="refToggle">إخفاء</button></div><div class="ref-body"><input id="refSearch" type="search" placeholder="🔎 دوّر عن دالة… مثل: قايمة، جذر، رتب" dir="rtl"><div id="refChips" class="ex-chips"></div><div id="refList" class="ref-list"></div></div>';
panel.insertBefore(wrap,panel.firstChild);
const cats=[...new Set(R.map(r=>r.cat))]; let cat='';
const chips=$('#refChips'), list=$('#refList');
function mkChip(label,val){ const b=document.createElement('button'); b.className='chip'+(val===cat?' on':''); b.textContent=label; b.onclick=()=>{ cat=val; [...chips.children].forEach(c=>c.classList.toggle('on',c===b)); render(); }; chips.appendChild(b); }
mkChip('الكل',''); cats.forEach(c=>mkChip(c,c));
function runInline(r,out){
  const lines=[]; let res;
  try{ res=Barmej.runSource(r.code,{print:s=>lines.push(String(s)),ask:()=>'٥',draw:()=>{},sleep:()=>{},beep:()=>{}},{maxSteps:1e6}); }catch(e){ res={ok:false,error:String(e)}; }
  out.className='ref-out'+(res.ok?'':' bad');
  out.textContent=res.ok?(lines.length?lines.join('\n'):'✔ اتنفّذ (النتيجة بتظهر على اللوحة، جرّبه في المحرر)'):('✖ '+(res.error&&res.error.message||res.error));
}
function toEditor(r){
  const ta=$('#code'); if(!ta) return; ta.value=r.code; ta.dispatchEvent(new Event('input',{bubbles:true}));
  const tb=document.querySelector('.tab[data-panel="editor"]'); if(tb) tb.click();
  const t=$('#toast'); if(t){ t.textContent='اتنقل للمحرر ✔'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1600); }
}
function render(){
  const q=norm($('#refSearch').value.trim());
  const rows=R.filter(r=>(!cat||r.cat===cat)&&(!q||norm(r.name+' '+r.sig+' '+r.desc+' '+r.cat).includes(q)));
  $('.ref-count').textContent=rows.length+' من '+R.length;
  list.innerHTML='';
  if(!rows.length){ list.innerHTML='<div class="ref-empty">مفيش دالة بالاسم ده 🤔</div>'; return; }
  rows.forEach(r=>{
    const c=document.createElement('div'); c.className='ref-card';
    const h=document.createElement('div'); h.className='ref-sig'; h.textContent=r.sig; c.appendChild(h);
    const d=document.createElement('div'); d.className='ref-desc'; d.textContent=r.desc; c.appendChild(d);
    const pre=document.createElement('pre'); pre.className='ref-code'; pre.textContent=r.code; c.appendChild(pre);
    const bar=document.createElement('div'); bar.className='ref-bar';
    const out=document.createElement('pre'); out.className='ref-out hidden';
    if(r.kind!=='d' && r.kind!=='i'){ const b=document.createElement('button'); b.className='small'; b.textContent='▶ جرّبه'; b.onclick=()=>{ out.classList.remove('hidden'); runInline(r,out); }; bar.appendChild(b); }
    const e=document.createElement('button'); e.className='ghost small'; e.textContent='📥 للمحرر'; e.onclick=()=>toEditor(r); bar.appendChild(e);
    if(r.kind==='d'||r.kind==='i'){ const n=document.createElement('span'); n.className='ref-note'; n.textContent=r.kind==='d'?'🎨 بيرسم: شغّله في المحرر':'🖱️ تفاعلي: شغّله في المحرر'; bar.appendChild(n); }
    c.appendChild(bar); c.appendChild(out); list.appendChild(c);
  });
}
$('#refSearch').addEventListener('input',render);
$('#refToggle').onclick=()=>{ const b=wrap.querySelector('.ref-body'); const h=b.classList.toggle('hidden'); $('#refToggle').textContent=h?'إظهار':'إخفاء'; };
render();
})();

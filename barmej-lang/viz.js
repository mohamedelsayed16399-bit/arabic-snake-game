/* 📊 مصوّر الخوارزميات: ترتيب بالحركة */
(function(){
const $=s=>document.querySelector(s);
// كل خوارزمية generator بيطلّع {a:[..], hi:[..], sw:[..], done:[..]} في كل خطوة
function* bubble(a){ const n=a.length; for(let i=0;i<n-1;i++){ for(let j=0;j<n-1-i;j++){ yield {hi:[j,j+1]}; if(a[j]>a[j+1]){ [a[j],a[j+1]]=[a[j+1],a[j]]; yield {sw:[j,j+1]}; } } yield {done:[n-1-i]}; } }
function* selection(a){ const n=a.length; for(let i=0;i<n-1;i++){ let m=i; for(let j=i+1;j<n;j++){ yield {hi:[m,j]}; if(a[j]<a[m]) m=j; } if(m!==i){ [a[i],a[m]]=[a[m],a[i]]; yield {sw:[i,m]}; } yield {done:[i]}; } }
function* insertion(a){ const n=a.length; for(let i=1;i<n;i++){ let j=i; while(j>0){ yield {hi:[j-1,j]}; if(a[j-1]>a[j]){ [a[j-1],a[j]]=[a[j],a[j-1]]; yield {sw:[j-1,j]}; j--; } else break; } } }
function* quick(a,lo=0,hi=a.length-1){ if(lo>=hi) return; const p=a[hi]; let i=lo; for(let j=lo;j<hi;j++){ yield {hi:[j,hi]}; if(a[j]<p){ if(i!==j){ [a[i],a[j]]=[a[j],a[i]]; yield {sw:[i,j]}; } i++; } } if(i!==hi){ [a[i],a[hi]]=[a[hi],a[i]]; yield {sw:[i,hi]}; } yield* quick(a,lo,i-1); yield* quick(a,i+1,hi); }
const ALGS={
 bubble:{n:'فقاعات',g:bubble,d:'بتقارن كل عنصرين متجاورين وتبدّلهم لو ترتيبهم غلط. أكبر رقم «بيطفو» لآخر القايمة في كل لفّة.',code:'دالة رتّب_فقاعات(ق) {\n  خلي ن = طول(ق)\n  كرر ن - ١، ي {\n    كرر ن - ١، ك {\n      لو ق[ك - 1] > ق[ك] {\n        خلي م = ق[ك - 1]\n        ق[ك - 1] = ق[ك]\n        ق[ك] = م\n      }\n    }\n  }\n  ارجع ق\n}\nاطبع رتّب_فقاعات([٥، ٢، ٩، ١، ٧])'},
 selection:{n:'اختيار',g:selection,d:'بتدوّر على أصغر رقم في الباقي وتحطه في مكانه الصح.',code:'دالة رتّب_اختيار(ق) {\n  خلي ن = طول(ق)\n  كرر ن - ١، ي {\n    خلي م = ي - 1\n    كرر ن - (ي - 1) - ١، ك {\n      خلي ج = (ي - 1) + ك\n      لو ق[ج] < ق[م] { م = ج }\n    }\n    خلي ت = ق[ي - 1]\n    ق[ي - 1] = ق[م]\n    ق[م] = ت\n  }\n  ارجع ق\n}\nاطبع رتّب_اختيار([٥، ٢، ٩، ١، ٧])'},
 insertion:{n:'إدراج',g:insertion,d:'زي ترتيب ورق اللعب في إيدك: بتاخد كل عنصر وتدخّله مكانه وسط اللي اترتّب.',code:'دالة رتّب_إدراج(ق) {\n  كرر طول(ق) - ١، ي {\n    خلي ج = ي\n    طالما ج > ٠ و ق[ج - 1] > ق[ج] {\n      خلي م = ق[ج - 1]\n      ق[ج - 1] = ق[ج]\n      ق[ج] = م\n      ج = ج - ١\n    }\n  }\n  ارجع ق\n}\nاطبع رتّب_إدراج([٥، ٢، ٩، ١، ٧])'},
 quick:{n:'سريع',g:quick,d:'بتختار عنصر محور، وتفصل الأصغر منه يمين والأكبر شمال، وتكرر على كل جزء. أسرع في الغالب.',code:'دالة رتّب_سريع(ق) {\n  لو طول(ق) <= ١ { ارجع ق }\n  خلي م = ق[٠]\n  خلي صغار = []\n  خلي كبار = []\n  كرر طول(ق) - ١، ي {\n    لو ق[ي] < م { أضف(صغار، ق[ي]) } وإلا { أضف(كبار، ق[ي]) }\n  }\n  خلي ر = []\n  لكل ع في رتّب_سريع(صغار) { أضف(ر، ع) }\n  أضف(ر، م)\n  لكل ع في رتّب_سريع(كبار) { أضف(ر، ع) }\n  ارجع ر\n}\nاطبع رتّب_سريع([٥، ٢، ٩، ١، ٧])'}
};
window.BARMEJ_VIZ={ALGS,bubble,selection,insertion,quick};
if(typeof document==='undefined'||!$('#panel-docs')) return;
let key='bubble', arr=[], gen=null, timer=null, steps=0, cmp=0, swp=0, speed=5;
const root=document.createElement('section'); root.id='panel-viz'; root.className='panel';
root.innerHTML='<div class="viz-top"><b>📊 مصوّر الخوارزميات</b><span class="viz-hint">شوف الترتيب بالحركة، وبعدين انقل الكود للمحرر وجرّبه.</span></div><div id="vzChips" class="viz-chips"></div><div id="vzDesc" class="viz-desc"></div><div class="viz-bars" id="vzBars"></div><div class="viz-act"><button id="vzPlay" class="run small">▶ ابدأ</button><button id="vzStep" class="ghost small">⏭ خطوة</button><button id="vzShuf" class="ghost small">🔀 اخلط</button><label class="viz-sp">السرعة <input id="vzSpeed" type="range" min="1" max="10" value="5"></label><label class="viz-sp">العدد <input id="vzN" type="range" min="5" max="40" value="16"></label><span id="vzStat" class="viz-stat"></span></div><div class="viz-code-h">الكود بـ برمِج:</div><pre id="vzCode" class="viz-code"></pre><div class="viz-act"><button id="vzCopy" class="ghost small">📥 انقل للمحرر</button></div>';
const dp=$('#panel-docs'); dp.parentNode.insertBefore(root,dp);
const nav=document.querySelector('.tabs'); const tb=document.createElement('button'); tb.className='tab'; tb.dataset.panel='viz'; tb.textContent='🎞️ مصوّر';
const ed=nav.querySelector('[data-panel="golf"]')||nav.querySelector('[data-panel="blocks"]'); nav.insertBefore(tb,ed?ed.nextSibling:null);
tb.addEventListener('click',()=>{ nav.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===tb)); document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p===root)); draw({}); });
function shuffle(){ stop(); const n=+$('#vzN').value; arr=Array.from({length:n},(_,i)=>i+1); for(let i=n-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } gen=ALGS[key].g(arr); steps=cmp=swp=0; doneSet=new Set(); draw({}); }
let doneSet=new Set();
function draw(ev){ const box=$('#vzBars'); const n=arr.length, mx=Math.max(...arr,1); box.innerHTML=''; arr.forEach((v,i)=>{ const b=document.createElement('div'); b.className='viz-bar'; b.style.height=(v/mx*100)+'%'; b.style.width=(100/n)+'%'; if(doneSet.has(i)||finished) b.classList.add('ok'); if(ev.hi&&ev.hi.includes(i)) b.classList.add('hi'); if(ev.sw&&ev.sw.includes(i)) b.classList.add('sw'); box.appendChild(b); }); $('#vzStat').textContent='خطوات: '+steps+' • مقارنات: '+cmp+' • تبديلات: '+swp+(finished?' ✔ خلصت':''); }
let finished=false;
function step(){ if(!gen) return false; const r=gen.next(); if(r.done){ finished=true; stop(); draw({}); return false; } const ev=r.value; steps++; if(ev.hi) cmp++; if(ev.sw) swp++; if(ev.done) ev.done.forEach(i=>doneSet.add(i)); draw(ev); return true; }
function stop(){ if(timer){ clearInterval(timer); timer=null; } $('#vzPlay').textContent='▶ ابدأ'; }
function play(){ if(timer){ stop(); return; } if(finished) shuffle0(); $('#vzPlay').textContent='⏸ وقّف'; timer=setInterval(()=>{ if(!step()) stop(); },Math.max(8,300-speed*28)); }
function shuffle0(){ finished=false; shuffle(); }
function pick(k){ key=k; finished=false; $('#vzDesc').textContent=ALGS[k].d; $('#vzCode').textContent=ALGS[k].code; [...$('#vzChips').children].forEach(c=>c.classList.toggle('on',c.dataset.k===k)); shuffle(); }
Object.keys(ALGS).forEach(k=>{ const b=document.createElement('button'); b.className='chip'; b.dataset.k=k; b.textContent=ALGS[k].n; b.onclick=()=>pick(k); $('#vzChips').appendChild(b); });
$('#vzPlay').onclick=play; $('#vzStep').onclick=()=>{ stop(); step(); }; $('#vzShuf').onclick=shuffle0; $('#vzN').oninput=shuffle0;
$('#vzSpeed').oninput=e=>{ speed=+e.target.value; if(timer){ stop(); play(); } };
$('#vzCopy').onclick=()=>{ const c=$('#code'); if(!c) return; c.value=ALGS[key].code; c.dispatchEvent(new Event('input')); const eb=document.querySelector('.tab[data-panel="editor"]'); if(eb) eb.click(); };
pick('bubble');
})();

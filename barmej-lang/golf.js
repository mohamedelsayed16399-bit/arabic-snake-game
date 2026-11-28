/* ⛳ جولف: أقصر كود يطبع المطلوب */
(function(){
const $=s=>document.querySelector(s); const KEY='barmej-golf';
const T=[
 {t:'أرقام ١ لـ ١٠',x:'اطبع الأرقام من ١ لـ ١٠، كل رقم في سطر.',out:['1','2','3','4','5','6','7','8','9','10'],par:'لكل ع في مدى(١٠){اطبع ع}'},
 {t:'مجموع ١ لـ ١٠٠',x:'اطبع مجموع الأرقام من ١ لـ ١٠٠.',out:['5050'],par:'خلي ج=٠\nلكل ع في مدى(١٠٠){ج=ج+ع}\nاطبع ج'},
 {t:'الزوجي',x:'اطبع الأرقام الزوجية من ٢ لـ ٢٠.',out:['2','4','6','8','10','12','14','16','18','20'],par:'لكل ع في مدى(١٠){اطبع ع*٢}'},
 {t:'جدول ٧',x:'اطبع جدول ضرب ٧ من ٧×١ لـ ٧×٥ (النواتج بس).',out:['7','14','21','28','35'],par:'لكل ع في مدى(٥){اطبع ع*٧}'},
 {t:'العد التنازلي',x:'اطبع من ٥ لـ ١ تنازلي.',out:['5','4','3','2','1'],par:'لكل ع في مدى(٥){اطبع ٦-ع}'},
 {t:'مضروب ٦',x:'اطبع مضروب ٦ (٦×٥×٤×٣×٢×١).',out:['720'],par:'اطبع ٧٢٠'},
 {t:'تكرار النص',x:'اطبع كلمة «برمج» خمس مرات في سطر واحد بدون فواصل: برمجبرمجبرمجبرمجبرمج',out:['برمجبرمجبرمجبرمجبرمج'],par:'خلي ن=""\nكرر ٥{ن=ن+"برمج"}\nاطبع ن'},
 {t:'فيزبَز مصغّر',x:'من ١ لـ ٦: لو الرقم يقبل القسمة على ٣ اطبع «فز»، وإلا اطبع الرقم.',out:['1','2','فز','4','5','فز'],par:'لكل ع في مدى(٦){لو ع%٣==٠{اطبع "فز"}وإلا{اطبع ع}}'},
 {t:'مربعات',x:'اطبع مربعات الأرقام من ١ لـ ٦.',out:['1','4','9','16','25','36'],par:'لكل ع في مدى(٦){اطبع ع*ع}'},
 {t:'أكبر رقم',x:'اطبع أكبر رقم في القائمة [٣، ٩، ٢، ٧].',out:['9'],par:'اطبع أكبر([٣،٩،٢،٧])'}
];
let best={}; try{ best=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){}
let gi=0;
const score=c=>c.replace(/\s+/g,'').length;
const root=document.createElement('section'); root.id='panel-golf'; root.className='panel';
root.innerHTML='<div class="gf-top"><b>⛳ جولف: أقصر كود</b><span class="gf-hint">نفس الناتج بأقل عدد حروف (من غير المسافات). الأقل يكسب.</span></div><div id="gfChips" class="gf-chips"></div><div id="gfText" class="gf-text"></div><textarea id="gfCode" class="gf-code" dir="rtl" spellcheck="false" placeholder="اكتب الكود هنا"></textarea><div class="gf-act"><button id="gfRun" class="run small">▶ شغّل وقيّم</button><button id="gfPar" class="ghost small">💡 كود مرجعي</button><span id="gfRes" class="gf-res"></span></div><pre id="gfOut" class="gf-out"></pre>';
const dp=$('#panel-docs'); dp.parentNode.insertBefore(root,dp);
const nav=document.querySelector('.tabs'); const tb=document.createElement('button'); tb.className='tab'; tb.dataset.panel='golf'; tb.textContent='⛳ جولف';
const ed=nav.querySelector('[data-panel="blocks"]')||nav.querySelector('[data-panel="challenges"]'); nav.insertBefore(tb,ed?ed.nextSibling:null);
tb.addEventListener('click',()=>{ nav.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===tb)); document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p===root)); render(); });
function render(){ const ch=$('#gfChips'); ch.innerHTML=''; T.forEach((g,i)=>{ const b=document.createElement('button'); b.className='chip'+(i===gi?' on':'')+(best[i]?' done':''); b.textContent=(best[i]?'⛳ ':'')+(i+1)+'. '+g.t; b.onclick=()=>{ gi=i; $('#gfCode').value=''; $('#gfOut').textContent=''; render(); }; ch.appendChild(b); });
 const g=T[gi], pr=score(g.par); $('#gfText').innerHTML=g.x+'<br><small>الـ par: '+pr+' حرف'+(best[gi]?' • أحسن نتيجة ليك: <b>'+best[gi]+'</b>':'')+'</small>'; $('#gfRes').textContent=''; $('#gfRes').className='gf-res'; }
function run(c){ const out=[]; let r; try{ r=Barmej.runSource(c,{print:x=>out.push(String(x)),ask:()=>'5',draw(){},sleep(){}},{maxSteps:2e5}); }catch(e){ r={ok:false,error:String(e)}; } return {r,out}; }
$('#gfRun').onclick=()=>{ const c=$('#gfCode').value; const g=T[gi]; const {r,out}=run(c); const res=$('#gfRes'); $('#gfOut').textContent=out.join('\n');
 if(!r.ok){ res.className='gf-res bad'; res.textContent='خطأ: '+(r.error&&r.error.message||r.error); return; }
 if(out.join('\n')!==g.out.join('\n')){ res.className='gf-res bad'; res.textContent='الناتج مش مطابق للمطلوب.'; return; }
 const s=score(c), pr=score(g.par); const medal=s<pr?'🥇 تحت الـ par!':s===pr?'🥈 على الـ par':s<=pr*1.5?'🥉 قريب':'✅ صح، بس طوّل';
 if(!best[gi]||s<best[gi]){ best[gi]=s; try{ localStorage.setItem(KEY,JSON.stringify(best)); }catch(e){} }
 res.className='gf-res ok'; res.textContent=medal+' — '+s+' حرف (par '+pr+')'; render(); res.className='gf-res ok'; res.textContent=medal+' — '+s+' حرف (par '+pr+')'; };
$('#gfPar').onclick=()=>{ $('#gfCode').value=T[gi].par; };
window.BARMEJ_GOLF=T;
render();
})();

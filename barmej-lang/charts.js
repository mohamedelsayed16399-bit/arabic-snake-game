/* 📊 مكتبة مخططات: أمثلة ومعالج مخططات */
(function(){
window.BARMEJ_EXAMPLES=window.BARMEJ_EXAMPLES||[];
window.BARMEJ_EXAMPLES.push({"title": "📊 مخطط أعمدة بالمكتبة", "desc": "استورد \"مخططات\" وارسم مخطط أعمدة بسطر واحد: قيم وأسماء وعنوان", "code": "استورد \"مخططات\"\nخلي أسماء = [\"سبت\"، \"أحد\"، \"اثنين\"، \"ثلاثاء\"، \"أربعاء\"]\nخلي قيم = [١٢، ٢٠، ١٥، ٢٨، ٢٢]\nمخطط_أعمدة(قيم، أسماء، \"زوار الأسبوع\")"});
window.BARMEJ_EXAMPLES.push({"title": "📈 مخطط خطي (تطور الدرجات)", "desc": "خط بنقاط وقيم فوقها، بيبان فيه الصعود والنزول", "code": "استورد \"مخططات\"\nخلي شهور = [\"١\"، \"٢\"، \"٣\"، \"٤\"، \"٥\"، \"٦\"]\nخلي درجات = [٦٠، ٦٨، ٦٥، ٧٦، ٨٢، ٩٠]\nمخطط_خطي(درجات، شهور، \"تطوري في الامتحانات\")"});
window.BARMEJ_EXAMPLES.push({"title": "🥧 مخطط دائري (مصروف الشهر)", "desc": "دايرة مقسّمة لشرايح بنسبها المئوية", "code": "استورد \"مخططات\"\nمخطط_دائري([٤٠٠٠، ١٥٠٠، ١٠٠٠، ٥٠٠]، [\"إيجار\"، \"أكل\"، \"مواصلات\"، \"ترفيه\"]، \"مصروف الشهر\")"});
window.BARMEJ_EXAMPLES.push({"title": "🧾 جدول ومخطط نصي", "desc": "اطبع جدول متظبّط الأعمدة وبعده أعمدة نصية بدون رسم", "code": "استورد \"مخططات\"\nخلي أسماء = [\"سلمى\"، \"عمر\"، \"هدى\"]\nخلي درجات = [٩٠، ٧٥، ٨٢]\nاطبع_جدول([\"الاسم\"، \"الدرجة\"]، [[\"سلمى\"، ٩٠]، [\"عمر\"، ٧٥]، [\"هدى\"، ٨٢]])\nاطبع \"\"\nشريط_نصي(درجات، أسماء)"});
window.BARMEJ_EXAMPLES.push({"title": "🔢 تحليل بيانات: مخطط من حساب", "desc": "احسب مربعات الأرقام من ١ لـ ٨ وارسمها على مخطط أعمدة", "code": "استورد \"مخططات\"\nخلي أسماء = []\nخلي قيم = []\nكرر ٨، ك {\n  أضف(أسماء، نص(ك))\n  أضف(قيم، ك * ك)\n}\nمخطط_أعمدة(قيم، أسماء، \"مربعات الأرقام\")"});
window.BARMEJ_EXAMPLES.push({"title": "🌦️ مخطط حرارة الأسبوع مع متوسط", "desc": "مخطط خطي لدرجات الحرارة واطبع المتوسط وأعلى يوم", "code": "استورد \"مخططات\"\nاستورد \"رياضيات\"\nخلي أيام = [\"س\"، \"ح\"، \"ن\"، \"ث\"، \"ر\"، \"خ\"، \"ج\"]\nخلي حرارة = [٢٢، ٢٥، ٢٧، ٢٦، ٣٠، ٢٨، ٢٤]\nمخطط_خطي(حرارة، أيام، \"حرارة الأسبوع\")\nاطبع \"المتوسط: \" + قرب(متوسط(حرارة)، ١)\nاطبع \"الأعلى: \" + أكبر(حرارة)"});

const $=s=>document.querySelector(s);
const TYPES=[['bar','📊 أعمدة'],['line','📈 خطي'],['pie','🥧 دائري'],['text','▮ نصي'],['table','🧾 جدول']];
let type='bar';
const back=document.createElement('div'); back.id='chartModal'; back.className='modal-back hidden';
back.innerHTML='<div class="modal lint-modal"><h2>📊 معالج المخططات</h2><p class="lint-sub">اكتب بياناتك: كل سطر <code>اسم: قيمة</code> واختار نوع المخطط، وهو يكتب الكود ويرسمه.</p><div id="cwTypes" class="ex-chips"></div><input id="cwTitle" placeholder="عنوان المخطط" dir="rtl" value="مبيعات الأسبوع"><textarea id="cwData" rows="6" dir="rtl">سبت: 12\nأحد: 20\nاثنين: 15\nثلاثاء: 28</textarea><div class="lint-sub">الكود الناتج:</div><pre id="cwCode" class="bk-code"></pre><div class="modal-actions"><button id="cwRun" class="run">▶ ارسم</button><button id="cwCopy" class="ghost">📥 للمحرر بس</button><button id="cwClose" class="ghost">إغلاق</button></div></div>';
document.body.appendChild(back);
const types=$('#cwTypes');
TYPES.forEach(([k,l])=>{ const b=document.createElement('button'); b.className='chip'+(k===type?' on':''); b.textContent=l; b.onclick=()=>{ type=k; [...types.children].forEach(c=>c.classList.toggle('on',c===b)); upd(); }; types.appendChild(b); });
const AD={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','٫':'.'};
function parse(){ const rows=[]; $('#cwData').value.split('\n').forEach(l=>{ l=l.trim(); if(!l) return; const m=l.match(/^(.*?)[:：=،,]\s*(-?[\d٠-٩.٫]+)\s*$/)||l.match(/^(.*\S)\s+(-?[\d٠-٩.٫]+)$/); if(!m) return; const n=parseFloat(m[2].replace(/[٠-٩٫]/g,c=>AD[c])); if(isNaN(n)) return; rows.push([m[1].trim().replace(/["\\]/g,''),n]); }); return rows; }
function build(){ const rows=parse(); if(!rows.length) return '# اكتب سطر واحد على الأقل بالشكل: اسم: قيمة'; const nm='['+rows.map(r=>'"'+r[0]+'"').join('، ')+']', vl='['+rows.map(r=>r[1]).join('، ')+']'; const t=($('#cwTitle').value||'مخطط').replace(/["\\]/g,'');
  let c='استورد "مخططات"\nخلي أسماء = '+nm+'\nخلي قيم = '+vl+'\n';
  if(type==='bar') c+='مخطط_أعمدة(قيم، أسماء، "'+t+'")'; else if(type==='line'){ if(rows.length<2) return c+'# المخطط الخطي محتاج نقطتين على الأقل'; c+='مخطط_خطي(قيم، أسماء، "'+t+'")'; }
  else if(type==='pie') c+='مخطط_دائري(قيم، أسماء، "'+t+'")'; else if(type==='text') c+='شريط_نصي(قيم، أسماء)';
  else c+='اطبع_جدول(["الاسم"، "القيمة"]، ['+rows.map(r=>'["'+r[0]+'"، '+r[1]+']').join('، ')+'])';
  return c; }
function upd(){ $('#cwCode').textContent=build(); }
['#cwTitle','#cwData'].forEach(s=>$(s).addEventListener('input',upd));
function toEditor(run){ const c=build(); const ta=$('#code'); ta.value=c; ta.dispatchEvent(new Event('input',{bubbles:true})); back.classList.add('hidden'); if(run) setTimeout(()=>$('#runBtn').click(),120); }
$('#cwRun').onclick=()=>toEditor(true); $('#cwCopy').onclick=()=>toEditor(false); $('#cwClose').onclick=()=>back.classList.add('hidden');
back.addEventListener('click',e=>{ if(e.target===back) back.classList.add('hidden'); });
const anchor=$('#lintBtn'); const btn=document.createElement('button'); btn.id='chartBtn'; btn.className='ghost'; btn.title='معالج المخططات: ارسم مخطط من بياناتك'; btn.textContent='📊 مخطط';
if(anchor&&anchor.parentNode) anchor.parentNode.insertBefore(btn,anchor);
btn.onclick=()=>{ upd(); back.classList.remove('hidden'); };
})();

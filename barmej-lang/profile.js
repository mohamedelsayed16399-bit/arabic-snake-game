/* 📊 إنجازي: لوحة تقدّمك الكاملة (دروس، تحديات، مشاريع، مسار، سلسلة أيام، خريطة نشاط) */
(function(){
const $=s=>document.querySelector(s);
const AD='٠١٢٣٤٥٦٧٨٩'; const ar=n=>String(n).replace(/\d/g,d=>AD[d]);
const J=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)); return v==null?d:v; }catch(e){ return d; } };
const dayKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const AK='barmej-activity';
function bump(){ const a=J(AK,{}); const k=dayKey(new Date()); a[k]=(a[k]||0)+1; const keys=Object.keys(a).sort(); while(keys.length>400) delete a[keys.shift()]; try{ localStorage.setItem(AK,JSON.stringify(a)); }catch(e){} }
const rb=$('#runBtn'); if(rb) rb.addEventListener('click',bump);
const LEVELS=[[0,'مبتدئ 🌱'],[60,'متعلّم 📘'],[200,'مبرمج صغير 🧑‍💻'],[450,'مبرمج 💪'],[800,'محترف ⚡'],[1300,'خبير 🏆'],[2000,'أسطورة 👑']];
function stats(){
  const L=window.BARMEJ_LESSONS||[], C=window.BARMEJ_CHALLENGES||[], P=window.BARMEJ_PROJECTS||[], PA=window.BARMEJ_PATH||[];
  const ld=J('barmej-lessons-done',[]).length, cd=J('barmej-challenges-done',[]).length;
  const ps=J('barmej-projects',{}); let pd=0,pt=0; P.forEach(p=>{ pt+=(p.steps||[]).length; pd+=((ps[p.id]||{}).done||[]).length; });
  const pa=J('barmej-path',{}); let lv=0; PA.forEach((x,k)=>{ if(pa['L'+k]&&pa['L'+k].passed) lv++; });
  const d=J('barmej-daily',{}); const act=J(AK,{}); const runs=Object.values(act).reduce((a,b)=>a+b,0);
  const tests=!!localStorage.getItem('barmej-tests');
  const pts=ld*10+cd*15+pd*8+lv*60;
  return {ld,lt:L.length,cd,ct:C.length,pd,pt,lv,lvt:PA.length,streak:d.streak||0,best:d.best||0,last:d.last||'',runs,days:Object.keys(act).length,act,pts,tests};
}
function lvl(p){ let i=0; for(let k=0;k<LEVELS.length;k++) if(p>=LEVELS[k][0]) i=k; const nx=LEVELS[i+1]; return {name:LEVELS[i][1],next:nx?nx[0]:null,cur:LEVELS[i][0],i}; }
function bar(l,d,t,c){ const p=t?Math.round(100*d/t):0; return '<div class="pf-row"><span>'+l+'</span><div class="pf-bar"><div style="width:'+p+'%;background:'+c+'"></div></div><b>'+ar(d)+'/'+ar(t)+'</b></div>'; }
function heat(act){ const today=new Date(); today.setHours(12); const dow=(today.getDay()+1)%7; const weeks=16; let h='<div class="pf-heat">';
  const cells=[]; for(let w=weeks-1;w>=0;w--){ let col=''; for(let d=0;d<7;d++){ const off=w*7+(dow-d); const dt=new Date(today.getTime()-off*864e5); if(off<0){ col+='<i class="pf-c pf-x"></i>'; continue; } const n=act[dayKey(dt)]||0; const lv=n===0?0:n<3?1:n<8?2:n<20?3:4; col+='<i class="pf-c pf-l'+lv+'" title="'+dayKey(dt)+': '+n+' تشغيل"></i>'; } cells.push('<div class="pf-col">'+col+'</div>'); }
  return h+cells.join('')+'</div>'; }
function badges(s){ const b=[[s.ld>=1,'🎓','أول درس'],[s.ld>=20,'📚','٢٠ درس'],[s.ld>=s.lt&&s.lt>0,'🏅','كل الدروس'],[s.cd>=5,'⚔️','٥ تحديات'],[s.pd>=5,'🏗️','٥ خطوات مشروع'],[s.lv>=1,'🎖️','أول مستوى'],[s.lv>=s.lvt&&s.lvt>0,'👑','المسار كله'],[s.streak>=3,'🔥','٣ أيام متتالية'],[s.streak>=7,'🌋','أسبوع متتالي'],[s.runs>=50,'▶️','٥٠ تشغيل'],[s.tests,'🧪','استخدمت الاختبارات']];
  return '<div class="pf-badges">'+b.map(x=>'<span class="pf-badge'+(x[0]?'':' off')+'" title="'+x[2]+'"><big>'+x[1]+'</big><small>'+x[2]+'</small></span>').join('')+'</div>'; }
function render(){
  const body=$('#profBody'); if(!body) return; const s=stats(), v=lvl(s.pts);
  const pct=v.next?Math.round(100*(s.pts-v.cur)/(v.next-v.cur)):100;
  let nextLesson=''; const L=window.BARMEJ_LESSONS||[]; const done=new Set(J('barmej-lessons-done',[])); const nl=L.findIndex(l=>!done.has(l.id));
  if(nl>=0) nextLesson='<button class="run" id="pfNext">▶ كمّل: الدرس '+ar(nl+1)+' — '+L[nl].title.slice(0,40)+'</button>';
  body.innerHTML='<h2>📊 إنجازي</h2><div class="pf-top"><div class="pf-level"><div class="pf-lv-name">'+v.name+'</div><div class="pf-pts">'+ar(s.pts)+' نقطة</div><div class="pf-bar big"><div style="width:'+pct+'%;background:#34d399"></div></div><small>'+(v.next?'فاضل '+ar(v.next-s.pts)+' نقطة للمستوى الجاي':'وصلت لأعلى مستوى! 🎉')+'</small></div>'
   +'<div class="pf-cards"><div><b>🔥 '+ar(s.streak)+'</b><small>سلسلة التحدي اليومي (أحسن: '+ar(s.best)+')</small></div><div><b>▶️ '+ar(s.runs)+'</b><small>تشغيل</small></div><div><b>📅 '+ar(s.days)+'</b><small>يوم نشاط</small></div></div></div>'
   +'<h3>التقدم</h3>'+bar('🎓 الدروس',s.ld,s.lt,'#34d399')+bar('⚔️ التحديات',s.cd,s.ct,'#60a5fa')+bar('🏗️ خطوات المشاريع',s.pd,s.pt,'#fbbf24')+bar('🎖️ مستويات المسار',s.lv,s.lvt,'#c084fc')
   +'<h3>نشاطك (آخر ١٦ أسبوع)</h3>'+heat(s.act)+'<div class="lint-sub">كل مربع يوم، وكل ما تشغّل كود أكتر يغمق. (بيتحسب من التشغيل على الجهاز ده)</div>'
   +'<h3>الأوسمة</h3>'+badges(s)+'<div class="pf-actions">'+nextLesson+'<button class="ghost" id="pfBackup">💾 نسخة احتياطية من تقدّمي</button></div>';
  const n=$('#pfNext'); if(n) n.addEventListener('click',()=>{ document.querySelector('.tab[data-panel="lessons"]').click(); setTimeout(()=>{ const it=document.querySelectorAll('#lessonList .lesson-item')[nl]; if(it) it.click(); },80); });
  const b=$('#pfBackup'); if(b) b.addEventListener('click',()=>{ const bb=$('#backupBtn'); if(bb) bb.click(); });
}
const tab=document.querySelector('.tab[data-panel="profile"]'); if(tab) tab.addEventListener('click',render);
window.BarmejProfile={render,stats,bump};
})();

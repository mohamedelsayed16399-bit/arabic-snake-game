/* 🧪 مختبر الاختبارات: اكتب حالات اختبار لدوالك (نداء => المتوقع) وشغّلها كلها مرة واحدة */
(function(root){
const AD='٠١٢٣٤٥٦٧٨٩';
const norm=s=>String(s).replace(/[٠-٩]/g,d=>AD.indexOf(d)).replace(/٫/g,'.').replace(/\s+/g,' ').trim();
function callOnce(code,expr,maxSteps){
  const out=[]; let r;
  try{ r=root.Barmej.runSource(code+'\nاطبع '+expr,{print:s=>out.push(String(s)),ask:()=>'٥',draw:()=>{},sleep:()=>{}},{maxSteps:maxSteps||300000}); }
  catch(e){ return {ok:false,error:String(e.message||e)}; }
  if(!r.ok) return {ok:false,error:r.error};
  if(!out.length) return {ok:false,error:'الحالة ماطبعتش حاجة'};
  return {ok:true,val:out[out.length-1]};
}
function parseCases(text){
  const cs=[]; text.split('\n').forEach((l,i)=>{ const t=l.trim(); if(!t||t.startsWith('#')) return; const k=t.lastIndexOf('=>'); if(k<0){ cs.push({line:i+1,bad:true,raw:t}); return; }
    cs.push({line:i+1,expr:t.slice(0,k).trim(),expected:t.slice(k+2).trim()}); }); return cs;
}
function run(code,text){
  const cs=parseCases(text); let pass=0;
  const res=cs.map(c=>{ if(c.bad) return {ok:false,c,msg:'السطر ناقصه => (اكتب: نداء => المتوقع)'};
    const r=callOnce(code,c.expr); if(!r.ok) return {ok:false,c,msg:'خطأ: '+r.error};
    const ok=norm(r.val)===norm(c.expected.replace(/^["«]|["»]$/g,'')); if(ok) pass++; return {ok,c,got:r.val}; });
  return {res,pass,total:cs.length};
}
function snapshot(code){
  let prog; try{ prog=root.Barmej.parse(root.Barmej.tokenize(code)); }catch(e){ return {error:e.message}; }
  const fns=prog.filter(s=>s.k==='func'); const lines=[];
  const samples={0:[[]],1:[['٠'],['١'],['٣'],['٥'],['١٠'],['"مرحبا"'],['[٣، ١، ٢]']],2:[['٢','٣'],['٥','٠'],['١٠','٤'],['"أ"','٣']],3:[['١','٢','٣']]};
  for(const f of fns){ let n=0; for(const a of (samples[f.params.length]||[])){ if(n>=4) break; const expr=f.name+'('+a.join('، ')+')'; const r=callOnce(code,expr,150000); if(r.ok){ lines.push(expr+' => '+String(r.val).replace(/\d/g,d=>AD[d])); n++; } } }
  return {lines:lines.slice(0,24),fns:fns.length};
}
root.BarmejTester={run,snapshot,parseCases};
if(typeof module!=='undefined'&&module.exports) module.exports=root.BarmejTester;
})(typeof window!=='undefined'?window:globalThis);

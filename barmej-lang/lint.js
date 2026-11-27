/* فاحص الكود: مراجعة ساكنة (من غير تشغيل) للكود العربي */
(function(root){
const B=()=>root.Barmej;
function lev(a,b){ const m=[]; for(let i=0;i<=a.length;i++){ m[i]=[i]; } for(let j=0;j<=b.length;j++) m[0][j]=j;
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return m[a.length][b.length]; }
function lint(src){
  const issues=[]; const add=(sev,line,msg,tip)=>issues.push({sev,line:line||1,msg,tip:tip||''});
  let prog;
  try{ prog=B().parse(B().tokenize(src)); }catch(e){ add('err',e.line,'خطأ في كتابة الكود: '+e.message,'صلّحه الأول وبعدين افحص تاني'); return finish(issues,src); }
  const builtin=new Set(B().builtinNames().concat(['هذا','أب','self','خريطة','صفّي','اختزل','جد','أي','كل','رتب_حسب','عداد']));
  const known=new Set(builtin);
  let inTry=0; const usedNames=new Set(); const numCount={}; const declared=[]; 
  const scopes=[];
  const push=()=>scopes.push(Object.create(null)); const pop=()=>{ const sc=scopes.pop(); for(const n in sc){ const d=sc[n]; if(!d.used&&d.kind==='let'&&!n.startsWith('_')) add('warn',d.line,'المتغير «'+n+'» اتعمل ومحدش استخدمه','امسحه أو استخدمه، أو ابدأ اسمه بـ _ لو مقصود'); if(!d.used&&d.kind==='func'&&scopes.length<=1) add('info',d.line,'الدالة «'+n+'» متعرّفة ومش بتتنادي في الكود'); } };
  const find=n=>{ for(let i=scopes.length-1;i>=0;i--) if(scopes[i][n]) return scopes[i][n]; return null; };
  const decl=(n,kind,line)=>{ const cur=scopes[scopes.length-1];
    if(cur[n]&&kind==='let'&&cur[n].kind==='let') add('warn',line,'المتغير «'+n+'» اتعرّف تاني بـ«خلي» في نفس المكان','لتغيير القيمة اكتب: '+n+' = قيمة (من غير خلي)');
    else if(kind==='let'&&scopes.length>1){ for(let i=scopes.length-2;i>=0;i--) if(scopes[i][n]&&scopes[i][n].kind==='let'){ add('info',line,'«'+n+'» بتغطّي على متغير بنفس الاسم برّه الكتلة','غيّر الاسم عشان ما تتلخبطش'); break; } }
    cur[n]={kind,line,used:kind!=='let'&&kind!=='func'?true:false};
    if(kind==='let'&&[...n].length===1&&!/^[ي-ي]$/.test(n)&&0) {} };
  function lineCount(body){ let mn=1e9,mx=0; (function w(x){ if(!x||typeof x!=='object') return; if(Array.isArray(x)){ x.forEach(w); return; } if(typeof x.line==='number'){ mn=Math.min(mn,x.line); mx=Math.max(mx,x.line); } for(const k in x) if(k!=='line') w(x[k]); })(body); return mx-mn+1; }
  function hasKind(x,kinds,stopFn){ let f=false; (function w(y){ if(f||!y||typeof y!=='object') return; if(Array.isArray(y)){ y.forEach(w); return; } if(kinds.includes(y.k)){ f=true; return; } if(stopFn&&(y.k==='func'||y.k==='lambda')) return; for(const k in y) if(k!=='line') w(y[k]); })(x); return f; }
  function callsName(x,name){ let f=false; (function w(y){ if(f||!y||typeof y!=='object') return; if(Array.isArray(y)){ y.forEach(w); return; } if(y.k==='call'&&y.fn&&y.fn.k==='var'&&y.fn.name===name){ f=true; return; } for(const k in y) if(k!=='line') w(y[k]); })(x); return f; }
  function hoist(body){ for(const s of body){ if(s.k==='func') decl(s.name,'func',s.line); else if(s.k==='class') decl(s.name,'class',s.line); else if(s.k==='import'){ const src=B().LIBS[s.name]; if(src){ try{ const p=B().parse(B().tokenize(src)); for(const t of p){ if(t.name) known.add(t.name); } }catch(e){} } else known.add('__lib_'+s.name); } } }
  function block(body,depth,fnCtx){
    hoist(body);
    let dead=false;
    for(let i=0;i<body.length;i++){ const s=body[i];
      if(dead){ add('warn',s.line,'الكود ده عمره ما هيشتغل: واقع بعد ارجع/قف/كمل','امسحه أو حرّكه فوق'); dead=false; }
      stmt(s,depth,fnCtx);
      if(s.k==='return'||s.k==='break'||s.k==='continue') dead=true;
    }
  }
  function fnBody(name,params,body,line,isLambda){
    push(); params.forEach(p=>decl(p,'param',line)); 
    const n=lineCount(body);
    if(!isLambda&&n>22) add('info',line,'الدالة «'+name+'» طويلة ('+n+' سطر)','قسّمها لدوال أصغر، كل واحدة تعمل حاجة واحدة');
    if(!isLambda&&name&&callsName(body,name)){ if(!hasKind(body,['if'],true)) add('err',line,'«'+name+'» بتنادي نفسها من غير شرط توقف (لو)','ضيف حالة أساسية: لو ... { ارجع ... } وإلا هتلف للأبد'); }
    block(body,0,true); pop();
  }
  function stmt(s,depth,fnCtx){
    switch(s.k){
      case 'let': expr(s.e); decl(s.name,'let',s.line); break;
      case 'set': expr(s.e); { const d=find(s.name); if(d){ } else if(!known.has(s.name)) add('err',s.line,'«'+s.name+'» مش متعرّف قبل كده','اكتب: خلي '+s.name+' = ... في الأول'); } break;
      case 'setindex': expr(s.target); expr(s.e); break;
      case 'print': expr(s.e); break;
      case 'expr': expr(s.e); break;
      case 'return': if(s.e) expr(s.e); break;
      case 'if': expr(s.cond); sub(s.then,depth+1,fnCtx,s.line,'لو'); for(const e of s.elifs){ expr(e.cond); sub(e.body,depth+1,fnCtx,s.line,'لو'); } if(s.els) sub(s.els,depth+1,fnCtx,s.line,'وإلا'); break;
      case 'while': expr(s.cond);
        if(s.cond.k==='bool'&&s.cond.v===true&&!hasKind(s.body,['break','return'],true)&&!callsName(s.body,'استنى')&&!callsName(s.body,'انتظر')) add('err',s.line,'حلقة «طالما صح» من غير قف ولا ارجع: هتلف للأبد','ضيف: لو الشرط { قف }');
        sub(s.body,depth+1,fnCtx,s.line,'طالما'); break;
      case 'repeat': expr(s.count); push(); if(s.varName) decl(s.varName,'param',s.line); sub(s.body,depth+1,fnCtx,s.line,'كرر',true); pop(); break;
      case 'foreach': expr(s.list); push(); decl(s.varName,'param',s.line); sub(s.body,depth+1,fnCtx,s.line,'لكل',true); pop(); break;
      case 'func': fnBody(s.name,s.params,s.body,s.line,false); break;
      case 'class': { if(s.parent&&!find(s.parent)&&!known.has(s.parent)) add('err',s.line,'الصنف الأب «'+s.parent+'» مش موجود'); for(const m of s.methods||[]) fnBody(m.name,m.params,m.body,m.line,true); } break;
      case 'try': inTry++; sub(s.body,depth+1,fnCtx,s.line,'جرّب'); inTry--; push(); if(s.varName) decl(s.varName,'param',s.line); sub(s.catchBody,depth+1,fnCtx,s.line,'لو_خطأ',true); pop(); break;
      case 'break': case 'continue': break;
    }
  }
  function sub(body,depth,fnCtx,line,kw,noscope){
    if(!body.length) add('info',line,'كتلة «'+kw+'» فاضية','اكتب جواها الكود أو امسحها');
    if(depth===5) add('info',line,'الكود متداخل جداً (٥ مستويات)','فكّر تنقل جزء لدالة منفصلة');
    if(!noscope) push(); block(body,depth,fnCtx); if(!noscope) pop();
  }
  function expr(e){
    if(!e||typeof e!=='object') return;
    switch(e.k){
      case 'var': { const d=find(e.name); if(d) d.used=true; else if(!known.has(e.name)){ let best=null,bd=3; const all=[...known].filter(n=>!n.startsWith('__lib_')); for(let i=scopes.length-1;i>=0;i--) for(const n in scopes[i]) all.push(n); for(const n of all){ const dd=lev(e.name,n); if(dd<bd){ bd=dd; best=n; } }
        add('err',e.line,'«'+e.name+'» مش معروف'+(best?' — تقصد «'+best+'»؟':''),'اتأكد من الإملاء، أو استورد المكتبة الناقصة'); } break; }
      case 'num': if(![0,1,2,10,100].includes(e.v)) numCount[e.v]=(numCount[e.v]||[]).concat(e.line); break;
      case 'bin': expr(e.l); expr(e.r); if(!inTry&&(e.op==='/'||e.op==='%')&&e.r.k==='num'&&e.r.v===0) add('err',e.line,'قسمة على صفر','ممنوعة: غيّر المقسوم عليه'); if(e.op==='=='&&e.l.k==='var'&&e.r.k==='var'&&e.l.name===e.r.name) add('warn',e.line,'بتقارن «'+e.l.name+'» بنفسه: النتيجة دايماً صح'); break;
      case 'neg': case 'not': expr(e.e); break;
      case 'list': e.items.forEach(expr); break;
      case 'dict': (e.pairs||[]).forEach(p=>expr(p.e)); break;
      case 'index': expr(e.obj); expr(e.idx); break;
      case 'call': expr(e.fn); e.args.forEach(expr); break;
      case 'new': { if(!find(e.name)&&!known.has(e.name)) add('err',e.line,'الصنف «'+e.name+'» مش معرّف'); else { const d=find(e.name); if(d) d.used=true; } e.args.forEach(expr); break; }
      case 'lambda': fnBody('',e.params,e.body,e.line,true); break;
    }
  }
  push(); block(prog,0,false); pop();
  for(const n in numCount){ if(numCount[n].length>=3) add('info',numCount[n][0],'الرقم '+n+' اتكرر '+numCount[n].length+' مرات','حطه في متغير باسم واضح (ثابت) وغيّره من مكان واحد'); }
  src.split('\n').forEach((l,i)=>{ if(l.length>90) add('info',i+1,'السطر طويل ('+l.length+' حرف)','قسّمه على أكتر من سطر'); });
  return finish(issues,src,prog);
}
function finish(issues,src){
  issues.sort((a,b)=>a.line-b.line);
  const c={err:0,warn:0,info:0}; issues.forEach(i=>c[i.sev]++);
  const score=Math.max(0,100-c.err*18-c.warn*7-c.info*2);
  const grade=score>=95?'ممتاز 🏆':score>=80?'كويس جداً 👍':score>=60?'مقبول 🙂':'محتاج تظبيط 🔧';
  const lines=src.split('\n').filter(l=>l.trim()&&!l.trim().startsWith('#')).length;
  return {issues,counts:c,score,grade,lines};
}
root.BarmejLint={lint};
if(typeof module!=='undefined'&&module.exports) module.exports=root.BarmejLint;
})(typeof window!=='undefined'?window:globalThis);

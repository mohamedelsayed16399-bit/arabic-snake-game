/* برمِج — لغة برمجة عربية: محلل ومفسّر (يعمل في المتصفح و Node) */
(function (root) {
'use strict';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function normDigits(s){ return s.replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d))).replace(/٫/g,'.'); }

const KEYWORDS = {
  'اطبع':'PRINT','اكتب':'PRINT',
  'خلي':'LET','متغير':'LET',
  'لو':'IF','وإلا':'ELSE','والا':'ELSE','إلا':'ELSE',
  'طالما':'WHILE','كرر':'REPEAT','لكل':'FOREACH','في':'IN',
  'دالة':'FUNC','ارجع':'RETURN','رجع':'RETURN',
  'صحيح':'TRUE','صح':'TRUE','غلط':'FALSE','خطأ':'FALSE',
  'فراغ':'NULL','لاشيء':'NULL',
  'و':'AND','أو':'OR','او':'OR','مش':'NOT','ليس':'NOT',
  'قف':'BREAK','كمل':'CONTINUE','استمر':'CONTINUE',
  'جرّب':'TRY','جرب':'TRY','لو_خطأ':'CATCH',
  'نهاية':'END'
};

class BError extends Error { constructor(msg,line){ super(msg); this.line=line; this.isBarmej=true; } }

/* ---------- Lexer ---------- */
function tokenize(src){
  src = normDigits(src);
  const toks=[]; let i=0, line=1;
  const isDig=c=>c>='0'&&c<='9';
  const isAlpha=c=>/[\u0620-\u065F\u066E-\u06D3a-zA-Z_]/.test(c);
  while(i<src.length){
    const c=src[i];
    if(c==='\n'){ toks.push({t:'NL',line}); line++; i++; continue; }
    if(c===' '||c==='\t'||c==='\r'){ i++; continue; }
    if(c==='#'||(c==='/'&&src[i+1]==='/')){ while(i<src.length&&src[i]!=='\n') i++; continue; }
    if(isDig(c)||(c==='.'&&isDig(src[i+1]))){
      let j=i; while(j<src.length&&(isDig(src[j])||src[j]==='.')) j++;
      toks.push({t:'NUM',v:parseFloat(src.slice(i,j)),line}); i=j; continue;
    }
    if(c==='"'||c==="'"){
      let j=i+1,s='';
      while(j<src.length&&src[j]!==c){
        if(src[j]==='\\'){ const n=src[j+1]; s+= n==='n'?'\n':n==='t'?'\t':n; j+=2; }
        else { s+=src[j]; j++; }
      }
      if(j>=src.length) throw new BError('نص غير مقفول: ناقص علامة تنصيص',line);
      toks.push({t:'STR',v:s,line}); i=j+1; continue;
    }
    if(isAlpha(c)){
      let j=i; while(j<src.length&&(isAlpha(src[j])||isDig(src[j]))) j++;
      const w=src.slice(i,j);
      if(KEYWORDS[w]) toks.push({t:KEYWORDS[w],line});
      else toks.push({t:'ID',v:w,line});
      i=j; continue;
    }
    const two=src.slice(i,i+2);
    if(['==','!=','<=','>=','&&','||'].includes(two)){
      toks.push({t: two==='&&'?'AND': two==='||'?'OR': two, line}); i+=2; continue;
    }
    if('+-*/%^=<>!,(){}[].:'.includes(c)){ toks.push({t:c,line}); i++; continue; }
    if(c==='،'||c===','){ toks.push({t:',',line}); i++; continue; }
    if(c==='؛'||c===';'){ toks.push({t:'NL',line}); i++; continue; }
    if(c==='؟'||c==='?'){ toks.push({t:'?',line}); i++; continue; }
    throw new BError('رمز غير مفهوم: '+c,line);
  }
  toks.push({t:'EOF',line});
  return toks;
}

/* ---------- Parser ---------- */
function parse(toks){
  let p=0;
  const peek=()=>toks[p], next=()=>toks[p++];
  const skipNL=()=>{ while(peek().t==='NL') p++; };
  const expect=(t,msg)=>{ skipNLIfInline(); const tk=next(); if(tk.t!==t) throw new BError(msg||('متوقع '+t+' لكن وجدت «'+(tk.v||tk.t)+'»'),tk.line); return tk; };
  const skipNLIfInline=()=>{};
  function parseBlock(){
    skipNL(); expect('{','متوقع { لبداية الكتلة');
    const body=[];
    while(true){ skipNL(); if(peek().t==='}'){ p++; break; } if(peek().t==='EOF') throw new BError('كتلة غير مقفولة: ناقص }',peek().line); body.push(parseStmt()); }
    return body;
  }
  function parseStmt(){
    skipNL(); const tk=peek(); let node;
    if(tk.t==='PRINT'){ p++; node={k:'print',e:parseExpr(),line:tk.line}; }
    else if(tk.t==='LET'){ p++; const n=expect('ID','متوقع اسم المتغير بعد «خلي»'); skipNL(); expect('=','متوقع = بعد اسم المتغير'); node={k:'let',name:n.v,e:parseExpr(),line:tk.line}; }
    else if(tk.t==='IF'){
      p++; const cond=parseExpr(); const then=parseBlock(); const elifs=[]; let els=null;
      while(true){ const save=p; skipNL();
        if(peek().t==='ELSE'){ p++; skipNL();
          if(peek().t==='IF'){ p++; elifs.push({cond:parseExpr(),body:parseBlock()}); }
          else { els=parseBlock(); break; }
        } else { p=save; break; }
      }
      node={k:'if',cond,then,elifs,els,line:tk.line};
    }
    else if(tk.t==='WHILE'){ p++; node={k:'while',cond:parseExpr(),body:parseBlock(),line:tk.line}; }
    else if(tk.t==='REPEAT'){ p++; const count=parseExpr(); let varName=null; skipNL();
      if(peek().t===',' ){ p++; skipNL(); if(peek().t==='ID'){ varName=next().v; } }
      node={k:'repeat',count,varName,body:parseBlock(),line:tk.line}; }
    else if(tk.t==='FOREACH'){ p++; const v=expect('ID','متوقع اسم بعد «لكل»'); skipNL(); expect('IN','متوقع «في» بعد الاسم'); node={k:'foreach',varName:v.v,list:parseExpr(),body:parseBlock(),line:tk.line}; }
    else if(tk.t==='ID'&&tk.v==='استورد'&&toks[p+1].t==='STR'){ p++; node={k:'import',name:next().v,line:tk.line}; }
    else if(tk.t==='FUNC'&&toks[p+1].t==='('){ node={k:'expr',e:parseExpr(),line:tk.line}; }
    else if(tk.t==='FUNC'){ p++; const n=expect('ID','متوقع اسم الدالة'); skipNL(); expect('(','متوقع ( بعد اسم الدالة');
      const params=[]; skipNL(); if(peek().t!==')'){ do{ skipNL(); params.push(expect('ID','متوقع اسم معامل').v); skipNL(); }while(peek().t===','&&p++); }
      expect(')','متوقع )'); node={k:'func',name:n.v,params,body:parseBlock(),line:tk.line}; }
    else if(tk.t==='RETURN'){ p++; skipNL(); node={k:'return',e:(peek().t==='NL'||peek().t==='}'||peek().t==='EOF')?null:parseExpr(),line:tk.line}; }
    else if(tk.t==='ID'&&tk.v==='صنف'&&toks[p+1].t==='ID'){ p++; const n=expect('ID','متوقع اسم الصنف'); skipNL(); let parent=null;
      if(peek().t==='ID'&&peek().v==='يرث'){ p++; parent=expect('ID','متوقع اسم الصنف الأب بعد «يرث»').v; }
      const body=parseBlock(); const methods=[];
      for(const m of body){ if(m.k!=='func') throw new BError('جوه الصنف مسموح بس بالدوال (الدوال هي الأفعال بتاعته)',m.line); methods.push(m); }
      node={k:'class',name:n.v,parent,methods,line:tk.line}; }
    else if(tk.t==='BREAK'){ p++; node={k:'break',line:tk.line}; }
    else if(tk.t==='CONTINUE'){ p++; node={k:'continue',line:tk.line}; }
    else if(tk.t==='TRY'){ p++; const body=parseBlock(); skipNL(); expect('CATCH','متوقع «لو_خطأ» بعد كتلة جرّب');
      skipNL(); let varName=null; if(peek().t==='ID') varName=next().v;
      node={k:'try',body,varName,catchBody:parseBlock(),line:tk.line}; }
    else {
      const save=p; let candidate=null; let ok=false;
      try{ const base={k:'var',name:peek().v,line:peek().line}; p++;
        candidate=parsePostfix(base);
        if((candidate.k==='var'||candidate.k==='index')&&peek().t==='=') ok=true;
      }catch(e){ ok=false; }
      if(ok){ p++; const e=parseExpr();
        if(candidate.k==='var') node={k:'set',name:candidate.name,e,line:tk.line};
        else node={k:'setindex',target:candidate,e,line:tk.line};
      } else { p=save; node={k:'expr',e:parseExpr(),line:tk.line}; }
    }
    return node;
  }
  /* expressions: or -> and -> cmp -> add -> mul -> unary -> postfix -> primary */
  function parseExpr(){ return parseOr(); }
  function parseOr(){ let l=parseAnd(); while(true){ skipNL(); if(peek().t==='OR'){ p++; l={k:'bin',op:'||',l,r:parseAnd(),line:peek().line}; } else return l; } }
  function parseAnd(){ let l=parseCmp(); while(true){ skipNL(); if(peek().t==='AND'){ p++; l={k:'bin',op:'&&',l,r:parseCmp(),line:peek().line}; } else return l; } }
  function parseCmp(){ let l=parseAdd(); while(true){ skipNL(); const t=peek().t;
    if(['==','!=','<','>','<=','>='].includes(t)){ p++; l={k:'bin',op:t,l,r:parseAdd(),line:peek().line}; } else return l; } }
  function parseAdd(){ let l=parseMul(); while(true){ const t=peek().t; if(t==='+'||t==='-'){ p++; l={k:'bin',op:t,l,r:parseMul(),line:peek().line}; } else return l; } }
  function parseMul(){ let l=parseUnary(); while(true){ const t=peek().t; if(t==='*'||t==='/'||t==='%'||t==='^'){ p++; l={k:'bin',op:t,l,r:parseUnary(),line:peek().line}; } else return l; } }
  function parseUnary(){ const t=peek().t;
    if(t==='-'){ p++; return {k:'neg',e:parseUnary(),line:peek().line}; }
    if(t==='NOT'||t==='!'){ p++; return {k:'not',e:parseUnary(),line:peek().line}; }
    return parsePostfix(parsePrimary()); }
  function parsePostfix(e){
    while(true){
      if(peek().t==='('){ p++; const args=[]; skipNL();
        if(peek().t!==')'){ do{ skipNL(); args.push(parseExpr()); skipNL(); }while(peek().t===','&&p++); }
        expect(')','متوقع ) بعد المعاملات'); e={k:'call',fn:e,args,line:peek().line}; }
      else if(peek().t==='['){ p++; const idx=parseExpr(); skipNL(); expect(']','متوقع ]'); e={k:'index',obj:e,idx,line:peek().line}; }
      else if(peek().t==='.'){ p++; const prop=expect('ID','متوقع خاصية بعد النقطة'); e={k:'index',obj:e,idx:{k:'str',v:prop.v},line:peek().line}; }
      else return e;
    }
  }
  function parsePrimary(){
    skipNL(); const tk=next();
    if(tk.t==='NUM') return {k:'num',v:tk.v,line:tk.line};
    if(tk.t==='STR') return {k:'str',v:tk.v,line:tk.line};
    if(tk.t==='TRUE') return {k:'bool',v:true,line:tk.line};
    if(tk.t==='FALSE') return {k:'bool',v:false,line:tk.line};
    if(tk.t==='NULL') return {k:'null',line:tk.line};
    if(tk.t==='FUNC'){ expect('(','متوقع ( بعد «دالة»'); const params=[]; skipNL();
      if(peek().t!==')'){ do{ skipNL(); params.push(expect('ID','متوقع اسم معامل').v); skipNL(); }while(peek().t===','&&p++); }
      expect(')','متوقع )'); let body;
      if(peek().t===':'){ p++; const e=parseExpr(); body=[{k:'return',e,line:tk.line}]; } else body=parseBlock();
      return {k:'lambda',params,body,line:tk.line}; }
    if(tk.t==='ID'&&tk.v==='جديد'&&peek().t==='ID'){ const n=expect('ID','متوقع اسم الصنف بعد «جديد»'); const args=[];
      if(peek().t==='('){ p++; skipNL(); if(peek().t!==')'){ do{ skipNL(); args.push(parseExpr()); skipNL(); }while(peek().t===','&&p++); } expect(')','متوقع ) بعد المعاملات'); }
      return {k:'new',name:n.v,args,line:tk.line}; }
    if(tk.t==='ID') return {k:'var',name:tk.v,line:tk.line};
    if(tk.t==='('){ const e=parseExpr(); skipNL(); expect(')','متوقع )'); return e; }
    if(tk.t==='['){ const items=[]; skipNL();
      if(peek().t!==']'){ do{ skipNL(); items.push(parseExpr()); skipNL(); }while(peek().t===','&&p++); }
      skipNL(); expect(']','متوقع ] للقائمة'); return {k:'list',items,line:tk.line}; }
    if(tk.t==='{'){ const pairs=[]; skipNL();
      if(peek().t!=='}'){ do{ skipNL(); const keyTok=next();
          const key = keyTok.t==='STR'? keyTok.v : keyTok.t==='ID'? keyTok.v : (()=>{throw new BError('مفتاح القاموس لازم يكون نص أو اسم',keyTok.line)})();
          skipNL(); expect(':','متوقع : بعد مفتاح القاموس'); pairs.push({key,e:parseExpr()}); skipNL();
        }while(peek().t===','&&p++); }
      skipNL(); expect('}','متوقع } للقاموس'); return {k:'dict',pairs,line:tk.line}; }
    throw new BError('تعبير غير مفهوم قرب «'+(tk.v||tk.t)+'»',tk.line);
  }
  const prog=[]; skipNL();
  while(peek().t!=='EOF'){ prog.push(parseStmt()); skipNL(); }
  return prog;
}


/* ---------- مكتبات جاهزة (مكتوبة بلغة برمج نفسها!) ---------- */
const LIBS={
'رياضيات':`دالة مضروب(ن) {
  لو ن <= ١ { ارجع ١ }
  ارجع ن * مضروب(ن - ١)
}
دالة قاسم_مشترك(أ، ب) {
  طالما ب != ٠ {
    خلي ت = ب
    ب = أ % ب
    أ = ت
  }
  ارجع أ
}
دالة أولي(ن) {
  لو ن < ٢ { ارجع غلط }
  خلي د = ٢
  طالما د * د <= ن {
    لو ن % د == ٠ { ارجع غلط }
    د = د + ١
  }
  ارجع صح
}
دالة فيبوناتشي(ن) {
  خلي أ = ٠
  خلي ب = ١
  كرر ن {
    خلي ت = أ + ب
    أ = ب
    ب = ت
  }
  ارجع أ
}
دالة متوسط(ق) { ارجع مجموع(ق) / طول(ق) }
دالة وسيط(ق) {
  خلي ر = رتب(ق)
  خلي ن = طول(ر)
  لو ن % ٢ == ١ { ارجع ر[(ن - ١) / ٢] }
  ارجع (ر[ن / ٢ - ١] + ر[ن / ٢]) / ٢
}`,
'نصوص':`دالة عدد_الكلمات(ن) { ارجع طول(فصل(ن، " ")) }
دالة متناظر(ن) { ارجع اعكس(ن) == ن }
دالة أطول_كلمة(ن) {
  خلي أ = ""
  لكل ك في فصل(ن، " ") {
    لو طول(ك) > طول(أ) { أ = ك }
  }
  ارجع أ
}
دالة تكرار_الحروف(ن) {
  خلي ع = {}
  لكل ح في حروف(ن) {
    لو ح != " " {
      ع[ح] = عدد_مرات(ن، ح)
    }
  }
  ارجع ع
}`,
'قوائم':`دالة مجموعات(ق، ن) {
  خلي خارج = []
  خلي م = []
  لكل س في ق {
    أضف(م، س)
    لو طول(م) == ن {
      أضف(خارج، م)
      م = []
    }
  }
  لو طول(م) > ٠ { أضف(خارج، م) }
  ارجع خارج
}
دالة تسطيح(ق) {
  خلي خارج = []
  لكل س في ق {
    لو نوع(س) == "قائمة" {
      لكل ص في تسطيح(س) { أضف(خارج، ص) }
    } وإلا { أضف(خارج، س) }
  }
  ارجع خارج
}
دالة تقاطع(أ، ب) { ارجع صفّي(فريد(أ)، دالة(س): يحتوي(ب، س)) }
دالة اتحاد(أ، ب) {
  خلي خ = فريد(أ)
  لكل س في ب {
    لو مش يحتوي(خ، س) { أضف(خ، س) }
  }
  ارجع خ
}`
};

/* ---------- Interpreter ---------- */
function arNum(n){
  if(typeof n!=='number') return n;
  if(Number.isInteger(n)) return String(n);
  return String(Math.round(n*1e10)/1e10);
}
function show(v,d){
  d=d||0;
  if(v===null||v===undefined) return 'فراغ';
  if(v===true) return 'صحيح';
  if(v===false) return 'غلط';
  if(typeof v==='number') return arNum(v);
  if(typeof v==='string') return v;
  if(v.__fn) return '<دالة '+v.name+'>';
  if(v.__builtin) return '<دالة '+v.name+'>';
  if(v.__class) return '<صنف '+v.name+'>';
  if(d>4) return '…';
  if(Array.isArray(v)) return '['+v.map(x=>show(x,d+1)).join('، ')+']';
  if(typeof v==='object') return (v.__cls?v.__cls+' ':'')+'{ '+Object.keys(v).map(k=>k+': '+show(v[k],d+1)).join('، ')+' }';
  return String(v);
}

function makeEnv(parent){ return {vars:Object.create(null),parent}; }
function levenshtein(a,b){
  const m=a.length,n=b.length; if(!m) return n; if(!n) return m;
  let prev=[]; for(let j=0;j<=n;j++) prev[j]=j;
  for(let i=1;i<=m;i++){ const cur=[i];
    for(let j=1;j<=n;j++) cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev=cur; }
  return prev[n];
}
function closestName(name,candidates){
  let best=null,bd=3;
  for(const c of candidates){ const d=levenshtein(name,c);
    if(d<bd){ bd=d; best=c; } }
  return best;
}
function envGet(env,name,line){
  let e=env; while(e){ if(name in e.vars) return e.vars[name]; e=e.parent; }
  const all=[]; e=env; while(e){ for(const k in e.vars) all.push(k); e=e.parent; }
  const sug=closestName(name,all);
  throw new BError('متغير غير معروف: «'+name+'»'+(sug?' — هل تقصد «'+sug+'»؟':' — اتأكد إنك عرّفته بـ«خلي» قبل ما تستخدمه'),line);
}
function envSet(env,name,val){
  let e=env; while(e){ if(name in e.vars){ e.vars[name]=val; return; } e=e.parent; }
  env.vars[name]=val;
}

function builtins(io){
  const B={};
  B['طول']=x=> (typeof x==='string'||Array.isArray(x))? x.length : (x&&typeof x==='object'? Object.keys(x).length : 0);
  B['أضف']=(l,x)=>{ if(!Array.isArray(l)) throw new BError('«أضف» تعمل على قوائم فقط'); l.push(x); return l; };
  B['احذف']=(l,i)=>{ if(Array.isArray(l)){ return l.splice(i,1)[0]; } throw new BError('«احذف» تعمل على قوائم فقط'); };
  B['يحتوي']=(l,x)=> Array.isArray(l)? l.includes(x) : (typeof l==='string'? l.includes(String(x)) : (x in Object(l)));
  B['عشوائي']=(a,b)=>{ if(Array.isArray(a)) return a[Math.floor(Math.random()*a.length)];
    if(a===undefined) return Math.random();
    if(b===undefined) return Math.floor(Math.random()*a);
    return a+Math.floor(Math.random()*(b-a+1)); };
  B['قرب']=(x,d)=>{ const m=Math.pow(10,d||0); return Math.round(x*m)/m; };
  B['جذر']=x=>Math.sqrt(x); B['مطلق']=x=>Math.abs(x);
  B['أكبر']=(...a)=>Math.max(...a.flat()); B['أصغر']=(...a)=>Math.min(...a.flat());
  B['نص']=x=>show(x); B['رقم']=x=>{ const n=parseFloat(normDigits(String(x))); if(isNaN(n)) throw new BError('لا يمكن تحويل «'+x+'» إلى رقم'); return n; };
  B['جزء']=(s,a,b)=> String(s).slice(a,b);
  B['حروف']=s=> String(s).split('');
  B['أول']=x=>{ const v=typeof x==='string'?x.split(''):x; if(!Array.isArray(v)||!v.length) throw new BError('«أول» محتاجة قائمة أو نص مش فاضي'); return v[0]; };
  B['آخر']=x=>{ const v=typeof x==='string'?x.split(''):x; if(!Array.isArray(v)||!v.length) throw new BError('«آخر» محتاجة قائمة أو نص مش فاضي'); return v[v.length-1]; };
  B['فريد']=l=>{ if(!Array.isArray(l)) throw new BError('«فريد» تعمل على قوائم فقط'); const o=[]; for(const x of l) if(!o.includes(x)) o.push(x); return o; };
  B['عدد_مرات']=(x,y)=>{ const v=typeof x==='string'?x.split(''):x; if(!Array.isArray(v)) throw new BError('«عدد_مرات» محتاجة قائمة أو نص'); return v.filter(e=>e===y).length; };
  B['فصل']=(s,sep)=> String(s).split(sep===undefined?' ':String(sep));
  B['وصل']=(l,sep)=> (Array.isArray(l)?l:[]).map(x=>show(x)).join(sep===undefined?'':String(sep));
  B['نوع']=x=> (x&&x.__cls)?x.__cls: Array.isArray(x)?'قائمة': x===null?'فراغ': typeof x==='object'?'قاموس': typeof x==='number'?'رقم': typeof x==='string'?'نص': typeof x==='boolean'?'منطقي':'دالة';
  B['مفاتيح']=o=> Object.keys(Object(o));
  B['بدل']=(s,a,b)=> String(s).split(String(a)).join(String(b)); B['بدّل']=B['بدل'];
  B['رتب']=(l,desc)=>{ if(!Array.isArray(l)) throw new BError('«رتب» تعمل على قوائم فقط');
    const c=[...l].sort((x,y)=> typeof x==='string'? String(x).localeCompare(String(y),'ar') : x-y);
    return (desc&&desc!==false&&desc!==0&&desc!=='')? c.reverse() : c; }; B['رتّب']=B['رتب'];
  B['اعكس']=x=> Array.isArray(x)? [...x].reverse() : String(x).split('').reverse().join('');
  B['مجموع']=l=>{ if(!Array.isArray(l)) throw new BError('«مجموع» تعمل على قوائم فقط'); return l.reduce((a,b)=>a+(typeof b==='number'?b:parseFloat(normDigits(String(b)))||0),0); };
  B['اخلط']=l=>{ if(!Array.isArray(l)) throw new BError('«اخلط» تعمل على قوائم فقط');
    const c=[...l]; for(let i=c.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=c[i]; c[i]=c[j]; c[j]=t; } return c; };
  B['فهرس']=(l,x)=> Array.isArray(l)? l.indexOf(x) : String(l).indexOf(String(x));
  B['كرر_نص']=(s,n)=> String(s).repeat(Math.max(0,Math.floor(Number(n)||0)));
  B['قيم']=o=> Object.values(Object(o));
  B['اسأل']=(q)=>{ const s=String(q===undefined?'':q);
    if(io.askAsync) return {__ask:s};
    return io.ask? io.ask(s) : ''; };
  B['اختار']=(q,opts)=>{ const s=String(q===undefined?'':q);
    const list=Array.isArray(opts)? opts.map(o=>show(o)) : [];
    if(io.chooseAsync) return {__choose:s, opts:list};
    if(io.choose) return io.choose(s,list);
    if(io.ask){ const a=io.ask(s+' ('+list.join(' / ')+')'); return a===null?'':a; }
    return list[0]||''; };
  B['اطبع']=(...a)=>{ io.print(a.map(x=>show(x)).join(' ')); return null; };
  B['امسح']=()=>{ io.clear&&io.clear(); return null; };
  const N=x=>{ const v=parseFloat(normDigits(String(x))); return isNaN(v)?0:v; };
  const D=(op,args)=>{ if(io.draw){ const r=io.draw(Object.assign({op},args)); if(r&&typeof r==='object'&&r.__sleep!==undefined) return r; } return null; };
  B['قدم']=n=>D('fd',{n:N(n)}); B['تقدم']=B['قدم'];
  B['ورا']=n=>D('bk',{n:N(n)}); B['ارجع_ورا']=B['ورا'];
  B['يمين']=z=>D('rt',{z:N(z)}); B['شمال']=z=>D('lt',{z:N(z)});
  B['لون']=c=>D('color',{c:String(c)});
  B['سمك']=n=>D('width',{n:N(n)});
  B['ارفع']=()=>D('up',{}); B['انزل']=()=>D('down',{});
  B['اذهب']=(x,y)=>D('goto',{x:N(x),y:N(y)});
  B['دائرة']=r=>D('circle',{r:N(r)});
  B['نقطة']=n=>D('dot',{n:N(n)||6});
  B['امسح_اللوحة']=()=>D('clear',{});
  B['مستطيل']=(w,h)=>D('rect',{w:N(w),h:N(h)});
  B['املأ']=()=>D('fill',{});
  B['نص_على_اللوحة']=(t,size)=>D('text',{t:String(t),size:N(size)||22});
  B['صوت']=(freq,ms)=>{ if(io.beep) io.beep(N(freq)||440,N(ms)||200); return null; };
  B['نغمة']=n=>{ const NOTES={'دو':261.6,'ري':293.7,'مي':329.6,'فا':349.2,'صول':392,'لا':440,'سي':493.9,'دو_عالية':523.3};
    const f=typeof n==='number'? n : NOTES[String(n)]; if(!f) throw new BError('نغمة غير معروفة: «'+n+'» — المتاح: دو ري مي فا صول لا سي');
    if(io.beep) io.beep(f,300); return null; };
  B['وقت']=()=>Date.now();
  B['ساعات']=()=>new Date().getHours();
  B['دقائق']=()=>new Date().getMinutes();
  B['ثواني']=()=>new Date().getSeconds();
  const RAD=Math.PI/180;
  B['جيب']=z=>Math.sin(N(z)*RAD); B['جتا']=z=>Math.cos(N(z)*RAD); B['ظا']=z=>Math.tan(N(z)*RAD);
  B['مدى']=(a,b)=>{ const from=b===undefined?1:N(a), to=b===undefined?N(a):N(b);
    const out=[]; for(let i=from;i<=to;i++) out.push(i); return out; };
  B['قطع']=(l,a,b)=> (Array.isArray(l)||typeof l==='string')? l.slice(a===undefined?0:N(a), b===undefined?undefined:N(b)) : (()=>{throw new BError('«قطع» تعمل على قوائم ونصوص فقط')})();
  B['استنى']=ms=>({__sleep:N(ms)||0}); B['نام']=B['استنى'];
  B['مسافة']=(a,b,c,d)=>Math.hypot(N(c)-N(a),N(d)-N(b));
  B['زاوية']=(a,b,c,d)=>Math.round(Math.atan2(N(c)-N(a),N(d)-N(b))*180/Math.PI*100)/100;
  B['تصادم']=(a,b,r1,c,d,r2)=>Math.hypot(N(c)-N(a),N(d)-N(b))<N(r1)+N(r2);
  B['داخل']=(x,y,rx,ry,w,h)=>N(x)>=N(rx)&&N(x)<=N(rx)+N(w)&&N(y)>=N(ry)&&N(y)<=N(ry)+N(h);
  B['ماوس_س']=()=>{ try{ return io.mouse? Math.round(io.mouse().x) : 0; }catch(e){ return 0; } };
  B['ماوس_ص']=()=>{ try{ return io.mouse? Math.round(io.mouse().y) : 0; }catch(e){ return 0; } };
  B['ماوس_مضغوط']=()=>{ try{ return io.mouse? !!io.mouse().down : false; }catch(e){ return false; } };
  B['نقرة']=()=>{ try{ const c=io.click&&io.click(); return c?[Math.round(c.x),Math.round(c.y)]:null; }catch(e){ return null; } };
  B['مفتاح']=()=>{ try{ return io.key? String(io.key()||'') : ''; }catch(e){ return ''; } };
  return B;
}

class ReturnSignal{ constructor(v){ this.v=v; } }
class BreakSignal{} class ContinueSignal{}

/* المفسّر مبني على generators عشان يدعم: التنفيذ خطوة بخطوة، واستنى (توقف مؤقت) */
function makeRunner(prog,io,limits){
  limits=limits||{}; const maxSteps=limits.maxSteps||500000; let steps=0;
  const global=makeEnv(null); const B=builtins(io);
  for(const k in B) global.vars[k]={__builtin:true,fn:B[k],name:k};
  global.vars['باي']=Math.PI;
  function* callV(f,args,line){
    if(f&&f.__fn){ if(args.length>f.params.length) args=args.slice(0,f.params.length);
      const local=makeEnv(f.env); f.params.forEach((pr,i)=>local.vars[pr]=i<args.length?args[i]:null);
      try{ yield* execBlock(f.body,local); }catch(sig){ if(sig instanceof ReturnSignal) return sig.v; throw sig; }
      return null; }
    if(f&&f.__builtin) return f.fn(...args);
    throw new BError('المفروض هنا تدي دالة',line); }
  const needList=(l,nm,line)=>{ if(!Array.isArray(l)) throw new BError('«'+nm+'» أول معامل فيها لازم يكون قائمة',line); };
  const hof=(name,fn)=>{ global.vars[name]={__builtin:true,__hof:true,name,hof:fn}; };
  hof('خريطة',function*(a,line){ needList(a[0],'خريطة',line); const o=[]; for(let i=0;i<a[0].length;i++) o.push(yield* callV(a[1],[a[0][i],i+1],line)); return o; });
  hof('صفّي',function*(a,line){ needList(a[0],'صفّي',line); const o=[]; for(let i=0;i<a[0].length;i++) if(truthy(yield* callV(a[1],[a[0][i],i+1],line))) o.push(a[0][i]); return o; });
  hof('اختزل',function*(a,line){ needList(a[0],'اختزل',line); let acc=a[2],st=0; if(a.length<3){ if(!a[0].length) throw new BError('«اختزل» على قائمة فاضية محتاجة قيمة بداية',line); acc=a[0][0]; st=1; }
    for(let i=st;i<a[0].length;i++) acc=yield* callV(a[1],[acc,a[0][i]],line); return acc; });
  hof('جد',function*(a,line){ needList(a[0],'جد',line); for(const x of a[0]) if(truthy(yield* callV(a[1],[x],line))) return x; return null; });
  hof('أي',function*(a,line){ needList(a[0],'أي',line); for(const x of a[0]) if(truthy(yield* callV(a[1],[x],line))) return true; return false; });
  hof('كل',function*(a,line){ needList(a[0],'كل',line); for(const x of a[0]) if(!truthy(yield* callV(a[1],[x],line))) return false; return true; });
  hof('رتب_حسب',function*(a,line){ needList(a[0],'رتب_حسب',line); const ks=[]; for(const x of a[0]) ks.push({x,k:yield* callV(a[1],[x],line)});
    ks.sort((p,q)=>p.k<q.k?-1:p.k>q.k?1:0); if(a[2]===true||a[2]==='تنازلي') ks.reverse(); return ks.map(p=>p.x); });

  function num(v,line){ if(typeof v==='number') return v; if(typeof v==='boolean') return v?1:0;
    const n=parseFloat(normDigits(String(v))); if(!isNaN(n)) return n; throw new BError('متوقع رقم لكن وجدت «'+show(v)+'»',line); }
  function truthy(v){ return !(v===false||v===null||v===undefined||v===0||v===''); }
  function eq(a,b){ return a===b; }

  function* evalExpr(n,env){
    if(++steps>maxSteps) throw new BError('البرنامج طويل جدًا (تجاوز حد التنفيذ) — هل عندك حلقة لا نهائية؟',n.line);
    switch(n.k){
      case 'num': return n.v; case 'str': return n.v; case 'bool': return n.v; case 'null': return null;
      case 'var': return envGet(env,n.name,n.line);
      case 'list': { const out=[]; for(const e of n.items) out.push(yield* evalExpr(e,env)); return out; }
      case 'dict': { const o={}; for(const pr of n.pairs) o[pr.key]=yield* evalExpr(pr.e,env); return o; }
      case 'neg': return -num(yield* evalExpr(n.e,env),n.line);
      case 'not': return !truthy(yield* evalExpr(n.e,env));
      case 'bin': {
        if(n.op==='&&') return truthy(yield* evalExpr(n.l,env)) ? (yield* evalExpr(n.r,env)) : false;
        if(n.op==='||') { const l=yield* evalExpr(n.l,env); return truthy(l)? l : (yield* evalExpr(n.r,env)); }
        const l=yield* evalExpr(n.l,env), r=yield* evalExpr(n.r,env);
        if(n.op==='+'){ if(typeof l==='string'||typeof r==='string') return show(l)+show(r); return num(l,n.line)+num(r,n.line); }
        if(n.op==='-') return num(l,n.line)-num(r,n.line);
        if(n.op==='*') return num(l,n.line)*num(r,n.line);
        if(n.op==='/'){ const d=num(r,n.line); if(d===0) throw new BError('قسمة على صفر — ممنوع رياضيًا! اتأكد إن المقام مش صفر قبل القسمة',n.line); return num(l,n.line)/d; }
        if(n.op==='%') return num(l,n.line)%num(r,n.line);
        if(n.op==='^') return Math.pow(num(l,n.line),num(r,n.line));
        if(n.op==='==') return eq(l,r); if(n.op==='!=') return !eq(l,r);
        if(n.op==='<') return l<r; if(n.op==='>') return l>r;
        if(n.op==='<=') return l<=r; if(n.op==='>=') return l>=r;
      }
      case 'index': { const o=yield* evalExpr(n.obj,env); const idx=yield* evalExpr(n.idx,env);
        if(Array.isArray(o)||typeof o==='string'){ let i=num(idx,n.line); if(i<0) i=o.length+i;
          const v=o[i]; if(v===undefined) throw new BError('فهرس خارج النطاق: '+arNum(i)+' — الطول هو '+o.length+' فآخر فهرس صحيح هو '+(o.length-1),n.line); return v; }
        if(o&&typeof o==='object'){ const v=o[String(idx)]; return v===undefined?null:v; }
        throw new BError('لا يمكن الفهرسة في هذه القيمة',n.line); }
      case 'lambda': return {__fn:true,name:'دالة',params:n.params,body:n.body,env};
      case 'new': { const cls=envGet(env,n.name,n.line);
        if(!cls||!cls.__class) throw new BError('«'+n.name+'» مش صنف',n.line);
        const args=[]; for(const a of n.args) args.push(yield* evalExpr(a,env));
        const inst={};
        Object.defineProperty(inst,'__cls',{value:cls.name,enumerable:false});
        const bind=(c)=>{ let inherited={}; let sup=null;
          if(c.parent){ sup=bind(c.parent); inherited=Object.assign({},sup); }
          const e=makeEnv(c.env); e.vars['هذا']=inst;
          if(sup){ const so={}; for(const k in sup) Object.defineProperty(so,k,{value:sup[k],enumerable:true}); e.vars['الأب']=so; }
          const own=Object.assign({},inherited);
          for(const m of c.methods) own[m.name]={__fn:true,name:m.name,params:m.params,body:m.body,env:e};
          return own; };
        const ms=bind(cls);
        for(const k in ms) Object.defineProperty(inst,k,{value:ms[k],enumerable:false,writable:true,configurable:true});
        const ctor=ms['بناء'];
        if(ctor){ if(args.length!==ctor.params.length) throw new BError('بناء الصنف «'+cls.name+'» يتوقع '+ctor.params.length+' معاملات وليس '+args.length,n.line);
          const local=makeEnv(ctor.env); ctor.params.forEach((pr,i)=>local.vars[pr]=args[i]);
          try{ yield* execBlock(ctor.body,local); }catch(sig){ if(!(sig instanceof ReturnSignal)) throw sig; } }
        else if(args.length) throw new BError('الصنف «'+cls.name+'» ملوش «بناء» بس انت بعت معاملات',n.line);
        return inst; }
      case 'call': { const fn=yield* evalExpr(n.fn,env);
        const args=[]; for(const a of n.args) args.push(yield* evalExpr(a,env));
        if(fn&&fn.__hof) return yield* fn.hof(args,n.line);
        if(fn&&fn.__builtin){ const res=fn.fn(...args);
          if(res&&typeof res==='object'&&res.__sleep!==undefined){ yield {sleep:res.__sleep}; steps=0; return null; }
          if(res&&typeof res==='object'&&res.__ask!==undefined){ const ans=yield {ask:res.__ask}; steps=0; return ans==null?'':String(ans); }
          if(res&&typeof res==='object'&&res.__choose!==undefined){ const ans=yield {choose:res.__choose, opts:res.opts}; steps=0; return ans==null?'':String(ans); }
          return res; }
        if(fn&&fn.__fn){ if(args.length!==fn.params.length) throw new BError('الدالة «'+fn.name+'» تتوقع '+fn.params.length+' معاملات وليس '+args.length,n.line);
          const local=makeEnv(fn.env); fn.params.forEach((pr,i)=>local.vars[pr]=args[i]);
          try{ yield* execBlock(fn.body,local); }catch(sig){ if(sig instanceof ReturnSignal) return sig.v; throw sig; }
          return null; }
        throw new BError('محاولة استدعاء شيء ليس دالة',n.line); }
    }
    throw new BError('عقدة غير معروفة',n.line);
  }

  function* execStmt(n,env){
    if(++steps>maxSteps) throw new BError('البرنامج طويل جدًا (تجاوز حد التنفيذ)',n.line);
    switch(n.k){
      case 'import': { if(loaded.has(n.name)) break; loaded.add(n.name);
        let src=LIBS[n.name]; if(src==null&&io.module) src=io.module(n.name);
        if(src==null) throw new BError('مكتبة «'+n.name+'» مش موجودة. المكتبات الجاهزة: '+Object.keys(LIBS).join('، ')+' (أو اسم برنامج محفوظ عندك)',n.line);
        let prog2; try{ prog2=parse(tokenize(src)); }catch(e){ if(e&&e.isBarmej) throw new BError('في «'+n.name+'» سطر '+e.line+': '+e.message,n.line); throw e; }
        zeroLines(prog2);
        try{ yield* execBlock(prog2,global); }catch(e){ if(e&&e.isBarmej&&!e.inLib){ const ne=new BError('في «'+n.name+'»: '+e.message,n.line); ne.inLib=true; throw ne; } throw e; }
        break; }
      case 'print': io.print(show(yield* evalExpr(n.e,env))); break;
      case 'let': env.vars[n.name]=yield* evalExpr(n.e,env); break;
      case 'set': envSet(env,n.name,yield* evalExpr(n.e,env)); break;
      case 'setindex': { const val=yield* evalExpr(n.e,env);
        let target=n.target; const chain=[];
        while(target.k==='index'){ chain.unshift(target.idx); target=target.obj; }
        if(target.k!=='var') throw new BError('تعديل غير مدعوم',n.line);
        let container=envGet(env,target.name,n.line);
        if(chain.length===0){ envSet(env,target.name,val); break; }
        for(let ci=0;ci<chain.length-1;ci++){ container=container[yield* evalExpr(chain[ci],env)]; }
        const lastKey=yield* evalExpr(chain[chain.length-1],env);
        if(Array.isArray(container)||typeof container==='object') container[lastKey]=val;
        else throw new BError('لا يمكن التعديل في هذه القيمة',n.line);
        break; }
      case 'expr': yield* evalExpr(n.e,env); break;
      case 'if': if(truthy(yield* evalExpr(n.cond,env))) yield* execBlock(n.then,makeEnv(env));
        else { let done=false; for(const el of n.elifs){ if(truthy(yield* evalExpr(el.cond,env))){ yield* execBlock(el.body,makeEnv(env)); done=true; break; } }
          if(!done&&n.els) yield* execBlock(n.els,makeEnv(env)); }
        break;
      case 'while': while(truthy(yield* evalExpr(n.cond,env))){ if(++steps>maxSteps) throw new BError('حلقة لا نهائية؟ تجاوز حد التنفيذ',n.line);
          try{ yield* execBlock(n.body,makeEnv(env)); }catch(s){ if(s instanceof BreakSignal) break; if(s instanceof ContinueSignal) continue; throw s; } }
        break;
      case 'repeat': { const count=num(yield* evalExpr(n.count,env),n.line);
        for(let i=0;i<count;i++){ if(++steps>maxSteps) throw new BError('تكرار طويل جدًا',n.line);
          const loop=makeEnv(env); if(n.varName) loop.vars[n.varName]=i+1; loop.vars['عداد']=i+1;
          try{ yield* execBlock(n.body,loop); }catch(s){ if(s instanceof BreakSignal) break; if(s instanceof ContinueSignal) continue; throw s; } } }
        break;
      case 'foreach': { const list=yield* evalExpr(n.list,env);
        const items=Array.isArray(list)?list:(typeof list==='string'?list.split(''):(list&&typeof list==='object'?Object.values(list):null));
        if(!items) throw new BError('«لكل» تحتاج قائمة أو نص',n.line);
        for(const item of items){ if(++steps>maxSteps) throw new BError('حلقة طويلة جدًا',n.line);
          const loop=makeEnv(env); loop.vars[n.varName]=item;
          try{ yield* execBlock(n.body,loop); }catch(s){ if(s instanceof BreakSignal) break; if(s instanceof ContinueSignal) continue; throw s; } } }
        break;
      case 'class': { let parent=null; if(n.parent){ parent=envGet(env,n.parent,n.line); if(!parent||!parent.__class) throw new BError('«'+n.parent+'» مش صنف عشان ترث منه',n.line); }
        env.vars[n.name]={__class:true,name:n.name,parent,methods:n.methods,env}; break; }
      case 'func': env.vars[n.name]={__fn:true,name:n.name,params:n.params,body:n.body,env}; break;
      case 'try': { try{ yield* execBlock(n.body,makeEnv(env)); }
        catch(e){ if(e instanceof ReturnSignal || e instanceof BreakSignal || e instanceof ContinueSignal) throw e;
          const cenv=makeEnv(env); if(n.varName) cenv.vars[n.varName]= (e && e.message)? e.message : String(e);
          yield* execBlock(n.catchBody,cenv); } }
        break;
      case 'return': throw new ReturnSignal(n.e?(yield* evalExpr(n.e,env)):null);
      case 'break': throw new BreakSignal();
      case 'continue': throw new ContinueSignal();
    }
  }
  function* execBlock(body,env){ for(const s of body){ if(s.line) yield {line:s.line,env}; yield* execStmt(s,env); } }
  const loaded=new Set();
  const zeroLines=o=>{ if(Array.isArray(o)) o.forEach(zeroLines); else if(o&&typeof o==='object'){ if('line' in o) o.line=0; for(const k in o) if(o[k]&&typeof o[k]==='object') zeroLines(o[k]); } };
  function* topLevel(){
    try{ yield* execBlock(prog,global); }
    catch(sig){
      if(sig instanceof ReturnSignal) throw new BError('«ارجع» خارج دالة',0);
      if(sig instanceof BreakSignal||sig instanceof ContinueSignal) throw new BError('«قف/كمل» خارج حلقة',0);
      throw sig;
    }
  }

  function snapshot(env){
    const out={}; const chain=[]; let e=env;
    while(e){ chain.unshift(e); e=e.parent; }
    for(const fr of chain){ for(const k in fr.vars){ const v=fr.vars[k];
      if(v&&v.__builtin) continue;
      if(k==='باي'&&fr===global) continue;
      out[k]=(v&&v.__fn)? '<دالة '+v.name+'>' : show(v); } }
    return out;
  }

  const gen=topLevel(); let finished=false;
  function pump(send){
    if(finished) return null;
    try{
      const r=send===undefined? gen.next() : gen.next(send);
      if(r.done){ finished=true; return null; }
      return r.value;
    }catch(e){ finished=true; throw e; }
  }
  function drainAskSync(item){
    // في الوضع المتزامن/الخطوة: جاوب على اسأل بـ io.ask العادي
    let it=item, guard=0;
    while(it&&(it.ask!==undefined||it.choose!==undefined)&&guard++<100){
      if(it.choose!==undefined){
        const a=io.choose? io.choose(it.choose,it.opts) : (it.opts&&it.opts[0])||'';
        it=pump(a==null?'':String(a));
      }else{
        const a=io.ask? io.ask(it.ask) : '';
        it=pump(a==null?'':String(a));
      }
    }
    return it;
  }
  function windowPromptFallback(q){ return ''; }
  return {
    isFinished(){ return finished; },
    step(){
      let item=pump();
      item=drainAskSync(item);
      if(!item) return {done:true};
      if(item.sleep!==undefined) return this.step();
      return {done:false,line:item.line,vars:snapshot(item.env)};
    },
    runSync(onLine){
      let item;
      while((item=pump())){
        item=drainAskSync(item);
        if(!item) break;
        if(item.sleep===undefined&&onLine) onLine(item.line,snapshot(item.env));
      }
    },
    async runAsync(onLine){
      let item,n=0;
      while((item=pump())){
        if(item.ask!==undefined){ const a=await io.askAsync(item.ask); item=pump(a==null?'':String(a)); if(!item) break; }
        if(item.choose!==undefined){ const a=await io.chooseAsync(item.choose,item.opts); item=pump(a==null?'':String(a)); if(!item) break; }
        if(item.sleep!==undefined){ await new Promise(r=>setTimeout(r,Math.min(Math.max(item.sleep,0),10000))); }
        else{ if(onLine) onLine(item.line,snapshot(item.env)); if(++n%2000===0) await new Promise(r=>setTimeout(r,0)); }
      }
    }
  };
}

function run(prog,io,limits){ makeRunner(prog,io,limits).runSync(); }

function runSource(src,io,limits){
  try{
    const toks=tokenize(src); const prog=parse(toks); run(prog,io,limits);
    return {ok:true};
  }catch(e){
    if(e&&e.isBarmej) return {ok:false,error:e.message,line:e.line};
    throw e;
  }
}

async function runSourceAsync(src,io,limits,onLine){
  try{
    const toks=tokenize(src); const prog=parse(toks);
    await makeRunner(prog,io,limits).runAsync(onLine);
    return {ok:true};
  }catch(e){
    if(e&&e.isBarmej) return {ok:false,error:e.message,line:e.line};
    throw e;
  }
}

function createStepper(src,io,limits){
  try{
    const toks=tokenize(src); const prog=parse(toks);
    return {ok:true,stepper:makeRunner(prog,io,limits)};
  }catch(e){
    if(e&&e.isBarmej) return {ok:false,error:e.message,line:e.line};
    throw e;
  }
}

/* ---------- تنسيق الكود: مسافات بادئة حسب الأقواس ---------- */
function formatCode(src,unit){
  unit=unit||'  ';
  const lines=String(src).replace(/\r/g,'').split('\n'); const out=[]; let depth=0; let blank=0;
  for(const raw of lines){
    const t=raw.trim();
    if(t===''){ blank++; if(blank<=1&&out.length) out.push(''); continue; } blank=0;
    // scan outside strings/comments
    let opens=0,closes=0,lead=0,seenNon=false,q=null;
    for(let i=0;i<t.length;i++){ const c=t[i];
      if(q){ if(c==='\\') i++; else if(c===q) q=null; continue; }
      if(c==='"'||c==="'"){ q=c; seenNon=true; continue; }
      if(c==='#') break;
      if(c==='{'||c==='['||c==='('){ opens++; seenNon=true; }
      else if(c==='}'||c===']'||c===')'){ closes++; if(!seenNon) lead++; }
      else if(!/\s/.test(c)) seenNon=true;
    }
    const d=Math.max(0,depth-lead);
    out.push(unit.repeat(d)+t);
    depth=Math.max(0,depth+opens-closes);
  }
  while(out.length&&out[out.length-1]==='') out.pop();
  return out.join('\n')+'\n';
}

const Barmej={LIBS,format:formatCode,tokenize,parse,run,runSource,runSourceAsync,createStepper,makeRunner,show,KEYWORDS};
if(typeof module!=='undefined'&&module.exports) module.exports=Barmej;
root.Barmej=Barmej;
})(typeof window!=='undefined'?window:globalThis);

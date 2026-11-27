/* 🧠 اشرح الكود: يحوّل البرنامج لشرح عربي بسيط سطر بسطر (من غير تشغيل) */
(function(root){
const AD='٠١٢٣٤٥٦٧٨٩';
const num=n=>String(n).replace(/\d/g,d=>AD[d]).replace('.','٫');
const OPS={'+':'زائد','-':'ناقص','*':'مضروب في','/':'مقسوم على','%':'باقي قسمة على','^':'أُس','==':'بيساوي','!=':'مختلف عن','<':'أصغر من','>':'أكبر من','<=':'أصغر من أو بيساوي','>=':'أكبر من أو بيساوي','&&':'و','||':'أو'};
function ex(e){
  if(!e) return 'لا شيء';
  switch(e.k){
    case 'num': return num(e.v);
    case 'str': return '«'+e.v+'»';
    case 'bool': return e.v?'صح':'غلط';
    case 'null': return 'فراغ';
    case 'var': return e.name;
    case 'neg': return 'سالب '+ex(e.e);
    case 'not': return 'عكس ('+ex(e.e)+')';
    case 'bin': { const w=x=>x.k==='bin'?'('+ex(x)+')':ex(x); return w(e.l)+' '+(OPS[e.op]||e.op)+' '+w(e.r); }
    case 'list': return e.items.length?'قائمة فيها ('+e.items.map(ex).join('، ')+')':'قائمة فاضية';
    case 'dict': return e.pairs.length?'قاموس فيه ('+e.pairs.map(p=>p.key+' ← '+ex(p.e)).join('، ')+')':'قاموس فاضي';
    case 'index': if(e.idx&&e.idx.k==='str'&&/^[^\s]+$/.test(e.idx.v)) return 'خاصية «'+e.idx.v+'» في '+ex(e.obj); return 'العنصر رقم '+ex(e.idx)+' في '+ex(e.obj);
    case 'call': return 'نتيجة '+ex(e.fn)+(e.args.length?' على ('+e.args.map(ex).join('، ')+')':'');
    case 'new': return 'نسخة جديدة من '+e.name+(e.args.length?' بـ('+e.args.map(ex).join('، ')+')':'');
    case 'lambda': return 'دالة صغيرة بتاخد ('+e.params.join('، ')+')';
  }
  return '؟';
}
function explain(src){
  let prog; try{ prog=root.Barmej.parse(root.Barmej.tokenize(src)); }catch(e){ return {error:e.message,line:e.line||1,rows:[],stats:{}}; }
  const rows=[]; const st={vars:0,funcs:0,loops:0,conds:0,prints:0,classes:0};
  const row=(line,d,ic,t)=>rows.push({line,depth:d,icon:ic,text:t});
  function blk(b,d){ for(const s of b) stmt(s,d); }
  function stmt(s,d){
    switch(s.k){
      case 'let': st.vars++; row(s.line,d,'📦','بنعمل متغير اسمه «'+s.name+'» ونحط فيه: '+ex(s.e)); break;
      case 'set': row(s.line,d,'✏️','بنغيّر قيمة «'+s.name+'» لتبقى: '+ex(s.e)); break;
      case 'setindex': row(s.line,d,'✏️','بنحط '+ex(s.e)+' جوه '+ex(s.target)); break;
      case 'print': st.prints++; row(s.line,d,'🖨️','بنطبع على الشاشة: '+ex(s.e)); break;
      case 'expr': row(s.line,d,'▶️','بننفّذ: '+ex(s.e)); break;
      case 'return': row(s.line,d,'↩️',s.e?'الدالة بترجّع: '+ex(s.e)+' وبتخلص':'الدالة بتخلص'); break;
      case 'break': row(s.line,d,'🛑','بنوقف الحلقة فوراً'); break;
      case 'continue': row(s.line,d,'⏭️','بنقفز للفة اللي بعدها'); break;
      case 'import': row(s.line,d,'📚','بنستورد مكتبة «'+s.name+'» عشان نستخدم دوالها'); break;
      case 'if': st.conds++; row(s.line,d,'🔀','لو '+ex(s.cond)+' بيحصل الآتي:'); blk(s.then,d+1);
        for(const e of s.elifs){ row(e.cond.line||s.line,d,'🔀','وإلا لو '+ex(e.cond)+':'); blk(e.body,d+1); }
        if(s.els){ row(s.line,d,'🔀','وإلا (لو ولا شرط اتحقق):'); blk(s.els,d+1); } break;
      case 'while': st.loops++; row(s.line,d,'🔁','طالما '+ex(s.cond)+' بنكرر الآتي:'); blk(s.body,d+1); break;
      case 'repeat': st.loops++; row(s.line,d,'🔁','بنكرر '+ex(s.count)+' مرة'+(s.varName?' (والرقم الحالي في «'+s.varName+'»)':'')+':'); blk(s.body,d+1); break;
      case 'foreach': st.loops++; row(s.line,d,'🔁','لكل عنصر «'+s.varName+'» في '+ex(s.list)+':'); blk(s.body,d+1); break;
      case 'func': st.funcs++; row(s.line,d,'🧩','بنعرّف دالة اسمها «'+s.name+'»'+(s.params.length?' بتاخد ('+s.params.join('، ')+')':' من غير مدخلات')+' (مش بتشتغل دلوقتي، بس لما حد ينادي عليها):'); blk(s.body,d+1); break;
      case 'class': st.classes++; row(s.line,d,'🏷️','بنعرّف صنف «'+s.name+'»'+(s.parent?' بيرث من «'+s.parent+'»':'')+' (قالب نعمل منه نسخ):'); for(const m of s.methods||[]){ row(m.line,d+1,'🧩','فعل «'+m.name+'»'+(m.params.length?' بياخد ('+m.params.join('، ')+')':'')+':'); blk(m.body,d+2); } break;
      case 'try': row(s.line,d,'🛡️','بنجرّب الآتي، ولو حصل خطأ مش هيقف البرنامج:'); blk(s.body,d+1); row(s.line,d,'🛡️','لو حصل خطأ'+(s.varName?' (رسالته في «'+s.varName+'»)':'')+':'); blk(s.catchBody,d+1); break;
    }
  }
  blk(prog,0);
  return {rows,stats:st};
}
root.BarmejExplain={explain};
if(typeof module!=='undefined'&&module.exports) module.exports=root.BarmejExplain;
})(typeof window!=='undefined'?window:globalThis);

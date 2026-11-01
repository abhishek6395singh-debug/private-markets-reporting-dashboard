(function(){
'use strict';
const E=window.Engine, D=E.generate(20261031);
const $=(s,r=document)=>r.querySelector(s), esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmM=v=>Math.abs(v)>=1000?`$${(v/1000).toFixed(2)}B`:`$${v.toFixed(0)}M`, fm1=v=>`$${v.toFixed(1)}M`;
const fx=v=>v==null?'—':v.toFixed(2)+'x', fp=(v,d=1)=>v==null?'—':(v*100).toFixed(d)+'%', f1=v=>v==null?'—':v.toFixed(1);
const cv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const FUND=Object.fromEntries(D.funds.map(f=>[f.id,f]));
const state={tab:'overview',strat:'ALL',fund:'BO3',sort:{},peFund:'ALL',crFund:'ALL'};
const TABS=[['overview','Overview'],['funds','Funds'],['equity','Private equity'],['credit','Private credit'],['controls','Data & controls'],['implementation','Implementation']];
let charts=[];

/* ---------- tooltip ---------- */
const tip=$('#tip');
function showTip(html,e){tip.innerHTML=html;tip.hidden=false;const r=tip.getBoundingClientRect();let x=e.clientX+14,y=e.clientY+14;
  if(x+r.width>innerWidth-8)x=e.clientX-r.width-14;if(y+r.height>innerHeight-8)y=e.clientY-r.height-14;tip.style.left=Math.max(8,x)+'px';tip.style.top=Math.max(8,y)+'px';}
const hideTip=()=>{tip.hidden=true;};
const trow=(c,l,v)=>`<div class="row"><span>${c?`<i style="background:${c}"></i>`:''}${l}</span><span>${v}</span></div>`;

/* ---------- chart helpers ---------- */
function ticks(min,max,n){const range=(max-min)||1,raw=range/n,mag=Math.pow(10,Math.floor(Math.log10(raw))),nm=raw/mag,step=(nm<1.5?1:nm<3?2:nm<7?5:10)*mag;
  const s=Math.floor(min/step+1e-9)*step,e=Math.ceil(max/step-1e-9)*step,out=[];for(let v=s;v<=e+step/2;v+=step)out.push(Math.abs(v)<1e-9?0:v);return out;}
const lin=(d0,d1,r0,r1)=>v=>r0+(v-d0)/((d1-d0)||1)*(r1-r0);
function legend(items){return `<div class="legend">${items.map(i=>`<span><i style="background:${i.color}"></i>${i.name}</span>`).join('')}</div>`;}
function draw(host,fn){const run=()=>{host.innerHTML='';fn(host.clientWidth||320);};charts.push(run);run();}

/* time series: stacked area, lines, or signed bars */
function timeChart(host,o){draw(host,W=>{
  const H=o.h||250,m={l:o.l||50,r:12,t:10,b:24},iw=W-m.l-m.r,ih=H-m.t-m.b,n=o.labels.length,S=o.series;
  const x=i=>m.l+(o.bars?iw*(i+.5)/n:iw*(n===1?.5:i/(n-1)));
  let lo=0,hi=0,cum=null;
  if(o.type==='area'){cum=S.map(()=>new Array(n).fill(0));for(let i=0;i<n;i++){let a=0;S.forEach((s,k)=>{a+=s.values[i];cum[k][i]=a;});hi=Math.max(hi,a);}}
  else{for(const s of S)for(const v of s.values){hi=Math.max(hi,v);lo=Math.min(lo,v);}}
  const T=ticks(lo,hi,4),y=lin(T[0],T[T.length-1],m.t+ih,m.t);let g='';
  for(const t of T){g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y(t)}" y2="${y(t)}" stroke="${cv('--grid')}" ${t===0&&lo<0?'stroke-width="1.5" stroke="'+cv('--muted')+'"':''}/><text class="num" x="${m.l-8}" y="${y(t)+4}" text-anchor="end">${o.yfmt(t)}</text>`;}
  for(let i=0;i<n;i++)if(i%4===0)g+=`<text x="${x(i)}" y="${H-6}" text-anchor="${o.bars?'middle':'middle'}">${E.qYear(i)}</text>`;
  let body='';
  if(o.type==='area'){S.forEach((s,k)=>{let d='';for(let i=0;i<n;i++)d+=(i?'L':'M')+x(i)+','+y(cum[k][i]);for(let i=n-1;i>=0;i--)d+='L'+x(i)+','+y(k?cum[k-1][i]:0);
      body+=`<path d="${d}Z" fill="${s.color}" fill-opacity=".9" stroke="${cv('--surface')}" stroke-width="1.5"/>`;});}
  else if(o.bars){const bw=Math.max(2,iw/n*.62);S.forEach(s=>{s.values.forEach((v,i)=>{if(!v)return;const y0=y(0),y1=y(v),top=Math.min(y0,y1),h=Math.max(1,Math.abs(y1-y0));
      body+=`<rect x="${x(i)-bw/2}" y="${top}" width="${bw}" height="${h}" fill="${s.color}" rx="${bw>6?2:0}"/>`;});});}
  else{S.forEach(s=>{let d='';s.values.forEach((v,i)=>{d+=(i?'L':'M')+x(i)+','+y(v);});body+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      const li=n-1;body+=`<circle cx="${x(li)}" cy="${y(s.values[li])}" r="4" fill="${s.color}" stroke="${cv('--surface')}" stroke-width="2"/>`;});}
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria)}">${g}${body}<g class="hov"></g><rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/></svg>`;
  const svg=host.firstChild,hov=$('.hov',svg),hit=$('.hit',svg);
  const idxAt=e=>{const r=svg.getBoundingClientRect(),px=(e.clientX-r.left)*(W/r.width);return Math.max(0,Math.min(n-1,o.bars?Math.floor((px-m.l)/iw*n):Math.round((px-m.l)/iw*(n-1))));};
  hit.addEventListener('pointermove',e=>{const i=idxAt(e);let dots='';
    if(o.type==='area')S.forEach((s,k)=>{dots+=`<circle cx="${x(i)}" cy="${y(cum[k][i])}" r="3.5" fill="${s.color}" stroke="${cv('--surface')}" stroke-width="2"/>`;});
    else if(!o.bars)S.forEach(s=>{dots+=`<circle cx="${x(i)}" cy="${y(s.values[i])}" r="4" fill="${s.color}" stroke="${cv('--surface')}" stroke-width="2"/>`;});
    hov.innerHTML=(o.bars?`<rect x="${x(i)-iw/n/2}" y="${m.t}" width="${iw/n}" height="${ih}" fill="${cv('--ink')}" opacity=".06"/>`:`<line x1="${x(i)}" x2="${x(i)}" y1="${m.t}" y2="${m.t+ih}" stroke="${cv('--muted')}" stroke-dasharray="3 3"/>`)+dots;
    let h=`<div class="t">${o.labels[i]}</div>`;S.forEach(s=>{h+=trow(s.color,s.name,o.yfmt(s.values[i],true));});if(o.type==='area')h+=trow('','Total',o.yfmt(cum[S.length-1][i],true));
    if(o.extra)h+=o.extra(i);showTip(h,e);});
  hit.addEventListener('pointerleave',()=>{hov.innerHTML='';hideTip();});
});}

/* horizontal bars: simple or stacked parts, optional reference line */
function hBars(host,o){draw(host,W=>{
  const rowH=o.rowH||30,H=o.rows.length*rowH+24,m={l:o.l||120,r:o.r||56,t:o.ref!=null?16:4,b:20},iw=W-m.l-m.r,H2=H+(o.ref!=null?12:0);
  const maxV=Math.max(o.max||0,...o.rows.map(r=>r.parts.reduce((s,p)=>s+p.v,0)));const T=ticks(0,maxV,Math.max(2,Math.min(4,Math.floor(iw/90)))),x=lin(0,T[T.length-1],m.l,m.l+iw);let g='';
  for(const t of T)g+=`<line x1="${x(t)}" x2="${x(t)}" y1="${m.t}" y2="${H-m.b}" stroke="${cv('--grid')}"/><text class="num" x="${x(t)}" y="${H-5}" text-anchor="middle">${o.xfmt(t)}</text>`;
  let body='';o.rows.forEach((r,i)=>{const cy=m.t+i*rowH+rowH/2,bh=Math.min(16,rowH-10);let acc=0;
    body+=`<text class="lbl" x="${m.l-10}" y="${cy+4}" text-anchor="end">${esc(r.label.length>(o.maxLen||20)?r.label.slice(0,(o.maxLen||20)-1)+'…':r.label)}</text>`;
    r.parts.forEach((p,k)=>{const x0=x(acc),x1=x(acc+p.v);acc+=p.v;const last=k===r.parts.length-1;
      body+=`<rect x="${x0+(k?1:0)}" y="${cy-bh/2}" width="${Math.max(0,x1-x0-(k?1:0))}" height="${bh}" fill="${p.color}" ${last?`rx="3"`:''}/>`;});
    body+=`<text class="val" x="${x(acc)+7}" y="${cy+4}">${r.text}</text>`;});
  if(o.ref!=null)body+=`<line x1="${x(o.ref)}" x2="${x(o.ref)}" y1="${m.t}" y2="${H-m.b}" stroke="${cv('--ink')}" stroke-dasharray="4 3"/><text x="${x(o.ref)}" y="${m.t-5}" text-anchor="middle" class="lbl">${o.refLabel}</text>`;
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H2}" width="${W}" height="${H2}" role="img" aria-label="${esc(o.aria)}">${g}${body}<g class="hit"></g></svg>`;
  const svg=host.firstChild;
  o.rows.forEach((r,i)=>{const rc=document.createElementNS('http://www.w3.org/2000/svg','rect');rc.setAttribute('x',0);rc.setAttribute('y',m.t+i*rowH);rc.setAttribute('width',W);rc.setAttribute('height',rowH);rc.setAttribute('fill','transparent');
    rc.addEventListener('pointermove',e=>showTip(`<div class="t">${esc(r.label)}</div>`+r.parts.map(p=>trow(p.color,p.name,p.fmt)).join('')+(r.tipExtra||''),e));rc.addEventListener('pointerleave',hideTip);$('.hit',svg).appendChild(rc);});
});}

/* vertical columns */
function vBars(host,o){draw(host,W=>{
  const H=o.h||220,m={l:46,r:8,t:12,b:34},iw=W-m.l-m.r,ih=H-m.t-m.b,n=o.cats.length;
  const T=ticks(0,Math.max(...o.cats.map(c=>c.v)),4),y=lin(0,T[T.length-1],m.t+ih,m.t);let g='';
  for(const t of T)g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y(t)}" y2="${y(t)}" stroke="${cv('--grid')}"/><text class="num" x="${m.l-8}" y="${y(t)+4}" text-anchor="end">${o.yfmt(t)}</text>`;
  const band=iw/n,bw=Math.min(44,band*.62);let body='';
  o.cats.forEach((c,i)=>{const cx=m.l+band*(i+.5),h=Math.max(0,m.t+ih-y(c.v));
    body+=`<rect x="${cx-bw/2}" y="${y(c.v)}" width="${bw}" height="${h}" rx="3" fill="${c.color||cv('--blue')}"/><text class="lbl" x="${cx}" y="${H-16}" text-anchor="middle">${esc(c.label)}</text>${c.sub?`<text x="${cx}" y="${H-4}" text-anchor="middle">${esc(c.sub)}</text>`:''}<text class="val" x="${cx}" y="${y(c.v)-5}" text-anchor="middle">${o.vfmt?o.vfmt(c.v):''}</text>`;});
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria)}">${g}${body}<g class="hit"></g></svg>`;
  const svg=host.firstChild;o.cats.forEach((c,i)=>{const rc=document.createElementNS('http://www.w3.org/2000/svg','rect');rc.setAttribute('x',m.l+band*i);rc.setAttribute('y',m.t);rc.setAttribute('width',band);rc.setAttribute('height',ih+20);rc.setAttribute('fill','transparent');
    rc.addEventListener('pointermove',e=>showTip(`<div class="t">${esc(c.label)}</div>`+trow(c.color||cv('--blue'),o.name,o.tfmt(c.v))+(c.tip||''),e));rc.addEventListener('pointerleave',hideTip);$('.hit',svg).appendChild(rc);});
});}

/* ---------- sortable table ---------- */
function table(host,id,cols,rows,o={}){
  const st=state.sort[id]||(state.sort[id]=o.sort||null);
  let data=rows.slice();
  if(st){const c=cols.find(c=>c.key===st.key),val=r=>c.val?c.val(r):r[c.key];data.sort((a,b)=>{const x=val(a),y=val(b);if(x==null)return 1;if(y==null)return -1;return (typeof x==='string'?x.localeCompare(y):x-y)*st.dir;});}
  host.innerHTML=`<div class="tablewrap"><table><thead><tr>${cols.map(c=>`<th class="${c.r?'r':''}" data-k="${c.key}" tabindex="0" aria-sort="${st&&st.key===c.key?(st.dir>0?'ascending':'descending'):'none'}">${c.label}<span class="ar">${st&&st.key===c.key?(st.dir>0?'↑':'↓'):''}</span></th>`).join('')}</tr></thead><tbody>${
    data.map(r=>`<tr class="${o.onRow?'click':''} ${o.sel&&o.sel(r)?'sel':''}" ${o.onRow?`tabindex="0" data-id="${o.key(r)}"`:''}>${cols.map(c=>`<td class="${c.r?'r num':''} ${c.cls||''}">${c.fmt?c.fmt(r[c.key],r):esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const sortBy=k=>{const c=cols.find(c=>c.key===k);const cur=state.sort[id];state.sort[id]={key:k,dir:cur&&cur.key===k?-cur.dir:(c.r?-1:1)};table(host,id,cols,rows,o);};
  host.querySelectorAll('th').forEach(th=>{th.onclick=()=>sortBy(th.dataset.k);th.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sortBy(th.dataset.k);}};});
  if(o.onRow)host.querySelectorAll('tbody tr').forEach(tr=>{const go=()=>o.onRow(tr.dataset.id);tr.onclick=go;tr.onkeydown=e=>{if(e.key==='Enter'){go();}};});
}
const pill=(label,cls,glyph)=>`<span class="pill ${cls}">${glyph||''} ${label}</span>`;
const statusPill=s=>({'Pass':pill('Pass','good','●'),'On time':pill('On time','good','●'),'Performing':pill('Performing','good','●'),'Review':pill('Review','warn','▲'),'Late':pill('Late','warn','▲'),'Partial':pill('Partial','warn','▲'),'Watchlist':pill('Watchlist','warn','▲'),'Break':pill('Break','bad','■'),'Non-accrual':pill('Non-accrual','bad','■'),'Below cost':pill('Below cost','warn','▲'),'Held':pill('Held','neutral','')}[s]||pill(s,'neutral'));
const kpi=(l,v,d)=>`<div class="kpi"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d||'&nbsp;'}</div></div>`;
const delta=(a,b,fmt,inv)=>{const d=a-b;const up=d>=0;return `<span class="${(up!==!!inv)?'up':'dn'}">${up?'▲':'▼'} ${fmt(Math.abs(d))}</span>`;};
const segBtns=(cur,opts,attr)=>`<div class="seg" role="group">${opts.map(([k,l])=>`<button type="button" data-${attr}="${k}" aria-pressed="${cur===k}">${l}</button>`).join('')}</div>`;
const inStrat=f=>state.strat==='ALL'||f.strat===state.strat;

/* ---------- views ---------- */
function overview(){
  const F=D.funds.filter(inStrat),P=E.pooled(F),Pp=E.pooled(F,E.LAST-1),Pq=E.pooled(F,E.LAST-4);
  const commit=F.reduce((s,f)=>s+f.commit,0),unf=F.reduce((s,f)=>s+f.unfunded,0);
  const pool=E.pool(F).rows,rowAt=i=>pool.find(r=>r.i===i)||{call:0,dist:0,nav:0};
  const L4=[0,1,2,3].map(k=>rowAt(E.LAST-k)),dist4=L4.reduce((s,r)=>s+r.dist,0),call4=L4.reduce((s,r)=>s+r.call,0);
  const navFy=F.reduce((s,f)=>s+f.m.nav,0),peNav=D.funds.filter(f=>f.strat==='PE').reduce((s,f)=>s+f.m.nav,0),pcNav=D.funds.filter(f=>f.strat==='PC').reduce((s,f)=>s+f.m.nav,0);
  const above=F.filter(f=>f.m.irr>=.12).length,lo=F.slice().sort((a,b)=>a.m.irr-b.m.irr)[0],hiF=F.slice().sort((a,b)=>b.m.irr-a.m.irr)[0];
  const loans=D.loans.filter(l=>state.strat!=='PE'),bad=loans.filter(l=>l.rating>=4),badPar=bad.reduce((s,l)=>s+l.par,0),par=loans.reduce((s,l)=>s+l.par,0);
  const labels=pool.map(r=>E.qLabel(r.i));
  const css=cv('--blue'),co=cv('--orange'),ca=cv('--aqua');
  const html=`
   <div class="toolbar"><div><h2>Portfolio summary</h2><p class="lede">${F.length} funds consolidated from two administrators, loan-agent tapes and the general ledger. Net of simulated fees.</p></div>
     ${segBtns(state.strat,[['ALL','All funds'],['PE','Private equity'],['PC','Private credit']],'strat')}</div>
   <section class="kpis" aria-label="Key metrics">
     ${kpi('Net asset value',fmM(P.nav),delta(P.nav,Pp.nav,fmM)+' QoQ')}
     ${kpi('Commitments',fmM(commit),fmM(unf)+' unfunded')}
     ${kpi('Paid-in',fmM(P.pic),fp(P.pic/commit,0)+' of commitments')}
     ${kpi('Distributions',fmM(P.dist),fmM(dist4)+' last 4 qtrs')}
     ${kpi('Net TVPI',fx(P.tvpi),delta(P.tvpi,Pq.tvpi,v=>v.toFixed(2)+'x')+' YoY')}
     ${kpi('DPI',fx(P.dpi),'RVPI '+fx(P.rvpi))}
     ${kpi('Net IRR',fp(P.irr),delta(P.irr,Pq.irr,v=>(v*100).toFixed(1)+' pts')+' YoY')}
   </section>
   <div class="grid g2">
     <div class="card"><h3>Net asset value by strategy</h3>${legend([{name:'Private equity',color:css},{name:'Private credit',color:ca}])}<div class="chart" id="c-nav"></div></div>
     <div class="card"><h3>Quarterly cash flows</h3>${legend([{name:'Distributions',color:css},{name:'Contributions',color:co}])}<div class="chart" id="c-cf"></div></div>
   </div>
   <div class="grid g2">
     <div class="card"><h3>TVPI by fund</h3>${legend([{name:'DPI (realised)',color:css},{name:'RVPI (unrealised)',color:cv('--blue-tint')}])}<div class="chart" id="c-tvpi"></div></div>
     <div class="card"><h3>Net IRR by fund</h3><div class="legend"><span>Dashed line marks the 12% target net IRR</span></div><div class="chart" id="c-irr"></div></div>
   </div>
   <div class="card"><h3>Management commentary</h3><ul class="commentary">
     <li>Pooled net IRR is <b>${fp(P.irr)}</b> on <b>${fmM(P.nav)}</b> of NAV; <b>${above} of ${F.length}</b> funds are at or above the 12% target. Strongest: <b>${hiF.short}</b> (${fp(hiF.m.irr)}). Weakest: <b>${lo.short}</b> (${fp(lo.m.irr)}).</li>
     <li>Over the last four quarters the portfolio called <b>${fmM(call4)}</b> and returned <b>${fmM(dist4)}</b>, a net ${dist4>=call4?'inflow':'outflow'} of <b>${fmM(Math.abs(dist4-call4))}</b>.</li>
     ${state.strat!=='PE'?`<li>Credit watchlist and non-accrual positions total <b>${bad.length} loans</b>, or <b>${fp(badPar/par)}</b> of par. All sit in the Special Situations fund.</li>`:''}
     <li>Two administrator reconciliation items are open at quarter-end (Buyout IV, Direct Lending II). See Data &amp; controls.</li></ul></div>`;
  view(html);
  timeChart($('#c-nav'),{labels,type:'area',series:[{name:'Private equity',color:css,values:pool.map((r,k)=>navOf(r.i,'PE'))},{name:'Private credit',color:ca,values:pool.map(r=>navOf(r.i,'PC'))}].filter(s=>state.strat==='ALL'||(state.strat==='PE')===(s.name==='Private equity')),yfmt:v=>fmM(v),aria:'Net asset value by strategy over time'});
  timeChart($('#c-cf'),{labels,bars:true,series:[{name:'Distributions',color:css,values:pool.map(r=>r.dist)},{name:'Contributions',color:co,values:pool.map(r=>-r.call)}],yfmt:(v,t)=>t?fm1(Math.abs(v)):fmM(v),aria:'Quarterly contributions and distributions',
     extra:i=>trow('','Net',fm1(pool[i].dist-pool[i].call))});
  const byT=F.slice().sort((a,b)=>b.m.tvpi-a.m.tvpi);
  hBars($('#c-tvpi'),{aria:'DPI and RVPI by fund',l:112,rows:byT.map(f=>({label:f.short,parts:[{v:f.m.dpi,color:css,name:'DPI',fmt:fx(f.m.dpi)},{v:f.m.rvpi,color:cv('--blue-tint'),name:'RVPI',fmt:fx(f.m.rvpi)}],text:fx(f.m.tvpi),tipExtra:trow('','TVPI',fx(f.m.tvpi))})),xfmt:v=>v.toFixed(1)+'x'});
  const byI=F.slice().sort((a,b)=>b.m.irr-a.m.irr);
  hBars($('#c-irr'),{aria:'Net IRR by fund',l:112,max:.16,ref:.12,refLabel:'12% target',rows:byI.map(f=>({label:f.short,parts:[{v:Math.max(0,f.m.irr),color:f.m.irr>=.12?css:cv('--orange'),name:'Net IRR',fmt:fp(f.m.irr)}],text:fp(f.m.irr)})),xfmt:v=>(v*100).toFixed(0)+'%'});
  bindStrat();
}
function navOf(i,s){return D.funds.filter(f=>f.strat===s).reduce((a,f)=>{const r=f.rows.find(r=>r.i===i);return a+(r?r.nav:0);},0);}

function funds(){
  const F=D.funds.filter(inStrat);if(!F.find(f=>f.id===state.fund))state.fund=F[0].id;
  view(`<div class="toolbar"><div><h2>Fund performance</h2><p class="lede">Select a fund to see its J-curve. Click a column header to sort.</p></div>${segBtns(state.strat,[['ALL','All funds'],['PE','Private equity'],['PC','Private credit']],'strat')}</div>
   <div class="card" style="margin-bottom:16px"><div id="t-funds"></div></div>
   <div class="grid g2" id="detail"></div>`);
  const cols=[{key:'short',label:'Fund',cls:'',fmt:(v,r)=>`<b>${esc(v)}</b>`},{key:'sub',label:'Strategy'},{key:'vintage',label:'Vintage',r:1},{key:'status',label:'Stage',fmt:v=>pill(v,'neutral')},
   {key:'commit',label:'Commitment',r:1,fmt:v=>fm1(v)},{key:'pic',label:'Paid-in',r:1,val:r=>r.m.pic,fmt:(v,r)=>fm1(r.m.pic)},{key:'dist',label:'Distributed',r:1,val:r=>r.m.dist,fmt:(v,r)=>fm1(r.m.dist)},{key:'nav',label:'NAV',r:1,val:r=>r.m.nav,fmt:(v,r)=>fm1(r.m.nav)},
   {key:'dpi',label:'DPI',r:1,val:r=>r.m.dpi,fmt:(v,r)=>fx(r.m.dpi)},{key:'rvpi',label:'RVPI',r:1,val:r=>r.m.rvpi,fmt:(v,r)=>fx(r.m.rvpi)},{key:'tvpi',label:'TVPI',r:1,val:r=>r.m.tvpi,fmt:(v,r)=>`<b>${fx(r.m.tvpi)}</b>`},{key:'irr',label:'Net IRR',r:1,val:r=>r.m.irr,fmt:(v,r)=>`<b>${fp(r.m.irr)}</b>`}];
  const detail=()=>{const f=FUND[state.fund],rows=f.rows;let cum=0;const net=rows.map(r=>(cum+=r.dist-r.call));const val=rows.map((r,k)=>net[k]+r.nav);
    const labels=rows.map(r=>E.qLabel(r.i));const cnt=(f.strat==='PE'?D.holdings:D.loans).filter(x=>x.fund===f.id).length;
    $('#detail').innerHTML=`<div class="card"><h2>${esc(f.name)}</h2><p class="lede">${f.sub} · ${f.vintage} vintage · ${f.status.toLowerCase()} · ${cnt} ${f.strat==='PE'?'portfolio companies':'loans'}</p>
      <div class="kpis" style="margin:12px 0 0;grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">${kpi('Unfunded',fm1(f.unfunded))}${kpi('TVPI',fx(f.m.tvpi))}${kpi('Net IRR',fp(f.m.irr))}${kpi('DPI',fx(f.m.dpi))}</div></div>
      <div class="card"><h3>J-curve, ${esc(f.short)}</h3>${legend([{name:'Cumulative net cash flow',color:cv('--orange')},{name:'Net cash flow + NAV (total value)',color:cv('--blue')}])}<div class="chart" id="c-j"></div></div>`;
    timeChart($('#c-j'),{labels,series:[{name:'Cumulative net cash flow',color:cv('--orange'),values:net},{name:'Total value',color:cv('--blue'),values:val}],yfmt:(v,t)=>t?fm1(v):fmM(v),aria:'J-curve for selected fund',h:230});};
  const drawTable=()=>table($('#t-funds'),'funds',cols,F,{sort:{key:'irr',dir:-1},onRow:id=>{state.fund=id;drawTable();detail();},key:r=>r.id,sel:r=>r.id===state.fund});
  drawTable();
  detail();bindStrat();
}

function equity(){
  const H=D.holdings.filter(h=>state.peFund==='ALL'||h.fund===state.peFund);
  const fv=H.reduce((s,h)=>s+h.fv,0),cost=H.reduce((s,h)=>s+h.cost,0),below=H.filter(h=>h.moic<1).length;
  const wl=(k)=>{const a=H.filter(h=>h[k]!=null);return a.reduce((s,h)=>s+h[k]*h.fv,0)/a.reduce((s,h)=>s+h.fv,0);};
  const sect={};H.forEach(h=>sect[h.sector]=(sect[h.sector]||0)+h.fv);
  const sectRows=Object.entries(sect).sort((a,b)=>b[1]-a[1]);
  const B=[['< 1.0x',0,1],['1.0–1.5x',1,1.5],['1.5–2.0x',1.5,2],['2.0x +',2,99]].map(([l,a,b])=>({label:l,v:H.filter(h=>h.moic>=a&&h.moic<b).reduce((s,h)=>s+h.fv,0),n:H.filter(h=>h.moic>=a&&h.moic<b).length}));
  view(`<div class="toolbar"><div><h2>Private equity holdings</h2><p class="lede">Company-level fair values from the valuation committee, reconciled to fund NAV.</p></div>
    <label class="sub">Fund <select id="sel-fund"><option value="ALL">All equity funds</option>${D.funds.filter(f=>f.strat==='PE').map(f=>`<option value="${f.id}" ${f.id===state.peFund?'selected':''}>${f.short}</option>`).join('')}</select></label></div>
   <section class="kpis">${kpi('Companies',H.length,'positions')}${kpi('Fair value',fmM(fv),'Cost '+fmM(cost))}${kpi('Gross MOIC',fx(fv/cost),'Unrealised, weighted')}${kpi('EV / EBITDA',f1(wl('evEbitdaNow'))+'x','Entry '+f1(wl('evEbitdaEntry'))+'x')}${kpi('Net debt / EBITDA',f1(wl('lev'))+'x','FV-weighted')}${kpi('Below cost',below,fp(H.filter(h=>h.moic<1).reduce((s,h)=>s+h.fv,0)/fv,0)+' of fair value')}</section>
   <div class="grid g2"><div class="card"><h3>Fair value by sector</h3><div class="chart" id="c-sec"></div></div><div class="card"><h3>Fair value by MOIC bucket</h3><div class="chart" id="c-moic"></div></div></div>
   <div class="card"><div id="t-pe"></div></div>`);
  hBars($('#c-sec'),{aria:'Fair value by sector',l:120,rows:sectRows.map(([s,v])=>({label:s,parts:[{v,color:cv('--blue'),name:'Fair value',fmt:fmM(v)}],text:fmM(v)})),xfmt:v=>fmM(v)});
  vBars($('#c-moic'),{aria:'Fair value by MOIC bucket',name:'Fair value',cats:B.map((b,i)=>({label:b.label,sub:b.n+' cos',v:b.v,color:i===0?cv('--orange'):cv('--blue'),tip:trow('','Companies',b.n)})),yfmt:v=>fmM(v),vfmt:v=>v?fmM(v):'',tfmt:v=>fm1(v)});
  const cols=[{key:'company',label:'Company',fmt:v=>`<b>${esc(v)}</b>`},{key:'fund',label:'Fund',fmt:v=>`<span class="tag">${v}</span>`},{key:'sector',label:'Sector'},{key:'region',label:'Region'},{key:'entry',label:'Entry',r:1},
   {key:'cost',label:'Cost',r:1,fmt:fm1},{key:'fv',label:'Fair value',r:1,fmt:fm1},{key:'moic',label:'MOIC',r:1,fmt:(v)=>`<b>${fx(v)}</b>`},{key:'evEbitdaNow',label:'EV/EBITDA',r:1,fmt:v=>f1(v)+'x'},{key:'lev',label:'ND/EBITDA',r:1,fmt:v=>f1(v)+'x'},
   {key:'revG',label:'Rev. growth',r:1,fmt:v=>fp(v)},{key:'ebitdaG',label:'EBITDA growth',r:1,fmt:v=>v==null?'<span class="muted">pending</span>':fp(v)},{key:'method',label:'Valuation'},{key:'st',label:'Flag',val:r=>r.moic,fmt:(v,r)=>r.moic<1?statusPill('Below cost'):''}];
  table($('#t-pe'),'pe',cols,H,{sort:{key:'fv',dir:-1}});
  $('#sel-fund').onchange=e=>{state.peFund=e.target.value;render();};
}

function credit(){
  const L=D.loans.filter(l=>state.crFund==='ALL'||l.fund===state.crFund),perf=L.filter(l=>l.rating<5);
  const wf=(k,a=perf)=>a.reduce((s,l)=>s+l[k]*l.fv,0)/a.reduce((s,l)=>s+l.fv,0);
  const par=L.reduce((s,l)=>s+l.par,0),fv=L.reduce((s,l)=>s+l.fv,0),flt=L.filter(l=>l.floating).reduce((s,l)=>s+l.par,0),pik=L.filter(l=>l.pik>0).reduce((s,l)=>s+l.par,0),wl=L.filter(l=>l.rating>=4).reduce((s,l)=>s+l.par,0);
  const rat=[1,2,3,4,5].map(r=>({label:'Rating '+r,sub:['Strong','Good','Satisfactory','Watch','Impaired'][r-1],v:L.filter(l=>l.rating===r).reduce((s,l)=>s+l.par,0),n:L.filter(l=>l.rating===r).length}));
  const yrs=[...new Set(L.map(l=>l.maturity))].sort();const inst={};L.forEach(l=>inst[l.instrument]=(inst[l.instrument]||0)+l.par);
  view(`<div class="toolbar"><div><h2>Private credit book</h2><p class="lede">Loan-level tape from the agent, with internal risk ratings. Yield excludes non-accrual loans.</p></div>
    <label class="sub">Fund <select id="sel-fund"><option value="ALL">All credit funds</option>${D.funds.filter(f=>f.strat==='PC').map(f=>`<option value="${f.id}" ${f.id===state.crFund?'selected':''}>${f.short}</option>`).join('')}</select></label></div>
   <section class="kpis">${kpi('Par outstanding',fmM(par),L.length+' loans · FV '+fmM(fv))}${kpi('Wtd. avg yield',fp(wf('yld')),'Cash + PIK + discount')}${kpi('Wtd. avg spread',Math.round(wf('spread',perf.filter(l=>l.floating))*10000)+' bps','Over SOFR 3.75%')}${kpi('Avg LTV',fp(wf('ltv'),0),'Leverage '+f1(wf('lev'))+'x')}${kpi('Floating rate',fp(flt/par,0),'of par')}${kpi('PIK exposure',fp(pik/par,0),'of par')}${kpi('Watch + non-accrual',fp(wl/par,1),L.filter(l=>l.rating>=4).length+' loans')}</section>
   <div class="grid g3">
    <div class="card"><h3>Par by internal rating</h3><div class="chart" id="c-rat"></div></div>
    <div class="card"><h3>Maturity ladder</h3><div class="chart" id="c-mat"></div></div>
    <div class="card"><h3>Par by instrument</h3><div class="chart" id="c-inst"></div></div></div>
   <div class="card"><div id="t-cr"></div></div>`);
  vBars($('#c-rat'),{aria:'Par by rating',name:'Par',cats:rat.map((r,i)=>({label:'R'+r.label.slice(-1),sub:r.sub,v:r.v,color:i>=3?cv('--orange'):cv('--blue'),tip:trow('','Loans',r.n)})),yfmt:fmM,vfmt:v=>v?fmM(v):'',tfmt:fm1,h:230});
  vBars($('#c-mat'),{aria:'Par by maturity year',name:'Par',cats:yrs.map(y=>({label:String(y),v:L.filter(l=>l.maturity===y).reduce((s,l)=>s+l.par,0),tip:trow('','Loans',L.filter(l=>l.maturity===y).length)})),yfmt:fmM,vfmt:v=>v?fmM(v):'',tfmt:fm1,h:230});
  hBars($('#c-inst'),{aria:'Par by instrument',l:112,maxLen:16,rowH:34,rows:Object.entries(inst).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,parts:[{v,color:cv('--blue'),name:'Par',fmt:fm1(v)}],text:fmM(v)})),xfmt:fmM});
  const cols=[{key:'borrower',label:'Borrower',fmt:v=>`<b>${esc(v)}</b>`},{key:'fund',label:'Fund',fmt:v=>`<span class="tag">${v}</span>`},{key:'instrument',label:'Instrument'},{key:'par',label:'Par',r:1,fmt:fm1},{key:'price',label:'Price',r:1,fmt:v=>(v*100).toFixed(1)},
   {key:'cash',label:'Coupon',r:1,fmt:(v,r)=>r.floating?`S+${Math.round(r.spread*10000)}`:fp(v)},{key:'pik',label:'PIK',r:1,fmt:v=>v?fp(v):'—'},{key:'yld',label:'Yield',r:1,fmt:(v,r)=>r.rating===5?'<span class="muted">n/a</span>':`<b>${fp(v)}</b>`},{key:'ltv',label:'LTV',r:1,fmt:v=>fp(v,0)},{key:'lev',label:'Leverage',r:1,fmt:v=>f1(v)+'x'},{key:'cov',label:'Int. cover',r:1,fmt:v=>f1(v)+'x'},
   {key:'maturity',label:'Maturity',r:1},{key:'rating',label:'Rating',r:1},{key:'status',label:'Status',fmt:v=>statusPill(v)}];
  table($('#t-cr'),'cr',cols,L,{sort:{key:'rating',dir:-1}});
  $('#sel-fund').onchange=e=>{state.crFund=e.target.value;render();};
}

function controls(){
  const C=D.controls,Q=C.quality;
  const dims=[['Completeness','Required fields populated',Q.completeness],['Validity','Values within allowed ranges',Q.validity],['Timeliness','Feeds loaded within SLA',Q.timeliness],['Consistency','Reconciliation checks passed',Q.consistency]];
  view(`<div class="toolbar"><div><h2>Data &amp; controls</h2><p class="lede">What the platform checks before numbers reach management. Every figure on the other tabs passes through these steps.</p></div></div>
   <section class="kpis">${kpi('Data quality score',fp(Q.overall,0),'Average of 4 dimensions')}${kpi('Recon checks passed',Q.passed+' / '+Q.checks,'Tolerance: NAV 0.05%')}${kpi('Open exceptions',C.exceptions.length,C.exceptions.filter(e=>e.status==='Break').length+' break, '+C.exceptions.filter(e=>e.status==='Review').length+' review')}${kpi('Sources loaded',C.sources.filter(s=>s.status==='On time').length+' / '+C.sources.length,'on time')}</section>
   <div class="card" style="margin-bottom:16px"><h3>Quality by dimension</h3><div style="display:grid;gap:18px 32px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${dims.map(([n,d,v])=>`<div><div style="display:flex;justify-content:space-between;gap:12px"><b>${n}</b><span class="num" style="font-family:var(--f-mono)">${fp(v)}</span></div><div class="bar-score"><div class="track"><div class="fill" style="width:${(v*100).toFixed(1)}%"></div></div></div><div class="sub">${d}</div></div>`).join('')}</div></div>
   <div class="card" style="margin-bottom:16px"><h3>Open exceptions</h3><div id="t-ex"></div></div>
   <div class="card" style="margin-bottom:16px"><h3>Source systems · Q3 close</h3><div id="t-src"></div></div>
   <div class="card"><h3>Reconciliation matrix</h3><p class="note" style="margin:0 0 8px">Pass means inside tolerance. Review is a small difference with a known cause. Break needs sign-off before reporting.</p><div id="t-rec"></div></div>`);
  table($('#t-ex'),'ex',[{key:'fund',label:'Fund',fmt:v=>`<b>${v}</b>`},{key:'check',label:'Check'},{key:'variance',label:'Variance',r:1,cls:'num'},{key:'status',label:'Status',fmt:statusPill},{key:'cause',label:'Likely cause',cls:'wrap'},{key:'owner',label:'Owner'},{key:'age',label:'Age (d)',r:1}],C.exceptions);
  table($('#t-src'),'src',[{key:'name',label:'System',fmt:v=>`<b>${v}</b>`},{key:'feeds',label:'Feeds',cls:'wrap'},{key:'freq',label:'Frequency'},{key:'loadedDay',label:'Loaded',r:1,fmt:v=>'T+'+v},{key:'sla',label:'SLA',r:1,fmt:v=>'T+'+v},{key:'records',label:'Records',r:1,fmt:v=>v.toLocaleString('en-US')},{key:'pending',label:'Pending',r:1,fmt:v=>v||'—'},{key:'status',label:'Status',fmt:statusPill}],C.sources);
  table($('#t-rec'),'rec',[{key:'short',label:'Fund',fmt:v=>`<b>${v}</b>`},{key:'nav',label:'Platform NAV',r:1,fmt:fm1},{key:'navVarPct',label:'Admin NAV var.',r:1,fmt:v=>(v*100).toFixed(3)+'%'},{key:'navStatus',label:'NAV',fmt:statusPill},{key:'cashVar',label:'Cash vs GL',r:1,fmt:v=>fm1(v)},{key:'cashStatus',label:'Cash',fmt:statusPill},{key:'positionsPct',label:'Other net assets',r:1,fmt:v=>fp(v)},{key:'posStatus',label:'Positions',fmt:statusPill}],C.recon);
}

function implementation(){
  view(`<div class="toolbar"><div><h2>Implementation</h2><p class="lede">How this reporting solution is built and rolled out for an alternative investment manager: sources, controls, calculations, delivery.</p></div></div>
   <div class="card" style="margin-bottom:16px"><h3>Data flow</h3><div class="flow">
     <div><em>1 · Sources</em><b>Administrators, loan agent, GL, CRM</b><span>Files, APIs and SFTP drops. Each feed has an owner and an SLA.</span></div>
     <div><em>2 · Staging</em><b>Raw landing zone</b><span>Untouched copies with load time and file hash for audit.</span></div>
     <div><em>3 · Validation</em><b>Rules and reconciliation</b><span>Schema, range and tie-out checks. Breaks route to an owner.</span></div>
     <div><em>4 · Calculation</em><b>Performance engine</b><span>IRR, TVPI, DPI, RVPI and credit metrics from dated cash flows and positions.</span></div>
     <div><em>5 · Data mart</em><b>Star schema</b><span><span class="code">dim_fund</span> <span class="code">dim_asset</span> <span class="code">fact_cashflow</span> <span class="code">fact_valuation</span> <span class="code">fact_loan_tape</span></span></div>
     <div><em>6 · Delivery</em><b>Dashboard and LP reports</b><span>Management view, quarterly LP pack and ad hoc exports.</span></div></div></div>
   <div class="grid g2">
    <div class="card"><h3>Metric definitions</h3><dl class="defs">
      <dt>Net IRR</dt><dd>Annualised rate that sets the net present value of dated contributions, distributions and closing NAV to zero (XIRR, quarter-end dates).</dd>
      <dt>TVPI</dt><dd><span class="code">(Distributions + NAV) / Paid-in</span></dd>
      <dt>DPI</dt><dd><span class="code">Distributions / Paid-in</span>. Cash returned to investors.</dd>
      <dt>RVPI</dt><dd><span class="code">NAV / Paid-in</span>. Value still held.</dd>
      <dt>Pooled metrics</dt><dd>Fund cash flows are summed by date before calculating, never averaged across funds.</dd>
      <dt>Credit yield</dt><dd>Cash coupon plus PIK plus discount to par spread over 4 years, weighted by fair value. Non-accrual loans excluded.</dd>
      <dt>LTV, leverage</dt><dd>Debt through our tranche over enterprise value, and over EBITDA.</dd>
      <dt>Risk rating</dt><dd>1 to 5 from LTV, leverage and interest cover. 4 is watchlist, 5 is non-accrual.</dd></dl></div>
    <div class="card"><h3>Rollout plan</h3><ul class="tl">
      ${[['Wks 1–2','Discovery and data inventory','Map sources, owners, fields and the current quarter-end process.','Complete'],['Wks 3–5','Data model and ingestion','Staging layer, star schema, administrator and loan tape loaders.','Complete'],['Wks 6–8','Validation and reconciliation','Rules library, tolerances, exception workflow with named owners.','Complete'],['Wks 9–11','Calculation engine and testing','Metrics tied to administrator figures for three prior quarters.','In progress'],['Wks 12–13','Dashboard, UAT and training','Management and finance sign-off, runbook, parallel run.','Planned'],['Wk 14','Go-live and handover','Q4 close on the platform. Legacy spreadsheets retired.','Planned']].map(([w,t,d,s])=>`<li><span class="w">${w}</span><div><b>${t}</b><span class="d">${d}</span></div>${pill(s,s==='Complete'?'good':s==='In progress'?'warn':'neutral',s==='Complete'?'●':s==='In progress'?'▲':'')}</li>`).join('')}</ul></div></div>
   <div class="card"><h3>Quarter-end controls the platform runs</h3><ul class="commentary">
     <li><b>Completeness:</b> every fund has a capital account, NAV and position file before calculation starts.</li>
     <li><b>Tie-out:</b> platform NAV against the administrator within 0.05%; cash flows against the ledger within $0.05M.</li>
     <li><b>Reasonableness:</b> quarter-on-quarter NAV moves over 10% and mark changes over 15% are flagged for the valuation committee.</li>
     <li><b>Lineage:</b> each reported number links back to the source file, load time and rule version.</li>
     <li><b>Access:</b> role-based views for management, finance and investor relations.</li></ul></div>`);
}

/* ---------- shell ---------- */
function view(html){$('#view').innerHTML=html;}
function bindStrat(){document.querySelectorAll('[data-strat]').forEach(b=>b.onclick=()=>{state.strat=b.dataset.strat;render();});}
function render(){charts=[];hideTip();
  $('#tabs').innerHTML=TABS.map(([k,l])=>`<a href="#${k}" ${k===state.tab?'aria-current="page"':''}>${l}</a>`).join('');
  ({overview,funds,equity,credit,controls,implementation})[state.tab]();}
function route(){const h=location.hash.slice(1);const t=TABS.find(t=>t[0]===h);state.tab=t?t[0]:'overview';render();}
window.addEventListener('hashchange',()=>{route();window.scrollTo(0,0);});
let rt;new ResizeObserver(()=>{clearTimeout(rt);rt=setTimeout(()=>charts.forEach(f=>f()),120);}).observe(document.body);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>render());
route();
})();

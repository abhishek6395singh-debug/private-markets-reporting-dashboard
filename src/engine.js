/* Simulation + calculation engine. Pure JS, no DOM. All data is synthetic. */
(function (root) {
'use strict';
const NQ = 35, FIRST_YEAR = 2018, LAST = NQ - 1;           // Q1'18 .. Q3'26
const BASE_RATE = 0.0375;                                   // assumed SOFR for the simulation

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeRand(seed){const r=mulberry32(seed);return{u:r,range:(a,b)=>a+(b-a)*r(),int:(a,b)=>Math.floor(a+r()*(b-a+1)),
  n:()=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);},pick:a=>a[Math.floor(r()*a.length)]};}
const qLabel=i=>`Q${i%4+1} '${String(FIRST_YEAR+Math.floor(i/4)).slice(2)}`;
const qYear=i=>FIRST_YEAR+Math.floor(i/4);
const qDate=i=>Date.UTC(qYear(i),(i%4)*3+3,0);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- performance maths ---------- */
function npv(flows,r){const t0=flows[0].t;let s=0;for(const f of flows)s+=f.v/Math.pow(1+r,(f.t-t0)/31557600000);return s;}
function xirr(flows){
  flows=flows.filter(f=>f.v!==0);
  if(flows.length<2||!flows.some(f=>f.v>0)||!flows.some(f=>f.v<0))return null;
  let lo=-0.95,hi=10,flo=npv(flows,lo),fhi=npv(flows,hi);
  if(flo*fhi>0)return null;
  for(let k=0;k<200;k++){const mid=(lo+hi)/2,fm=npv(flows,mid);if(Math.abs(fm)<1e-10)return mid;if(flo*fm<0){hi=mid;fhi=fm;}else{lo=mid;flo=fm;}}
  return (lo+hi)/2;
}
/* rows: [{i,call,dist,nav}] ordered by quarter. Metrics as of quarter `upTo`. */
function metrics(rows,upTo){
  upTo=upTo==null?LAST:upTo;
  const r=rows.filter(x=>x.i<=upTo);
  if(!r.length)return null;
  let pic=0,dist=0;const flows=[];
  for(const x of r){pic+=x.call;dist+=x.dist;flows.push({t:qDate(x.i),v:x.dist-x.call});}
  const nav=r[r.length-1].nav;
  flows[flows.length-1]={t:flows[flows.length-1].t,v:flows[flows.length-1].v+nav};
  return{pic,dist,nav,dpi:pic?dist/pic:0,rvpi:pic?nav/pic:0,tvpi:pic?(dist+nav)/pic:0,irr:xirr(flows)};
}
function pool(funds,upTo){
  const rows=[];
  for(let i=0;i<NQ;i++){let call=0,dist=0,nav=0;for(const f of funds){const x=f.rows.find(r=>r.i===i);if(x){call+=x.call;dist+=x.dist;nav+=x.nav;}}rows.push({i,call,dist,nav});}
  return{rows:rows.filter(r=>r.call||r.dist||r.nav),m:null};
}
function pooled(funds,upTo){const p=pool(funds).rows;return metrics(p,upTo);}

/* ---------- fund simulation ---------- */
const FUND_DEFS=[
 {id:'BO3',name:'ARC Buyout Partners III',short:'Buyout III',strat:'PE',sub:'Buyout',vintage:2018,commit:600,callQ:20,pct:.94,g:.0385,vol:.022,dStart:10,dMult:1.0,fee:.0175,n:7,mult:2.05},
 {id:'DL1',name:'ARC Direct Lending I',short:'Direct Lending I',strat:'PC',sub:'Direct lending',vintage:2018,commit:500,callQ:8,pct:.92,g:.0262,vol:.003,inc:.0215,repay:12,fee:.0125,n:9},
 {id:'GE1',name:'ARC Growth Equity I',short:'Growth I',strat:'PE',sub:'Growth equity',vintage:2019,commit:450,callQ:18,pct:.9,g:.0425,vol:.03,dStart:11,dMult:.95,fee:.02,n:7,mult:1.95},
 {id:'MZ2',name:'ARC Mezzanine II',short:'Mezzanine II',strat:'PC',sub:'Mezzanine',vintage:2020,commit:400,callQ:10,pct:.9,g:.0285,vol:.004,inc:.0185,repay:14,fee:.015,n:7},
 {id:'SE1',name:'ARC Secondaries I',short:'Secondaries I',strat:'PE',sub:'Secondaries',vintage:2020,commit:350,callQ:12,pct:.88,g:.0335,vol:.015,dStart:4,dMult:1.3,fee:.01,n:8,mult:1.5},
 {id:'BO4',name:'ARC Buyout Partners IV',short:'Buyout IV',strat:'PE',sub:'Buyout',vintage:2021,commit:900,callQ:20,pct:.86,g:.036,vol:.024,dStart:12,dMult:1.0,fee:.0175,n:6,mult:1.4},
 {id:'DL2',name:'ARC Direct Lending II',short:'Direct Lending II',strat:'PC',sub:'Direct lending',vintage:2021,commit:800,callQ:10,pct:.93,g:.0268,vol:.003,inc:.0215,repay:14,fee:.0125,n:10},
 {id:'GE2',name:'ARC Growth Equity II',short:'Growth II',strat:'PE',sub:'Growth equity',vintage:2022,commit:700,callQ:18,pct:.8,g:.033,vol:.03,dStart:12,dMult:1,fee:.02,n:6,mult:1.18},
 {id:'SS1',name:'ARC Special Situations I',short:'Special Sits I',strat:'PC',sub:'Special situations',vintage:2022,commit:450,callQ:12,pct:.85,g:.031,vol:.012,inc:.011,repay:16,fee:.015,n:6},
 {id:'DL3',name:'ARC Direct Lending III',short:'Direct Lending III',strat:'PC',sub:'Direct lending',vintage:2024,commit:1000,callQ:8,pct:.78,g:.0262,vol:.003,inc:.0212,repay:14,fee:.0125,n:8}
];

function simulateFund(def,R){
  const start=(def.vintage-FIRST_YEAR)*4+1, rows=[];
  const w=[];for(let a=0;a<def.callQ;a++)w.push((Math.sin(Math.PI*(a+.5)/def.callQ)+.35)*R.range(.85,1.15));
  const ws=w.reduce((s,x)=>s+x,0), total=def.commit*def.pct;
  let nav=0;
  for(let i=start;i<=LAST;i++){
    const a=i-start;
    const call=a<def.callQ?total*w[a]/ws:0;
    const fee=a<def.callQ?def.commit*def.fee/4:nav*def.fee*.7/4;
    let g,dist=0;
    if(def.strat==='PE'){
      g=def.g*(.35+.65*Math.min(1,a/10))+R.n()*def.vol*.5;
      if(R.u()<.07)g-=.03;
      if(a>=def.dStart){dist=nav*Math.min(.09,.012+.004*(a-def.dStart))*def.dMult*R.range(.55,1.45);}
    }else{
      g=def.g+R.n()*def.vol;
      if(a>=2)dist+=nav*def.inc;
      if(a>=def.repay)dist+=nav*Math.min(.12,.03+.006*(a-def.repay))*R.range(.7,1.3);
    }
    const grown=nav*(1+g);
    dist=Math.min(dist,grown);
    nav=Math.max(0,grown+call-dist-fee);
    rows.push({i,call,dist,nav,fee});
  }
  return Object.assign({},def,{start,rows});
}

/* ---------- holdings & loans ---------- */
const SECTORS={
 'Software':['Systems','Labs','Cloud','Analytics'],'Healthcare':['Health','Diagnostics','Biosciences','Care'],
 'Industrials':['Industries','Components','Manufacturing','Dynamics'],'Business Services':['Partners','Solutions','Group','Services'],
 'Consumer':['Brands','Foods','Home','Outdoors'],'Financial Services':['Payments','Insurance Services','Advisory','Risk'],
 'Energy Transition':['Renewables','Power','Grid','Energy'],'Logistics':['Freight','Logistics','Supply Co','Cold Chain']};
const PREFIX=['Aldine','Brightwater','Cobalt Ridge','Dunmore','Elmstead','Fairhaven','Granite Bay','Harlow','Ironvale','Juniper','Kestrel','Lanternside','Marlow','Northgate','Oakhurst','Pinecrest','Quarry Hill','Redfern','Silverton','Thornfield','Umber','Vantage Point','Westmere','Yarrow','Zephyr','Ashbourne','Bellmont','Calder','Draycott','Eastvale','Foxglove','Greywell','Hollis','Ingleby','Jasper Lane','Kingsmead','Lowell','Mosswood','Nettlefield','Orchard Cross','Parkdale','Ravenscar','Stonebridge','Tilbury','Upland','Verity','Wexford','Yewtree'];
const REGIONS=['North America','North America','North America','Europe','Europe','Asia Pacific'];

function genCompanies(count,R,used){
  const out=[];
  while(out.length<count){
    const sector=R.pick(Object.keys(SECTORS)),p=R.pick(PREFIX),s=R.pick(SECTORS[sector]);
    const name=`${p} ${s}`;if(used.has(name)||(used.size<PREFIX.length&&used.has(p)))continue;used.add(name);used.add(p);out.push({name,sector});
  }
  return out;
}
function genHoldings(funds,R,used){
  const out=[];
  for(const f of funds.filter(f=>f.strat==='PE')){
    const nav=f.rows[f.rows.length-1].nav, cos=genCompanies(f.n,R,used);
    const w=cos.map(()=>R.range(.5,1.6)), ws=w.reduce((s,x)=>s+x,0);
    cos.forEach((c,k)=>{
      const fv=nav*.96*w[k]/ws, moic=clamp(Math.exp(Math.log(f.mult)+R.n()*.32),.35,4.6);
      const yr=Math.min(2026,R.int(f.vintage,f.vintage+3)), sw=c.sector==='Software'||c.sector==='Healthcare';
      const entry=R.range(8,15)*(sw?1.25:1), cur=entry*clamp(.8+(moic-1)*.18+R.n()*.07,.55,1.7);
      out.push({id:f.id+'-'+k,fund:f.id,company:c.name,sector:c.sector,region:R.pick(REGIONS),entry:yr,cost:fv/moic,fv,moic,
        evEbitdaEntry:entry,evEbitdaNow:cur,lev:R.range(2.4,6.4),revG:clamp(R.range(-.04,.12)+(sw?.1:0)+(moic-1)*.05,-.08,.42),
        ebitdaG:R.u()<.07?null:clamp(R.range(-.1,.2)+(moic-1)*.12,-.25,.55),
        method:yr>=2026?'Cost':R.pick(['Trading comps','Trading comps','Transaction comps','DCF'])});
    });
  }
  return out;
}
function genLoans(funds,R,used){
  const out=[];
  for(const f of funds.filter(f=>f.strat==='PC')){
    const nav=f.rows[f.rows.length-1].nav, cos=genCompanies(f.n,R,used);
    const w=cos.map(()=>R.range(.5,1.6)), ws=w.reduce((s,x)=>s+x,0);
    cos.forEach((c,k)=>{
      let inst,spread=0,fixed=0,pik=0,ltv,lev,cov,price;
      if(f.sub==='Direct lending'){inst=R.pick(['Unitranche','Unitranche','First-lien term loan','First-lien term loan','Second-lien term loan']);
        spread=inst==='Second-lien term loan'?R.range(.078,.09):R.range(.047,.066);ltv=R.range(.34,.55);lev=R.range(3.6,6.2);cov=R.range(1.5,3);price=R.range(.965,1.005);pik=R.u()<.12?R.range(.01,.025):0;}
      else if(f.sub==='Mezzanine'){inst=R.pick(['Mezzanine notes','Subordinated notes']);fixed=R.range(.105,.125);pik=R.range(.02,.045);ltv=R.range(.5,.68);lev=R.range(4.8,6.9);cov=R.range(1.25,2.2);price=R.range(.94,1.0);}
      else{inst=R.pick(['Special situations term loan','Rescue financing','DIP loan']);spread=R.range(.09,.13);ltv=R.range(.55,.85);lev=R.range(5,8);cov=R.range(.9,1.8);price=R.range(.78,.98);pik=R.u()<.4?R.range(.02,.04):0;}
      const fv=nav*.97*w[k]/ws, par=fv/price, floating=fixed===0;
      const cash=floating?BASE_RATE+spread:fixed, wal=3;
      const yld=cash+pik+(1-price)/4;
      const score=(ltv-.3)*5+(lev-3)/1.6+(2.4-cov)*.9+(f.sub==='Special situations'?.1:0)+R.n()*.25;
      let rating=score<1.6?1:score<2.4?2:score<3.3?3:score<4.1?4:5;
      out.push({score,id:f.id+'-'+k,fund:f.id,borrower:c.name,sector:c.sector,instrument:inst,par,fv,price,floating,spread:floating?spread:null,cash,pik,yld,ltv,lev,cov,
        maturity:R.int(2027,f.id==='DL3'?2031:2030),rating,hasCert:R.u()>.05});
    });
  }
  // realistic tail: 2 non-accruals, 4 watchlist, everything else rated 1-3
  const ranked=out.slice().sort((x,y)=>y.score-x.score);
  ranked.forEach((l,k)=>{l.rating=k<2?5:k<6?4:Math.min(l.rating,3);});
  // guarantee a realistic tail: one watchlist-grade and one non-accrual name in the stressed fund
  const ss=out.filter(l=>l.fund==='SS1').sort((a,b)=>b.ltv-a.ltv);
  if(!out.some(l=>l.rating===5)&&ss[0]){ss[0].rating=5;}
  if(!out.some(l=>l.rating===4)&&ss[1]){ss[1].rating=4;}
  for(const l of out){
    l.status=l.rating===5?'Non-accrual':l.rating===4?'Watchlist':'Performing';
    if(l.rating>=4){const mark=l.rating===5?R.range(.62,.74):R.range(.86,.93);l.price=Math.min(l.price,mark);l.par=l.fv/l.price;
      l.yld=l.cash+l.pik+(1-l.price)/4;}
    if(l.rating===5)l.pikAccrued=true;
  }
  return out;
}

/* ---------- data platform: sources, reconciliation, quality ---------- */
function genControls(funds,holdings,loans,R){
  const sla=14;
  const sources=[
   {name:'Fund Administrator A',feeds:'Capital accounts, NAV, capital calls',freq:'Quarterly + ad hoc',sla:14,loadedDay:12,records:funds.filter(f=>['BO3','GE1','SE1','DL1','MZ2'].includes(f.id)).length*35,pending:0},
   {name:'Fund Administrator B',feeds:'Capital accounts, NAV, distributions',freq:'Quarterly + ad hoc',sla:14,loadedDay:17,records:funds.filter(f=>['BO4','GE2','DL2','SS1','DL3'].includes(f.id)).length*35,pending:0},
   {name:'Loan agent tapes',feeds:'Positions, rates, accruals, covenants',freq:'Monthly',sla:10,loadedDay:8,records:loans.length*3,pending:loans.filter(l=>!l.hasCert).length},
   {name:'Portfolio monitoring',feeds:'Company KPIs, EBITDA, leverage',freq:'Quarterly',sla:35,loadedDay:33,records:holdings.length*6,pending:holdings.filter(h=>h.ebitdaG==null).length},
   {name:'General ledger (ERP)',feeds:'Cash, fees, expense accruals',freq:'Daily',sla:10,loadedDay:9,records:4820,pending:0},
   {name:'Investor register (CRM)',feeds:'LP commitments, contacts, side letters',freq:'Weekly',sla:7,loadedDay:5,records:312,pending:0},
   {name:'Valuation committee pack',feeds:'Approved fair values, methodology',freq:'Quarterly',sla:30,loadedDay:28,records:holdings.length+loans.length,pending:0},
   {name:'Market data',feeds:'SOFR curve, FX, index levels',freq:'Daily',sla:2,loadedDay:1,records:1260,pending:0}];
  for(const s of sources){s.status=s.pending>0?'Partial':s.loadedDay>s.sla?'Late':'On time';}
  // reconciliation variances (administrator vs platform), injected as realistic breaks
  const navVar={BO3:.00002,DL1:-.00001,GE1:.00004,MZ2:.00003,SE1:-.00002,BO4:.0012,DL2:-.0031,GE2:.00001,SS1:.00006,DL3:.00002};
  const cashVar={BO3:0,DL1:0,GE1:.02,MZ2:0,SE1:0,BO4:.35,DL2:0,GE2:0,SS1:.04,DL3:0};
  const recon=funds.map(f=>{
    const nav=f.rows[f.rows.length-1].nav,hv=(f.strat==='PE'?holdings:loans).filter(x=>x.fund===f.id).reduce((s,x)=>s+x.fv,0);
    const other=nav-hv;
    return{fund:f.id,short:f.short,nav,navVarPct:navVar[f.id],navVarAbs:nav*navVar[f.id],cashVar:cashVar[f.id],positionsPct:other/nav,otherNet:other};
  });
  const tol={nav:.0005,cash:.05,pos:.06};
  for(const r of recon){
    r.navStatus=Math.abs(r.navVarPct)<=tol.nav?'Pass':Math.abs(r.navVarPct)<=.0025?'Review':'Break';
    r.cashStatus=Math.abs(r.cashVar)<=tol.cash?'Pass':Math.abs(r.cashVar)<=.5?'Review':'Break';
    r.posStatus=Math.abs(r.positionsPct)<=tol.pos?'Pass':'Review';
  }
  const exceptions=[];
  const explain={BO4:['Capital call dated 29 Sep booked by administrator on 1 Oct','Cut-off timing','Fund Accounting'],DL2:['Accrued interest on two loans differs from agent tape','Accrual method','Credit Ops']};
  for(const r of recon){
    if(r.navStatus!=='Pass')exceptions.push({fund:r.short,check:'NAV: administrator vs platform',variance:`${(r.navVarPct*100).toFixed(2)}% (${r.navVarAbs>=0?'+':'-'}$${Math.abs(r.navVarAbs).toFixed(2)}M)`,status:r.navStatus,cause:(explain[r.fund]||['Under investigation'])[0],owner:(explain[r.fund]||[0,0,'Fund Accounting'])[2],age:explain[r.fund]?3:1});
    if(r.cashStatus!=='Pass')exceptions.push({fund:r.short,check:'Cash flows: platform vs GL',variance:`$${r.cashVar.toFixed(2)}M`,status:r.cashStatus,cause:r.fund==='BO4'?'Late distribution notice from administrator':'FX rounding on wire',owner:'Treasury',age:r.fund==='BO4'?3:1});
  }
  // data quality dimensions, computed from the data above
  const peReq=holdings.length*4, peMiss=holdings.filter(h=>h.ebitdaG==null).length;
  const pcReq=loans.length*3, pcMiss=loans.filter(l=>!l.hasCert).length;
  const completeness=1-(peMiss+pcMiss)/(peReq+pcReq);
  const valid=loans.filter(l=>l.ltv<=1&&l.rating>=1&&l.rating<=5).length+holdings.filter(h=>h.cost>0&&h.fv>0).length;
  const validity=valid/(loans.length+holdings.length);
  const timeliness=sources.filter(s=>s.loadedDay<=s.sla).length/sources.length;
  const checks=recon.length*3, passed=recon.reduce((s,r)=>s+[r.navStatus,r.cashStatus,r.posStatus].filter(x=>x==='Pass').length,0);
  const consistency=passed/checks;
  const quality={completeness,validity,timeliness,consistency,overall:(completeness+validity+timeliness+consistency)/4,checks,passed};
  return{sources,recon,exceptions,quality,tol};
}

function generate(seed){
  const R=makeRand(seed||20261031), used=new Set();
  const funds=FUND_DEFS.map(d=>simulateFund(d,R));
  for(const f of funds){f.m=metrics(f.rows);f.age=LAST-f.start;f.unfunded=Math.max(0,f.commit-f.m.pic);
    f.status=f.age<(f.strat==='PE'?24:f.callQ+8)?'Investing':'Harvesting';}
  const holdings=genHoldings(funds,R,used), loans=genLoans(funds,R,used);
  return{funds,holdings,loans,controls:genControls(funds,holdings,loans,R),NQ,LAST,BASE_RATE};
}

const api={generate,metrics,pooled,pool,xirr,qLabel,qYear,qDate,NQ,LAST,BASE_RATE};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Engine=api;
})(typeof window!=='undefined'?window:globalThis);

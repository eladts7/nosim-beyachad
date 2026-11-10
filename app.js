/* ===== הגדרות: מלאו את פרטי Firebase כדי לעבור מהדגמה לשימוש אמיתי ===== */
const APP_NAME='נוסעים ביחד';
const firebaseConfig={apiKey:'',authDomain:'',projectId:'',storageBucket:'',messagingSenderId:'',appId:''};
const DEMO=!firebaseConfig.apiKey;

/* ===== קבועים ===== */
const DAYS=['א','ב','ג','ד','ה','ו','ש'];
const STATUS={open:'מחפשת נהג',taken:'נלקחה',done:'בוצעה',cancelled:'בוטלה'};
const VSTATUS={none:'טרם אומת/ה',pending:'ממתין/ה לאישור',approved:'מאומת/ת',rejected:'נדחה'};
const DOCS={
  license:{title:'רישיון נהיגה',hint:'צילום ברור של הרישיון',dateLabel:'בתוקף עד',dateKey:'expiry'},
  insurance:{title:'ביטוח חובה לרכב',hint:'הפוליסה או צילום שלה',dateLabel:'בתוקף עד',dateKey:'expiry'},
  police:{title:'אישור על היעדר עבירות מין',hint:'אישור מהמשטרה',dateLabel:'תאריך הנפקה',dateKey:'issued'}
};
const LANGS=['עברית','ערבית','רוסית','אמהרית','אנגלית','צרפתית','ספרדית'];
const EXP=['פגיעה קוגניטיבית','מוגבלות שכלית','אוטיזם','דמנציה','מוגבלות פיזית','לקות שמיעה','לקות ראייה','קשישים'];
const NEEDS=[
  {k:'wheelchair',i:'♿',t:'כיסא גלגלים',hot:true},
  {k:'walker',i:'🚶',t:'הליכון / קביים'},
  {k:'guideDog',i:'🐕‍🦺',t:'כלב נחייה'},
  {k:'hearing',i:'🦻',t:'לקות שמיעה / מכשיר שמיעה'},
  {k:'vision',i:'👁️',t:'לקות ראייה'},
  {k:'cognitive',i:'🧠',t:'פגיעה קוגניטיבית / מוגבלות שכלית',hot:true,cog:true},
  {k:'autism',i:'🧩',t:'על הרצף האוטיסטי',cog:true},
  {k:'escort',i:'👥',t:'מגיע/ה עם מלווה'},
  {k:'returnTrip',i:'↩',t:'צריך גם חזור'}
];
const hasNeed=(r,k)=>(r.needs||[]).includes(k)||r[k]===true;
const isCog=r=>NEEDS.some(n=>n.cog&&hasNeed(r,n.k));
const COG_EXP=['פגיעה קוגניטיבית','מוגבלות שכלית','אוטיזם','דמנציה'];

/* ===== שומרים שבת =====
   זמני השקיעה מחושבים לפי מרכז הארץ (אלגוריתם NOAA), עם מרווח ביטחון.
   המערכת נסגרת 30 דקות לפני השקיעה ביום שישי ונפתחת 45 דקות אחרי השקיעה במוצאי שבת. */
const LAT=32.08,LON=34.78;
function sunsetLocal(dateObj){
  const y=dateObj.getFullYear(),m=dateObj.getMonth(),d=dateObj.getDate();
  const start=Date.UTC(y,0,1),doy=Math.floor((Date.UTC(y,m,d)-start)/864e5)+1;
  const g=2*Math.PI/365*(doy-1);
  const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const lat=LAT*Math.PI/180;
  const ha=Math.acos(Math.cos(90.833*Math.PI/180)/(Math.cos(lat)*Math.cos(dec))-Math.tan(lat)*Math.tan(dec))*180/Math.PI;
  const utcMin=720-4*(LON-ha)-eq;
  return new Date(Date.UTC(y,m,d,0,0)+utcMin*6e4);
}
function shabbatWindow(now=new Date()){
  const fri=new Date(now);const back=(now.getDay()+2)%7; // 5=שישי
  fri.setDate(now.getDate()-back);fri.setHours(12,0,0,0);
  const sat=new Date(fri);sat.setDate(fri.getDate()+1);
  return {start:new Date(sunsetLocal(fri).getTime()-30*6e4),end:new Date(sunsetLocal(sat).getTime()+45*6e4)};
}
/* חגים: מחושבים מהלוח העברי של הדפדפן לכל שנה. הטבלה היא גיבוי בלבד. */
const HOLIDAYS_FALLBACK={'2026-09-12':'ראש השנה','2026-09-13':'ראש השנה','2026-09-21':'יום כיפור','2026-09-26':'סוכות','2026-10-03':'שמיני עצרת',
  '2027-04-22':'פסח','2027-04-28':'שביעי של פסח','2027-06-11':'שבועות','2027-10-02':'ראש השנה','2027-10-03':'ראש השנה','2027-10-11':'יום כיפור','2027-10-16':'סוכות','2027-10-23':'שמיני עצרת'};
const HEB_YT={'Tishri-1':'ראש השנה','Tishri-2':'ראש השנה','Tishri-10':'יום כיפור','Tishri-15':'סוכות','Tishri-22':'שמיני עצרת','Nisan-15':'פסח','Nisan-21':'שביעי של פסח','Sivan-6':'שבועות'};
let hebFmt=null;try{hebFmt=new Intl.DateTimeFormat('en-u-ca-hebrew',{day:'numeric',month:'long',timeZone:'UTC'});if(!/Tishri|Nisan|Sivan|Heshvan|Kislev|Tevet|Shevat|Adar|Iyar|Tamuz|Av|Elul/.test(hebFmt.format(new Date(Date.UTC(2026,8,12)))))hebFmt=null;}catch(e){hebFmt=null;}
const holCache={};
function holidayName(iso){
  if(iso in holCache)return holCache[iso];
  let n=HOLIDAYS_FALLBACK[iso]||'';
  if(hebFmt){const [y,m,d]=iso.split('-').map(Number);const p=Object.fromEntries(hebFmt.formatToParts(new Date(Date.UTC(y,m-1,d))).map(x=>[x.type,x.value]));n=HEB_YT[p.month+'-'+p.day]||'';}
  return holCache[iso]=n;
}
const isoOf=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function isRestDay(iso){return new Date(iso+'T12:00').getDay()===6||!!holidayName(iso);}
function restName(iso){return holidayName(iso)||'שבת';}
function restWindowNow(){
  const n=new Date();
  for(let off=-2;off<=1;off++){
    const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+off);
    if(!isRestDay(isoOf(d)))continue;
    const prev=new Date(d);prev.setDate(d.getDate()-1);
    if(isRestDay(isoOf(prev)))continue; /* תחילת רצף ימי מנוחה */
    let last=new Date(d);while(true){const nx=new Date(last);nx.setDate(last.getDate()+1);if(isRestDay(isoOf(nx)))last=nx;else break;}
    const start=new Date(sunsetLocal(prev).getTime()-30*6e4),end=new Date(sunsetLocal(last).getTime()+45*6e4);
    if(n>=start&&n<end)return {start,end,name:restName(isoOf(d))};
  }
  return null;
}
let forceShabbat=false;
function isShabbat(){if(forceShabbat)return true;return !!restWindowNow();}
const hhmm=d=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
/* שעת האיסוף האחרונה ביום שישי: שעתיים לפני הסגירה */
function fridayLastPickup(dateIso){const d=new Date(dateIso+'T12:00');return new Date(sunsetLocal(d).getTime()-150*6e4);}
function renderShabbat(){
  const on=isShabbat();$('#shabbat').hidden=!on;document.body.classList.toggle('is-shabbat',on);
  if(on){const w=restWindowNow()||{...shabbatWindow(),name:'שבת'};$('#shabbatEnd').textContent=hhmm(w.end);$('#shabbat h1').textContent=w.name==='שבת'?'שבת שלום':'חג שמח';}
}

/* ===== עזרים ===== */
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function localDateStr(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
const todayStr=()=>localDateStr(new Date());
function addDays(n){const d=new Date();d.setDate(d.getDate()+n);return localDateStr(d);}
function addWeekday(n){const d=new Date();d.setDate(d.getDate()+n);if(d.getDay()===6)d.setDate(d.getDate()+1);return localDateStr(d);}
function fmtDate(iso){if(!iso)return'';if(iso===todayStr())return'היום';if(iso===addDays(1))return'מחר';const d=new Date(iso+'T00:00');return `יום ${DAYS[d.getDay()]}׳ ${d.getDate()}/${d.getMonth()+1}`;}
const cleanPhone=p=>String(p||'').replace(/[^\d+]/g,'');
const validPhone=p=>/^0\d{8,9}$/.test(cleanPhone(p))||/^\+972\d{8,9}$/.test(cleanPhone(p));
function waNum(p){let n=cleanPhone(p).replace('+','');if(n.startsWith('0'))n='972'+n.slice(1);return n;}
const waLink=(p,t)=>`https://wa.me/${waNum(p)}?text=${encodeURIComponent(t)}`;
const norm=s=>String(s||'').trim().toLowerCase();
function areaMatch(a,b){a=norm(a);b=norm(b);if(!a||!b)return false;return a.includes(b)||b.includes(a)||a.split(/[,\s]+/).some(w=>w.length>1&&b.includes(w));}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2800);}
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}};
const lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
function docExpired(key,d){return !!(d&&DOCS[key].dateKey==='expiry'&&d.expiry&&d.expiry<todayStr());}
const carDesc=d=>d?[[d.carModel,d.carColor].filter(Boolean).join(' '),d.plate?`(${d.plate})`:''].filter(Boolean).join(' '):'';

/* ===== מועדי נסיעה ===== */
function occDates(r,n=4){
  if(r.schedule!=='weekly') return r.date&&r.date>=todayStr()?[r.date]:[];
  const out=[];
  for(let i=0;i<60&&out.length<n;i++){const d=new Date();d.setDate(d.getDate()+i);const s=localDateStr(d);
    if(r.until&&s>r.until)break; if((r.days||[]).includes(String(d.getDay()))&&!isRestDay(s)) out.push(s);}
  return out;
}
const coverOf=(r,date)=>(r.covers||{})[date];
/* הנסיעה הקרובה שעוד אין לה נהג */
function nextOpenOcc(r){ if(r.status!=='open') return null; return occDates(r,8).find(d=>!coverOf(r,d))||null; }
/* מי נוהג במועד מסוים */
function driverFor(r,date){ const c=coverOf(r,date); if(c) return {...c,cover:true}; if(r.status==='taken'&&r.driverId) return {driverId:r.driverId,driverName:r.driverName,driverPhone:r.driverPhone,driverCar:r.driverCar}; return null; }
function whenText(r){
  if(r.schedule==='weekly') return `כל שבוע · ${(r.days||[]).map(i=>DAYS[i]+'׳').join(', ')} · ${esc(r.time)}`;
  return `${fmtDate(r.date)} · ${esc(r.time)}`;
}
const isExpired=r=>r.schedule==='weekly'?!!(r.until&&r.until<todayStr()):(r.date<todayStr());
const who=r=>r.kind==='org'?r.orgName:'אדם פרטי';

/* ===== קבצים ===== */
function docSvg(title){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" rx="14" fill="#e5eefc"/><rect x="18" y="18" width="80" height="100" rx="8" fill="#c7d7f2"/><text x="300" y="60" font-family="Arial" font-size="20" text-anchor="end" fill="#1d2433">${title}</text><text x="300" y="95" font-family="Arial" font-size="14" text-anchor="end" fill="#667085">מסמך לדוגמה</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
async function shrinkFile(file){
  if(file.type.startsWith('image/')){
    const url=URL.createObjectURL(file);
    try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});
      const s=Math.min(1,1000/Math.max(img.width,img.height)),c=document.createElement('canvas');
      c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      return c.toDataURL('image/jpeg',.7);}finally{URL.revokeObjectURL(url);}
  }
  if(file.size<250000) return await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res('');r.readAsDataURL(file);});
  return '';
}

/* ===== נתוני דוגמה ===== */
function sampleVer(status){
  const docs={};
  for(const [k,d] of Object.entries(DOCS)) docs[k]={name:`${d.title}.jpg`,type:'image/svg+xml',url:docSvg(d.title),[d.dateKey]:d.dateKey==='expiry'?addDays(400):addDays(-30)};
  return {status,docs,declaration:true,submittedAt:Date.now()-3e6,note:''};
}
function seed(){
  const now=Date.now(),dow=n=>{const x=(new Date().getDay()+n)%7;return String(x===6?0:x);};
  const d1={name:'אורית לוי',phone:'052-1234567',type:'taxi',area:'רמת גן, גבעתיים, תל אביב',accessible:false,active:true,createdAt:now-9e8,verification:sampleVer('approved'),
    carModel:'טויוטה קורולה',carColor:'לבנה',plate:'12-345-67',trunk:true,languages:['עברית','רוסית'],experience:['אוטיזם','מוגבלות שכלית'],firstAid:true,fun:{orgVotes:4,lastMinute:1,streak:9,access:2,thanks:14},emergencyName:'דני לוי',emergencyPhone:'050-0000000',pastRides:27,pastHours:36,pastPassengers:7,joinedAt:now-2.2e10,redeemed:['coffee'],
    thanks:[{from:'שירה, עמותת בית חם',text:'אורית, הדיירים מחכים לימי שלישי בגללך. תודה שאת שם כל שבוע 💛',ago:'לפני 3 ימים'},{from:'משה, נוסע',text:'הגעתי בזמן לבדיקה, ועוד עזרת לי עם ההליכון. אין מילים.',ago:'לפני שבועיים'}]};
  const d2={name:'אבי פרץ',phone:'050-1112233',type:'taxi',area:'תל אביב, יפו, בת ים',accessible:true,active:true,createdAt:now-7e8,verification:sampleVer('approved'),
    carModel:'פולקסווגן טרנספורטר',carColor:'אפור',plate:'98-765-43',trunk:true,languages:['עברית','ערבית'],experience:['מוגבלות פיזית','קשישים'],firstAid:false,fun:{orgVotes:2,lastMinute:2,streak:3,access:11,thanks:9},pastRides:31,joinedAt:now-3e10};
  const d3={name:'יעל ברק',phone:'053-4445566',type:'citizen',area:'הרצליה, רמת השרון',accessible:false,active:true,createdAt:now-2e6,verification:sampleVer('pending'),languages:['עברית','אנגלית'],experience:[]};
  const as=(id,d)=>({driverId:id,driverName:d.name,driverPhone:d.phone,driverCar:carDesc(d)});
  const base={passengers:1,needs:[],notes:'',fromPlace:'',toPlace:'',days:[],date:'',until:'',driverId:null,covers:{}};
  const firstOcc=n=>addDays(n);
  const out={
    drivers:{d1,d2,d3,
      d4:{name:'משה דהן',phone:'052-7778899',type:'taxi',area:'חולון, בת ים',accessible:false,active:true,createdAt:now-6e9,verification:sampleVer('approved'),languages:['עברית','צרפתית'],experience:['קשישים'],fun:{orgVotes:1,lastMinute:5,streak:2,access:1,thanks:11},pastRides:18,joinedAt:now-1.2e10},
      d5:{name:'נועה פרידמן',phone:'054-1212121',type:'citizen',area:'גבעתיים, רמת גן',accessible:false,active:true,createdAt:now-4e8,verification:sampleVer('approved'),languages:['עברית','אנגלית'],experience:['דמנציה'],fun:{orgVotes:1,lastMinute:1,streak:1,access:0,thanks:22},pastRides:4,joinedAt:now-5e8}},
    requests:{
      r1:{...base,kind:'org',orgName:'עמותת בית חם',contactName:'שירה',phone:'03-5551234',fromCity:'רמת גן',fromPlace:'דיור בקהילה',toCity:'הרצליה',toPlace:'בית ההורים',schedule:'weekly',days:[dow(2),dow(5)],time:'16:00',needs:['autism'],cog:{alone:'no',from:'מדריך/ה בדיור',to:'אחד ההורים, בפתח הבית',comm:'משפטים קצרים ורגועים. לא מדבר הרבה, וזה בסדר.',calm:'אוהב לשבת מקדימה. רעש חזק וצפירות מלחיצים, מוזיקה שקטה מרגיעה.'},notes:'',status:'open',covers:{},createdAt:now-5e6},
      r2:{...base,kind:'private',orgName:'',contactName:'משה',phone:'054-3332211',fromCity:'תל אביב',fromPlace:'צפון הישן',toCity:'תל אביב',toPlace:'בית חולים איכילוב',schedule:'once',date:addWeekday(1),time:'09:30',needs:['walker','hearing','returnTrip'],notes:'קשיש, הולך עם הליכון ומרכיב מכשיר שמיעה. כדאי לדבר לאט ומול הפנים.',status:'open',createdAt:now-4e6},
      r3:{...base,kind:'org',orgName:'דיור מוגן אופק',contactName:'דנה',phone:'03-6667788',fromCity:'יפו',fromPlace:'דיור מוגן',toCity:'רמת גן',toPlace:'מרכז טיפולי',schedule:'once',date:addWeekday(3),time:'11:00',passengers:2,needs:['wheelchair','escort','returnTrip'],notes:'דיירת בכיסא גלגלים + מלווה',status:'open',createdAt:now-3e6},
      r4:{...base,kind:'org',orgName:'עמותת בית חם',contactName:'שירה',phone:'03-5551234',fromCity:'רמת גן',fromPlace:'דיור בקהילה',toCity:'פתח תקווה',toPlace:'בית ההורים',schedule:'weekly',days:[dow(1)],time:'15:00',status:'taken',...as('d1',d1),takenAt:now-1e6,createdAt:now-8e6},
      r5:{...base,kind:'private',orgName:'',contactName:'רחל (84)',phone:'03-5009988',fromCity:'חולון',fromPlace:'קריית שרת',toCity:'חולון',toPlace:'מרכז יום לקשיש',schedule:'weekly',days:[dow(3)],time:'08:30',needs:['vision','guideDog'],notes:'גרה לבד ומגיעה עם כלב הנחייה שלה. שמחה לשיחה בדרך.',status:'open',createdAt:now-2e6},
      r6:{...base,kind:'org',orgName:'מעון נווה',contactName:'יוסי',phone:'03-7771122',fromCity:'בת ים',fromPlace:'מעון',toCity:'חולון',toPlace:'בית חולים וולפסון',schedule:'once',date:addWeekday(2),time:'13:00',needs:['cognitive','escort'],cog:{alone:'no',from:'צוות המעון',to:'המלווה נשאר/ת כל הזמן; ביעד מקבל צוות המרפאה',comm:'פונים בשם, משפטים פשוטים. לא להרים קול.',calm:'שינוי במסלול מבלבל. כדאי להגיד מראש לאן נוסעים.'},status:'open',createdAt:now-1e6}
    }
};
  const f=occDates(out.requests.r1,1)[0];if(f)out.requests.r1.covers={[f]:{...as('d2',d2),at:now-5e5}};
  out.requests.r3.access='approved';
  out.drivers.d1.orgApprovals=['עמותת בית חם'];out.drivers.d2.orgApprovals=['דיור מוגן אופק','עמותת בית חם'];
  out.drivers.d1.avDays=['0','1','2','3','4'];out.drivers.d1.avSlots=['morning','noon'];
  out.drivers.d4.lateCancels=[{at:now-5*864e5,reason:'רכב במוסך',rideId:'r5'}];
  out.requests.r7={...base,kind:'org',orgName:'עמותת בית חם',contactName:'שירה',phone:'03-5551234',fromCity:'רמת גן',fromPlace:'דיור בקהילה',toCity:'גבעתיים',toPlace:'מרפאת שיניים',schedule:'once',date:addDays(-1),time:'10:00',status:'done',...as('d1',d1),doneAt:now-6e7,confirmed:null,createdAt:now-9e7};
  out.reports={
    p1:{rideId:'r5',by:'requester',byName:'רחל (84)',aboutDriverId:'d4',aboutDriverName:'משה דהן',type:'driver_late',text:'הנהג הגיע באיחור של 25 דקות בלי לעדכן.',at:now-12*864e5,status:'handled'},
    p2:{rideId:'r6',by:'requester',byName:'יוסי, מעון נווה',aboutDriverId:'d4',aboutDriverName:'משה דהן',type:'driver_late',text:'איחור של 20 דקות, הדייר נלחץ.',at:now-2*864e5,status:'open'},
    p3:{rideId:'r2',by:'driver',byName:'אבי פרץ',type:'no_show_passenger',text:'המתנתי 15 דקות והנוסע לא ירד. ניסיתי להתקשר בלי מענה.',at:now-1*864e5,status:'open'}};
  out.notifs={};
  out.pvts={
    '0543332211':{name:'משה',phone:'054-3332211',tzLast4:'4417',elig:'age',refName:'',status:'approved',at:now-5e9},
    '035009988':{name:'רחל (84)',phone:'03-5009988',tzLast4:'0921',elig:'disability',refName:'מרכז יום לקשיש חולון',refPhone:'03-5000000',status:'approved',at:now-6e9},
    '0507654321':{name:'אבנר',phone:'050-7654321',tzLast4:'3388',elig:'medical',refName:'',status:'pending',at:now-4e6}};
  out.requests.r8={...base,kind:'private',contactName:'אבנר',phone:'050-7654321',fromCity:'ראשון לציון',fromPlace:'נווה ים',toCity:'חולון',toPlace:'מכון דיאליזה',schedule:'weekly',days:[dow(1),dow(4)],time:'07:30',needs:[],notes:'דיאליזה פעמיים בשבוע',status:'open',privPending:true,createdAt:now-4e6};
  const chk=(a,b,c)=>({registry:a,contact:b,agreement:c});
  out.orgs={
    o1:{name:'עמותת בית חם',type:'nonprofit',regNum:'580000001',contactName:'שירה כהן',role:'רכזת דיור',phone:'03-5551234',email:'shira@example.org',ridesPerMonth:'40',status:'approved',checks:chk(true,true,true),at:now-4e9},
    o2:{name:'דיור מוגן אופק',type:'nonprofit',regNum:'580000002',contactName:'דנה לוי',role:'מנהלת',phone:'03-6667788',email:'dana@example.org',ridesPerMonth:'20',status:'approved',checks:chk(true,true,true),at:now-3e9},
    o3:{name:'מעון נווה',type:'nonprofit',regNum:'580000003',contactName:'יוסי אברהם',role:'רכז',phone:'02-5554433',email:'yossi@example.org',ridesPerMonth:'15',status:'contacted',checks:chk(true,true,false),note:'דיברנו, שולחים הסכם',at:now-6e8},
    o4:{name:'מרכז יום לקשיש חולון',type:'housing',regNum:'580000004',contactName:'אורנה',role:'מנהלת',phone:'03-5000000',email:'orna@example.org',ridesPerMonth:'30',message:'קשישים שמגיעים אלינו פעמיים בשבוע',status:'pending',checks:chk(false,false,false),at:now-9e7}};
  out.contacts={
    c1:{type:'partner',name:'רוני',org:'מוניות השרון (דוגמה)',phone:'09-7776655',email:'roni@example.com',message:'רוצים שהנהגים שלנו יתנדבו בימים שקטים',status:'new',at:now-9e7},
    c2:{type:'partner',name:'מיכל',org:'קפה השכונה (דוגמה)',phone:'052-1112233',email:'',message:'קפה ומאפה לנהגים אחרי 10 נסיעות',status:'handled',at:now-5e8}};
  return out;
}

/* ===== שכבת נתונים ===== */
function demoApi(){
  const KEY='rides-v10-demo';let data=lsGet(KEY);if(!data||!data.requests)data=seed();
  const subs={drivers:[],requests:[],reports:[],notifs:[],orgs:[],pvts:[],contacts:[]},authSubs=[];let user=null;
  const col=c=>(data[c]=data[c]||{});
  const snap=c=>Object.entries(col(c)).map(([id,v])=>({id,...v}));
  const save=()=>{lsSet(KEY,data);for(const c in subs)subs[c].forEach(cb=>cb(snap(c)));};
  return {
    add:async(c,v)=>{const id=Math.random().toString(36).slice(2,10);col(c)[id]=v;save();return id;},
    set:async(c,id,v)=>{col(c)[id]=v;save();},
    update:async(c,id,v)=>{Object.assign(data[c][id],v);save();},
    claim:async(id,check,patch)=>{const r=data.requests[id];if(!r||!check(r))throw new Error('taken');Object.assign(r,patch(r));save();},
    findDriverByPhone:async p=>{const e=Object.entries(data.drivers).find(([,d])=>cleanPhone(d.phone)===cleanPhone(p));return e?{id:e[0],...e[1]}:null;},
    listen:(c,cb)=>{(subs[c]=subs[c]||[]).push(cb);cb(snap(c));return()=>{subs[c]=subs[c].filter(x=>x!==cb);};},
    watch:(c,id,cb)=>{const f=()=>cb(col(c)[id]?{id,...data[c][id]}:null);subs[c].push(f);f();return()=>{subs[c]=subs[c].filter(x=>x!==f);};},
    uploadDoc:async(driverId,key,file)=>({name:file.name,size:file.size,type:file.type.startsWith('image/')?'image/jpeg':file.type,url:await shrinkFile(file)}),
    reset:()=>{data=seed();save();},
    login:async()=>{user={email:'demo'};authSubs.forEach(f=>f(user));},
    logout:async()=>{user=null;authSubs.forEach(f=>f(null));},
    onAuth:f=>{authSubs.push(f);f(user);}
  };
}
async function firebaseApi(){
  const base='https://www.gstatic.com/firebasejs/10.12.2/';
  const [{initializeApp},fs,au,st]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-firestore.js'),import(base+'firebase-auth.js'),import(base+'firebase-storage.js')]);
  const app=initializeApp(firebaseConfig),db=fs.getFirestore(app),auth=au.getAuth(app),storage=st.getStorage(app);
  return {
    add:async(c,v)=>(await fs.addDoc(fs.collection(db,c),v)).id,
    set:(c,id,v)=>fs.setDoc(fs.doc(db,c,id),v),
    update:(c,id,v)=>fs.updateDoc(fs.doc(db,c,id),v),
    claim:(id,check,patch)=>fs.runTransaction(db,async tx=>{const ref=fs.doc(db,'requests',id);const s=await tx.get(ref);if(!s.exists()||!check(s.data()))throw new Error('taken');tx.update(ref,patch(s.data()));}),
    findDriverByPhone:async p=>{const q=fs.query(fs.collection(db,'drivers'),fs.where('phone','==',cleanPhone(p)),fs.limit(1));const s=await fs.getDocs(q);return s.empty?null:{id:s.docs[0].id,...s.docs[0].data()};},
    listen:(c,cb,onErr)=>{const q=(c==='requests'&&!auth.currentUser)?fs.query(fs.collection(db,c),fs.where('status','in',['open','taken'])):fs.collection(db,c);
      return fs.onSnapshot(q,s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))),onErr);},
    watch:(c,id,cb)=>fs.onSnapshot(fs.doc(db,c,id),s=>cb(s.exists()?{id:s.id,...s.data()}:null),e=>console.error(e)),
    uploadDoc:async(driverId,key,file)=>{const r=st.ref(storage,`drivers/${driverId}/${key}-${Date.now()}`);await st.uploadBytes(r,file,{contentType:file.type});return {name:file.name,size:file.size,type:file.type,url:await st.getDownloadURL(r)};},
    reset:()=>{},
    login:(e,p)=>au.signInWithEmailAndPassword(auth,e,p),
    logout:()=>au.signOut(auth),
    onAuth:f=>au.onAuthStateChanged(auth,f)
  };
}
let api;

/* ===== מצב משותף ===== */
let contacts=[],pvts=[],orgs=[],requests=[],drivers=[],reqUnsub=null,reports=[],notifs=[],allDrivers=[],extraUnsub=null;
function ensureRequests(){
  if(!extraUnsub&&api){extraUnsub=[api.listen('contacts',l=>{contacts=l;renderAdmin();},()=>{}),api.listen('pvts',l=>{pvts=l;renderAdmin();},()=>{}),api.listen('orgs',l=>{orgs=l;renderAdmin();try{renderAccount();}catch(e){}renderBoard&&renderBoard();},()=>{}),api.listen('reports',l=>{reports=l;renderAdmin();},()=>{}),api.listen('notifs',l=>{notifs=l;renderBell();},()=>{}),api.listen('drivers',l=>{allDrivers=l;renderReqMine();},()=>{})];}
  if(reqUnsub) return;
  reqUnsub=api.listen('requests',l=>{requests=l;renderBell();renderBoard();if(location.hash==='#community')renderCommunity();if(me&&driverTab==='rewards')renderRewards();renderReqMine();renderAdmin();},x=>{console.error(x);toast('בעיה בטעינת הנסיעות');});
}

/* ===== ניווט ===== */
const VIEWS=['home','need','drive','community','admin','terms','about'];
function route(){
  if((location.hash.slice(1)||'home')==='community')setTimeout(()=>openCommunity(),0);
  const v=location.hash.slice(1)||'home',view=VIEWS.includes(v)?v:'home';
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id==='v-'+view));
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('on',a.dataset.nav===view));
  window.scrollTo(0,0);
}
function setTabs(group,tab,panes){
  document.querySelectorAll(`[data-act=${group}]`).forEach(t=>t.classList.toggle('on',t.dataset.tab===tab));
  for(const [k,sel] of Object.entries(panes)) $(sel).hidden=k!==tab;
}

/* ===== פרסום נסיעה ===== */
function syncNeedForm(){
  const f=$('#needForm'),kind=f.kind.value,sched=f.schedule.value;
  f.querySelectorAll('[data-org]').forEach(el=>el.hidden=kind!=='org');
  f.querySelectorAll('[data-private]').forEach(el=>el.hidden=kind!=='private'||adminAdding);
  f.querySelectorAll('[data-once]').forEach(el=>el.hidden=sched!=='once');
  f.querySelectorAll('[data-weekly]').forEach(el=>el.hidden=sched!=='weekly');
  const needs=[...f.querySelectorAll('input[name=needs]:checked')].map(x=>x.value);
  $('#cogPanel').hidden=!NEEDS.some(n=>n.cog&&needs.includes(n.k));
  $('#retWrap').hidden=!needs.includes('returnTrip');
}
function needDefaults(){$('#nDate').value=addDays(1);$('#nDate').min=todayStr();$('#nUntil').min=todayStr();syncNeedForm();}
async function submitNeed(e){
  e.preventDefault();
  const f=e.target,fd=new FormData(f),err=$('#needErr');err.textContent='';
  const s=k=>String(fd.get(k)||'').trim();
  const r={kind:s('kind'),orgName:s('orgName'),contactName:s('contactName'),phone:cleanPhone(s('phone')),
    fromCity:s('fromCity'),fromPlace:s('fromPlace'),toCity:s('toCity'),toPlace:s('toPlace'),
    schedule:s('schedule'),date:s('date'),days:fd.getAll('days'),until:s('until'),time:s('time'),
    passengers:Math.max(1,parseInt(fd.get('passengers'),10)||1),
    needs:fd.getAll('needs'),access:s('kind')==='org'?(s('access')||'all'):'all',
    notes:s('notes'),status:'open',driverId:null,covers:{},createdAt:Date.now()};
  const retTime=s('returnTime');
  if(r.kind==='org'&&!r.orgName) return err.textContent='נא למלא את שם העמותה.';
  if(!r.contactName) return err.textContent='נא למלא שם איש קשר.';
  if(!validPhone(r.phone)) return err.textContent='מספר הטלפון לא תקין.';
  if(!r.fromCity||!r.toCity) return err.textContent='נא למלא עיר מוצא ועיר יעד.';
  if(!r.time) return err.textContent='נא לבחור שעת איסוף.';
  if(r.needs.includes('returnTrip')&&!retTime) return err.textContent='נא לבחור שעת איסוף לחזור.';
  if(r.needs.includes('returnTrip')&&retTime<=r.time) return err.textContent='שעת החזור צריכה להיות אחרי שעת האיסוף.';
  let pv=null;
  if(r.kind==='private'&&!adminAdding){
    const known=pvts.find(x=>x.id===cleanPhone(r.phone));
    if(known?.status==='blocked')return err.textContent='לא ניתן לפרסם נסיעות מהמספר הזה. לבירור: פנו לצוות נוסעים ביחד.';
    if(!known||known.status!=='approved'){
      const tz=s('tz').replace(/\D/g,'');
      if(!validTz(tz))return err.textContent='מספר תעודת הזהות לא תקין (9 ספרות כולל ספרת ביקורת).';
      if(!s('elig'))return err.textContent='נא לבחור למה צריך הסעה.';
      if(fd.get('decl')!=='1')return err.textContent='נא לאשר את ההצהרה.';
      pv={tzLast4:tz.slice(-4),elig:s('elig'),refName:s('refName'),refPhone:s('refPhone')};
    }
    const lim=(known?.refName||s('refName'))?12:6,used=monthlyRides(r.phone),add=r.schedule==='weekly'?4*(r.days.length||1):1;
    if(used+add>lim)return err.textContent=`הגעת למכסה של ${lim} נסיעות בחודש למבקש/ת פרטי/ת (${used} כבר בחודש הזה). לנסיעות נוספות: דרך גורם מפנה או עמותה, או פנייה לצוות.`;
  }
  if(fd.get('terms')!=='1'&&!adminAdding) return err.textContent='נא לאשר את תנאי השימוש וההסכמה של הנוסע/ת.';
  if(r.schedule==='once'){if(!r.date)return err.textContent='נא לבחור תאריך.';if(r.date<todayStr())return err.textContent='התאריך כבר עבר.';r.days=[];r.until='';
    const nxt=new Date(r.date+'T12:00');nxt.setDate(nxt.getDate()+1);
    if(isRestDay(r.date))return err.textContent=`🕯️ המערכת לא פעילה ב${restName(r.date)}. אי אפשר לפרסם נסיעה ליום הזה.`;
    if(isRestDay(isoOf(nxt))){const last=fridayLastPickup(r.date);if(r.time>hhmm(last))return err.textContent=`🕯️ בערב שבת או חג אפשר לקבוע איסוף עד ${hhmm(last)}, כדי שהנהג/ת יספיק/תספיק לחזור.`;}}
  else{if(!r.days.length)return err.textContent='נא לבחור לפחות יום אחד בשבוע.';r.date='';
    if(r.days.includes('6'))return err.textContent='🕯️ המערכת שומרת שבת.';
    if(r.days.includes('5')){const nf=new Date();nf.setDate(nf.getDate()+((5-nf.getDay()+7)%7));const last=fridayLastPickup(localDateStr(nf));if(r.time>hhmm(last))return err.textContent=`🕯️ ביום שישי אפשר לקבוע איסוף עד ${hhmm(last)} בערך (משתנה לפי עונה).`;}}
  if(isCog(r)){const cTo=s('cogTo');if(!cTo)return err.textContent='בפגיעה קוגניטיבית חשוב לכתוב מי מקבל/ת את הנוסע/ת ביעד.';
    r.cog={alone:s('cogAlone')||'no',from:s('cogFrom'),to:cTo,comm:s('cogComm'),calm:s('cogCalm')};}
  const btn=f.querySelector('[type=submit]');btn.disabled=true;
  try{
    if(retTime)r.returnTime=retTime;
    if(r.kind==='private'&&!adminAdding){
      const pid=cleanPhone(r.phone),known=pvts.find(x=>x.id===pid);
      if(!known||known.status!=='approved'){r.privPending=true;
        if(!known){await api.set('pvts',pid,{name:r.contactName,phone:r.phone,...pv,status:'pending',at:Date.now()});notify('admin',`🪪 מבקש/ת פרטי/ת חדש/ה לאימות: ${r.contactName}`,'#admin');}}
    }
    const mainId=await api.add('requests',r);
    if(retTime){
      const back={...r,fromCity:r.toCity,fromPlace:r.toPlace,toCity:r.fromCity,toPlace:r.fromPlace,time:retTime,needs:r.needs.filter(x=>x!=='returnTrip'),linkedTo:mainId,isReturn:true,covers:{},createdAt:Date.now()};
      delete back.returnTime;
      const backId=await api.add('requests',back);await api.update('requests',mainId,{returnId:backId});
    }
    notifyNewRide(r);
    f.reset();needDefaults();
    if(adminAdding){adminAdding=false;$('#adminAddNote').hidden=true;toast('הנסיעה נוספה ✅');location.hash='#admin';btn.disabled=false;return;}
    reqPhone=r.phone;lsSet(REQ_KEY,reqPhone);
    toast('הנסיעה פורסמה ✅ כאן תראו מי לוקח אותה');
    setTabs('ntab','mine',{post:'#nPost',mine:'#nMine'});renderReqMine();window.scrollTo(0,0);
  }catch(x){console.error(x);err.textContent='השליחה נכשלה. נסו שוב בעוד רגע.';}
  btn.disabled=false;
}

/* ===== הנסיעות שלנו (צד המבקש) ===== */
const REQ_KEY='rides-v5-req';
let reqPhone=lsGet(REQ_KEY);
function trustLine(id){
  const d=allDrivers.find(x=>x.id===id);if(!d)return '';
  const ok=d.verification?.status==='approved';
  const n=(d.pastRides||0)+requests.filter(r=>r.driverId===id&&r.status==='done').length;
  return `<div class="trust">${ok?'✓ מאומת/ת ע״י נוסעים ביחד':'⏳ טרם אומת/ה'}${(d.orgApprovals||[]).length?` · אושר/ה גם ע״י: ${esc(d.orgApprovals.join(', '))}`:''} · ${n} נסיעות</div>`;
}
function driverLine(d){
  if(!d) return '';
  return `<div class="driver-box">🚗 <b>${esc(d.driverName)}</b> · <span dir="ltr">${esc(d.driverPhone)}</span>${d.cover?' <span class="tag cover">חד-פעמי</span>':''}
    ${d.driverCar?`<div class="car">${esc(d.driverCar)}</div>`:''}${trustLine(d.driverId)}</div>`;
}
/* נסיעות שהנהג סימן כבוצעו ומחכות לאישור המבקש */
function pendingConfirms(phone){
  const out=[];
  for(const r of requests){ if(cleanPhone(r.phone)!==cleanPhone(phone))continue;
    if(r.status==='done'&&r.confirmed==null&&r.driverId)out.push({r,date:r.date,name:r.driverName,driverId:r.driverId,key:''});
    for(const [dt,c] of Object.entries(r.covers||{})) if(c.done&&c.confirmed==null)out.push({r,date:dt,name:c.driverName,driverId:c.driverId,key:dt});
  }
  return out;
}
function renderReqMine(){
  try{renderAccount();}catch(e){}
  const has=!!reqPhone;
  $('#reqGate').hidden=has;$('#reqMine').hidden=!has;
  const mine=has?requests.filter(r=>cleanPhone(r.phone)===cleanPhone(reqPhone)&&r.status!=='cancelled'&&!isExpired(r)):[];
  const missing=mine.filter(r=>occDates(r,2).some(d=>!driverFor(r,d))).length;
  const cnt=$('#reqMineCnt');cnt.hidden=!missing;cnt.textContent=missing;
  if(!has) return;
  const org=mine.find(r=>r.kind==='org');
  $('#reqTitle').textContent=org?org.orgName:'הנסיעות שלנו';
  mine.sort((a,b)=>((occDates(a,1)[0]||'9')+a.time).localeCompare((occDates(b,1)[0]||'9')+b.time));
  const pc=pendingConfirms(reqPhone);
  $('#reqConfirm').innerHTML=pc.length?`<div class="confirm-box"><h3 style="margin-top:0">✅ אישור נסיעות שבוצעו</h3>${pc.map(x=>`<div class="confirm-row" data-ride="${x.r.id}" data-key="${x.key}">
      <div><b>${esc(x.r.fromCity)} ← ${esc(x.r.toCity)}</b> · ${fmtDate(x.date)||esc(x.date)} · ${esc(x.r.time)}<div class="hint">הנהג/ת ${esc(x.name)} סימן/ה שהנסיעה בוצעה. זה נכון?</div></div>
      <div class="actions" style="margin-top:6px"><button class="btn accent sm" data-act="confirmYes" data-id="${x.r.id}" data-key="${x.key}">✓ כן, בוצעה</button><button class="btn danger sm" data-act="confirmNo" data-id="${x.r.id}" data-key="${x.key}">✗ לא בוצעה</button></div></div>`).join('')}</div>`:'';
  $('#reqList').innerHTML=mine.length?mine.map(r=>{
    let body='';
    if(r.schedule==='weekly'){
      const occ=occDates(r,4);
      body=`${r.status==='taken'?`<div class="hint" style="margin-top:8px">נהג/ת קבוע/ה:</div>${driverLine(driverFor({...r,covers:{}},''))}`:'<div style="margin-top:8px"><span class="tag seek">מחפשת נהג/ת קבוע/ה</span></div>'}
        <div class="occ">${occ.map(d=>{const dr=driverFor(r,d);return dr?`<div class="got"><span>${fmtDate(d)} · ${esc(r.time)}</span><span>✓ ${esc(dr.driverName)}${dr.cover?' (חד-פעמי)':''}</span></div>`:`<div class="miss"><span>${fmtDate(d)} · ${esc(r.time)}</span><span>⚠️ עוד אין נהג/ת</span></div>`;}).join('')}</div>`;
    } else {
      body=r.status==='taken'?driverLine(driverFor(r,r.date)):(coverOf(r,r.date)?driverLine(driverFor(r,r.date)):'<div class="hint" style="margin-top:8px">⏳ מחכה לנהג/ת. נעדכן כאן ברגע שמישהו/י לוקח/ת.</div>');
    }
    const st=r.schedule==='weekly'?(r.status==='taken'?'taken':'open'):(driverFor(r,r.date)?'taken':'open');
    return `<article class="item">
      <div class="item-top"><span class="when">${whenText(r)}</span><span class="badge s-${st}">${st==='taken'?'יש נהג/ת':'מחפשת נהג'}</span></div>
      <div class="route">${esc(r.fromCity)}<span class="arrow">←</span>${esc(r.toCity)}<small>${esc(r.fromPlace)}${r.fromPlace&&r.toPlace?' ← ':''}${esc(r.toPlace)}</small></div>
      ${body}
      ${r.privPending?'<div class="pend-note">⏳ ממתין לאימות קצר של הצוות (בדרך כלל עד יום עבודה). אחרי האישור הנסיעה תופיע לנהגים.</div>':''}
      ${r.isReturn?'<div class="hint" style="margin-top:6px">↩ נסיעת חזור, מקושרת לנסיעת הלוך</div>':r.returnTime?`<div class="hint" style="margin-top:6px">↩ יש גם נסיעת חזור ב-${esc(r.returnTime)}</div>`:''}
      <div class="actions"><button class="btn ghost sm" data-act="report" data-id="${r.id}" data-by="requester">⚠️ דיווח על בעיה</button><button class="btn danger sm" data-act="reqCancel" data-id="${r.id}">ביטול הנסיעה</button></div>
    </article>`;}).join(''):'<div class="empty">אין נסיעות פעילות למספר הזה. אפשר לפרסם בלשונית "פרסום נסיעה".</div>';
}

/* ===== נהגים ===== */
const ME_KEY='rides-v5-me';
let me=lsGet(ME_KEY),meUnsub=null,vDraft=null,vDecl=false,driverTab='open',boardFilter='all';
const isVerified=()=>me?.verification?.status==='approved';
function enterBoard(){
  try{renderAccount();}catch(e){}
  $('#driverGate').hidden=!!me;$('#board').hidden=!me;
  if(meUnsub){meUnsub();meUnsub=null;}
  if(me){
    $('#meName').textContent=me.name.split(' ')[0];vDraft=null;
    meUnsub=api.watch('drivers',me.id,d=>{
      if(!d){me=null;lsSet(ME_KEY,null);enterBoard();return;}
      const vChanged=JSON.stringify(d.verification)!==JSON.stringify(me.verification);
      me=d;lsSet(ME_KEY,{id:me.id,name:me.name,phone:me.phone});
      if(vChanged||!vDraft)renderVerify();renderBoard();if(driverTab==='rewards')renderRewards();
    });
    renderProfile();
  }
  ensureRequests();renderBoard();
}
async function submitReg(e){
  e.preventDefault();
  const f=e.target,fd=new FormData(f),err=$('#regErr');err.textContent='';
  const d={name:String(fd.get('name')||'').trim(),phone:cleanPhone(fd.get('phone')),type:fd.get('type'),area:String(fd.get('area')||'').trim(),accessible:false,active:true,createdAt:Date.now(),verification:{status:'none'},languages:['עברית'],experience:[]};
  if(!d.name||!d.area) return err.textContent='נא למלא שם ואזור.';
  if(!validPhone(d.phone)) return err.textContent='מספר הטלפון לא תקין.';
  if(fd.get('terms')!=='1') return err.textContent='נא לאשר את תנאי השימוש וקוד ההתנהגות.';
  const btn=f.querySelector('[type=submit]');btn.disabled=true;
  try{const exist=await api.findDriverByPhone(d.phone);const id=exist?exist.id:await api.add('drivers',d);
    me={id,...(exist||d)};enterBoard();toast(exist?'ברוך שובך! כבר היית רשום/ה':'נרשמת! עכשיו האימות 💛');}
  catch(x){console.error(x);err.textContent='ההרשמה נכשלה. נסו שוב.';}
  btn.disabled=false;
}
async function submitBack(e){
  e.preventDefault();const err=$('#backErr');err.textContent='';
  const p=cleanPhone($('#backPhone').value);if(!validPhone(p))return err.textContent='מספר לא תקין.';
  try{const d=await api.findDriverByPhone(p);if(!d)return err.textContent='לא מצאנו את המספר. אפשר להירשם למעלה.';
    if(d.active===false)return err.textContent='החשבון מושהה. פנו למנהלים.';me=d;enterBoard();}
  catch(x){console.error(x);err.textContent='משהו השתבש. נסו שוב.';}
}

/* --- אימות --- */
function renderVerify(){
  const box=$('#verifyBox');if(!me){box.innerHTML='';return;}
  const v=me.verification||{status:'none'};
  if(v.status==='approved'){box.innerHTML=`<div class="verify ok"><b>✅ מאומת/ת.</b> אפשר לקחת נסיעות. תודה!${!me.carModel?` <a href="#drive" data-act="dtab" data-tab="profile">הוספת פרטי רכב</a> תעזור למי שמחכה לך לזהות אותך.`:''}</div>`;return;}
  if(v.status==='pending'){box.innerHTML=`<div class="verify"><h2>⏳ צוות נוסעים ביחד בודק את המסמכים</h2><div class="hint">בדרך כלל עד 48 שעות. בינתיים אפשר להסתכל על הלוח ולמלא את הפרופיל.</div></div>`;return;}
  if(!vDraft){vDraft=JSON.parse(JSON.stringify(v.docs||{}));vDecl=false;}
  box.innerHTML=`<div class="verify ${v.status==='rejected'?'bad':''}">
    <h2>${v.status==='rejected'?'❗ האימות לא אושר':'🔐 אימות נהג/ת: שלב אחרון לפני הנסיעה הראשונה'}</h2>
    <div class="hint">${v.status==='rejected'&&v.note?`הסיבה: <b>${esc(v.note)}</b>. אפשר לתקן ולשלוח שוב.`:'כדי לשמור על הנוסעים, ובהם אנשים עם מוגבלות וקשישים, כל נהג/ת עובר/ת אימות. המסמכים נראים רק למנהלי המערכת.'}</div>
    <div class="docs">${Object.entries(DOCS).map(([k,d])=>{const x=vDraft[k]||{};return `<div class="doc">
      <div class="doc-head"><b>${d.title}</b>${x.url||x.name?`<span class="file-ok">✓ הועלה: ${esc(x.name)}</span>`:`<span class="hint">${d.hint}</span>`}</div>
      <div class="doc-row">
        <div class="field"><span class="lbl">קובץ (תמונה או PDF)</span><label class="btn ghost sm filebtn">📎 בחירת קובץ<input type="file" accept="image/*,application/pdf" data-doc="${k}"></label></div>
        <div class="field"><label class="lbl">${d.dateLabel}</label><input type="date" data-docdate="${k}" value="${esc(x[d.dateKey]||'')}"></div>
      </div></div>`;}).join('')}</div>
    <div class="checks" style="margin-top:14px"><label style="border-radius:12px;align-items:flex-start"><input type="checkbox" id="vDecl" ${vDecl?'checked':''} style="margin-top:5px">
      <span>אני מצהיר/ה שהפרטים והמסמכים נכונים, שאשמור על פרטיות וכבוד הנוסעים, ושאודיע אם משהו מהם משתנה.</span></label></div>
    <p class="err" id="vErr"></p>
    <div class="actions" style="margin-top:6px"><button class="btn brand" data-act="submitVerify">שליחה לאימות</button></div>
  </div>`;
}
async function onDocFile(input){
  const k=input.dataset.doc,f=input.files[0];if(!f)return;
  if(f.size>8e6){toast('הקובץ גדול מדי (עד 8MB)');input.value='';return;}
  const head=input.closest('.doc').querySelector('.doc-head span');head.className='hint';head.textContent='מעלה…';
  try{const up=await api.uploadDoc(me.id,k,f);vDraft[k]={...(vDraft[k]||{}),...up};head.className='file-ok';head.textContent='✓ הועלה: '+f.name;}
  catch(x){console.error(x);head.className='err';head.textContent='ההעלאה נכשלה, נסו שוב';}
}
async function submitVerify(){
  const err=$('#vErr');err.textContent='';
  for(const [k,d] of Object.entries(DOCS)){
    const x=vDraft[k];if(!x||!(x.url||x.name))return err.textContent=`חסר: ${d.title}`;
    if(!x[d.dateKey])return err.textContent=`חסר ${d.dateLabel} ב${d.title}`;
    if(d.dateKey==='expiry'&&x.expiry<todayStr())return err.textContent=`${d.title}: פג תוקף`;
    if(d.dateKey==='issued'&&x.issued>todayStr())return err.textContent=`${d.title}: תאריך ההנפקה בעתיד`;
  }
  if(!$('#vDecl').checked)return err.textContent='נא לאשר את ההצהרה.';
  await api.update('drivers',me.id,{verification:{status:'pending',docs:vDraft,declaration:true,submittedAt:Date.now(),note:''}});
  toast('נשלח לאימות. תודה! 💛');
}

/* --- פרופיל --- */
function chipChecks(name,opts,sel){return `<div class="checks">${opts.map(o=>`<label><input type="checkbox" name="${name}" value="${esc(o)}" ${(sel||[]).includes(o)?'checked':''}>${esc(o)}</label>`).join('')}</div>`;}
function renderProfile(){
  if(!me)return;const d=me;
  $('#profileForm').innerHTML=`
    <div class="sec"><h3 style="margin-top:0">🚗 הרכב</h3><p class="hint" style="margin-top:-4px">מוצג למי שמחכה לך, כדי שיזהו את הרכב.</p>
      <div class="profile-grid">
        <div class="field"><label class="lbl" for="pModel">יצרן ודגם</label><input id="pModel" name="carModel" type="text" maxlength="40" value="${esc(d.carModel)}" placeholder="למשל: טויוטה קורולה"></div>
        <div class="field"><label class="lbl" for="pColor">צבע</label><input id="pColor" name="carColor" type="text" maxlength="20" value="${esc(d.carColor)}"></div>
        <div class="field"><label class="lbl" for="pPlate">מספר רישוי</label><input id="pPlate" name="plate" type="text" maxlength="12" value="${esc(d.plate)}" dir="ltr"></div>
      </div>
      <div class="checks" style="margin-top:12px">
        <label><input type="checkbox" name="trunk" value="1" ${d.trunk?'checked':''}>יש מקום לכיסא גלגלים מתקפל / הליכון</label>
        <label><input type="checkbox" name="accessible" value="1" ${d.accessible?'checked':''}>♿ רכב נגיש (רמפה / מעלון)</label>
      </div></div>
    <div class="sec"><h3>🗣️ שפות שאני מדבר/ת</h3>${chipChecks('languages',LANGS,d.languages)}</div>
    <div class="sec"><h3>🤝 ניסיון עם</h3><p class="hint" style="margin-top:-4px">לא חובה. עוזר להתאים לך נסיעות שתרגיש/י בהן בנוח.</p>${chipChecks('experience',EXP,d.experience)}
      <div class="checks" style="margin-top:8px"><label><input type="checkbox" name="firstAid" value="1" ${d.firstAid?'checked':''}>⛑️ עברתי קורס עזרה ראשונה</label></div></div>
    <div class="sec"><h3>🗓️ מתי נוח לי לנסוע</h3><p class="hint" style="margin-top:-4px">לא חובה. ככה נשלח לך התראות רק על נסיעות שמתאימות לך.</p>
      <div class="checks">${DAYS.slice(0,6).map((x,i)=>`<label><input type="checkbox" name="avDays" value="${i}" ${(d.avDays||[]).includes(String(i))?'checked':''}>${x}׳</label>`).join('')}</div>
      <div class="checks" style="margin-top:8px">${Object.entries(SLOTS).map(([k,v])=>`<label><input type="checkbox" name="avSlots" value="${k}" ${(d.avSlots||[]).includes(k)?'checked':''}>${v.t}</label>`).join('')}</div></div>
    <div class="sec"><h3>🌟 קהילה</h3><div class="checks"><label><input type="checkbox" name="showInCommunity" value="1" ${d.showInCommunity!==false?'checked':''}>אפשר להציג אותי בעמוד הקהילה (שם פרטי ועיר בלבד)</label></div></div>
    <div class="sec"><h3>📍 אזור</h3><div class="field"><input name="area" type="text" maxlength="80" value="${esc(d.area)}"></div></div>
    <div class="sec"><h3>🆘 איש/אשת קשר לחירום</h3><p class="hint" style="margin-top:-4px">נראה רק למנהלי המערכת.</p>
      <div class="profile-grid">
        <div class="field"><label class="lbl" for="pEmName">שם</label><input id="pEmName" name="emergencyName" type="text" maxlength="60" value="${esc(d.emergencyName)}"></div>
        <div class="field"><label class="lbl" for="pEmPhone">טלפון</label><input id="pEmPhone" name="emergencyPhone" type="tel" value="${esc(d.emergencyPhone)}"></div>
      </div></div>
    <p class="err" id="profErr"></p>
    <div class="actions"><button class="btn brand" type="submit">שמירה</button></div>`;
}
async function submitProfile(e){
  e.preventDefault();const fd=new FormData(e.target),s=k=>String(fd.get(k)||'').trim();
  const p={carModel:s('carModel'),carColor:s('carColor'),plate:s('plate'),trunk:fd.get('trunk')==='1',accessible:fd.get('accessible')==='1',
    languages:fd.getAll('languages'),experience:fd.getAll('experience'),firstAid:fd.get('firstAid')==='1',avDays:fd.getAll('avDays'),avSlots:fd.getAll('avSlots'),showInCommunity:fd.get('showInCommunity')==='1',area:s('area')||me.area,
    emergencyName:s('emergencyName'),emergencyPhone:s('emergencyPhone')};
  if(p.emergencyPhone&&!validPhone(p.emergencyPhone))return $('#profErr').textContent='טלפון החירום לא תקין.';
  try{await api.update('drivers',me.id,p);Object.assign(me,p);toast('הפרופיל נשמר ✓');renderVerify();renderBoard();}
  catch(x){console.error(x);toast('השמירה נכשלה');}
}

/* --- לוח --- */
function boardItems(){ return requests.filter(r=>!isExpired(r)&&!r.privPending&&nextOpenOcc(r)); }
function myItems(){
  const out=[];const t=todayStr();
  for(const r of requests){
    if(r.status==='taken'&&r.driverId===me.id) out.push({r,kind:r.schedule==='weekly'?'series':'once',date:occDates(r,1)[0]||r.date});
    for(const [date,c] of Object.entries(r.covers||{})) if(c.driverId===me.id&&date>=t&&!c.done&&r.status!=='cancelled') out.push({r,kind:'cover',date});
  }
  return out.sort((a,b)=>((a.date||'9')+a.r.time).localeCompare((b.date||'9')+b.r.time));
}
function needsTags(r){
  return [r.schedule==='weekly'?'<span class="tag weekly">🔁 קבוע</span>':'',r.kind==='org'?`<span class="tag org">${esc(r.orgName)}${orgVerified(r.orgName)?' ✓':''}</span>`:'<span class="tag">אדם פרטי</span>',
    ...NEEDS.filter(n=>hasNeed(r,n.k)).map(n=>`<span class="tag ${n.hot?'need':''}">${n.i} ${n.t}</span>`),
    `<span class="tag">${r.passengers||1} נוסעים</span>`].join('');
}
function cogNotice(r,full){
  if(!isCog(r))return '';
  if(!full){
    const exp=(me?.experience||[]).some(x=>COG_EXP.includes(x));
    return `<div class="cog-note">🧠 <b>נוסע/ת עם פגיעה קוגניטיבית.</b> נדרשת מסירה אישית ביעד. ההנחיות המלאות יוצגו אחרי שלוקחים את הנסיעה.${exp?'':'<br><span class="hint">מומלץ לנהגים עם ניסיון. אפשר לסמן ניסיון בפרופיל.</span>'}</div>`;
  }
  const c=r.cog||{};
  return `<div class="cog-note full"><b>🧠 הנחיות לנסיעה</b>
    <div>${c.alone==='yes'?'✓ יכול/ה להישאר לבד ברכב לרגע':'⚠️ <b>לא להשאיר לבד ברכב</b>, גם לא לרגע'}</div>
    ${c.from?`<div>📍 מוסר/ת באיסוף: <b>${esc(c.from)}</b></div>`:''}
    <div>🤝 מקבל/ת ביעד: <b>${esc(c.to||'לתאם מול איש הקשר')}</b>. לא לעזוב לפני מסירה אישית.</div>
    ${c.comm?`<div>💬 תקשורת: ${esc(c.comm)}</div>`:''}
    ${c.calm?`<div>🌿 ${esc(c.calm)}</div>`:''}</div>`;
}
function routeHtml(r){return `<div class="route">${esc(r.fromCity)}<span class="arrow">←</span>${esc(r.toCity)}<small>${esc(r.fromPlace)}${r.fromPlace&&r.toPlace?' ← ':''}${esc(r.toPlace)}</small></div>`;}
function openCard(r){
  const nd=nextOpenOcc(r),wk=r.schedule==='weekly';
  const covered=wk?occDates(r,4).filter(d=>coverOf(r,d)).length:0;
  const warn=hasNeed(r,'wheelchair')&&!me.accessible?'<span class="hint">⚠️ דרוש רכב נגיש. הרכב שלך לא מסומן ככזה.</span>':'';
  let btns;
  const locked=r.kind==='org'&&r.access==='approved'&&!(me.orgApprovals||[]).includes(r.orgName);
  const asked=(me.orgRequests||[]).includes(r.orgName);
  if(!isVerified()) btns=`<button class="btn ghost" disabled>🔒 אפשר לקחת אחרי אימות</button>`;
  else if(locked) btns=`<button class="btn ghost" disabled>🔐 רק לנהגים ש${esc(r.orgName)} אישרה</button>${asked?'<span class="hint">✓ הבקשה נשלחה לעמותה</span>':`<button class="btn alt" data-act="askOrg" data-org="${esc(r.orgName)}">בקשת אישור מהעמותה</button>`}`;
  else if(wk) btns=`<button class="btn brand" data-act="claimOnce" data-id="${r.id}" data-date="${nd}">רק ב${fmtDate(nd)}</button><button class="btn alt" data-act="claimSeries" data-id="${r.id}">כל שבוע, באופן קבוע</button>`;
  else btns=`<button class="btn brand" data-act="claimSeries" data-id="${r.id}">אני לוקח/ת</button>`;
  return `<article class="item">
    <div class="item-top"><span class="when">${wk?`${fmtDate(nd)} · ${esc(r.time)}`:whenText(r)}</span>${wk?`<span class="hint">${whenText(r)}</span>`:''}</div>
    ${routeHtml(r)}
    <div class="meta" style="gap:6px">${needsTags(r)}${r.access==='approved'&&r.kind==='org'?'<span class="tag">🔐 נהגים מאושרי עמותה</span>':''}${r.isReturn?'<span class="tag">↩ חזור</span>':''}${wk?`<span class="tag seek">מחפשת נהג/ת קבוע/ה${covered?` · ${covered} שבועות קרובים מכוסים`:''}</span>`:''}</div>
    ${r.notes?`<div class="meta" style="margin-top:8px">💬 ${esc(r.notes)}</div>`:''}
    ${cogNotice(r,false)}
    <div class="actions">${warn}${btns}</div></article>`;
}
function mineCard({r,kind,date}){
  const label=kind==='series'?`כל שבוע · הבאה: ${fmtDate(date)} · ${esc(r.time)}`:`${fmtDate(date)} · ${esc(r.time)}`;
  const msg=`שלום ${r.contactName}, כאן ${me.name}, נהג/ת מתנדב/ת מ"${APP_NAME}". לקחתי את הנסיעה מ${r.fromCity} ל${r.toCity} ${kind==='series'?'(קבועה)':'ב'+fmtDate(date)}, בשעה ${r.time}. אשמח לתאם את הפרטים.`;
  const doneBtn=kind==='series'?'':`<button class="btn accent sm" data-act="${kind==='cover'?'coverDone':'done'}" data-id="${r.id}" data-date="${date}">✓ ביצעתי</button>`;
  const relBtn=`<button class="btn danger sm" data-act="${kind==='cover'?'coverRelease':'release'}" data-id="${r.id}" data-date="${date}">${kind==='series'?'לא יכול/ה להמשיך':'לא אוכל, להחזיר ללוח'}</button>`;
  const wz=q=>`https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;
  const navBtns=`<a class="btn ghost sm" target="_blank" rel="noopener" href="${wz([r.fromPlace,r.fromCity].filter(Boolean).join(' '))}">🧭 ניווט לאיסוף</a><a class="btn ghost sm" target="_blank" rel="noopener" href="${wz([r.toPlace,r.toCity].filter(Boolean).join(' '))}">🧭 ניווט ליעד</a>`;
  return `<article class="item mine">
    <div class="item-top"><span class="when">${label}</span>${kind==='cover'?'<span class="tag cover">חד-פעמי</span>':kind==='series'?'<span class="tag weekly">🔁 קבוע שלי</span>':''}</div>
    ${routeHtml(r)}<div class="meta" style="gap:6px">${needsTags(r)}</div>
    ${r.notes?`<div class="meta" style="margin-top:8px">💬 ${esc(r.notes)}</div>`:''}
    ${cogNotice(r,true)}
    <div class="contact">📞 לתיאום: <b>${esc(r.contactName)}</b>${r.kind==='org'?` (${esc(r.orgName)})`:''} · <span class="num">${esc(r.phone)}</span>
      <div class="actions" style="margin-top:8px"><a class="btn wa sm" target="_blank" rel="noopener" href="${waLink(r.phone,msg)}">וואטסאפ</a><a class="btn ghost sm" href="tel:${esc(cleanPhone(r.phone))}">התקשרות</a></div></div>
    <div class="actions">${navBtns}</div>
    <p class="hint" style="margin:6px 0 0">בגרסה המלאה הניווט יוביל לכתובת המדויקת, שתיפתח רק לך.</p>
    <div class="actions">${doneBtn}<button class="btn ghost sm" data-act="report" data-id="${r.id}" data-by="driver" data-date="${date}">⚠️ דיווח על בעיה</button>${relBtn}</div></article>`;
}
function renderBoard(){
  if(!me)return;
  const F={all:'הכל',area:'באזור שלי',avail:'בזמנים שלי',once:'חד-פעמי',weekly:'קבוע'};
  $('#boardChips').innerHTML=Object.entries(F).map(([k,v])=>`<button class="chip ${k===boardFilter?'on':''}" data-act="bfilter" data-f="${k}">${v}</button>`).join('');
  const all=boardItems();let open=all;
  if(boardFilter==='area')open=open.filter(r=>areaMatch(me.area,r.fromCity)||areaMatch(me.area,r.toCity));
  if(boardFilter==='once'||boardFilter==='weekly')open=open.filter(r=>r.schedule===boardFilter);
  if(boardFilter==='avail')open=open.filter(r=>fitsAvail(me,nextOpenOcc(r),r.time));
  open.sort((a,b)=>(nextOpenOcc(a)+a.time).localeCompare(nextOpenOcc(b)+b.time));
  const mine=myItems();
  $('#openCnt').textContent=all.length;$('#mineCnt').textContent=mine.length;
  $('#openList').innerHTML=open.length?open.map(openCard).join(''):'<div class="empty">אין כרגע נסיעות פתוחות בסינון הזה. תודה שבדקת 💛</div>';
  $('#mineList').innerHTML=mine.length?mine.map(mineCard).join(''):'<div class="empty">עוד לא לקחת נסיעות. אפשר לבחור מהלשונית "נסיעות פתוחות".</div>';
}
const meInfo=()=>({driverId:me.id,driverName:me.name,driverPhone:me.phone,driverCar:carDesc(me)});


/* ===== הטבות (דף נראות) ===== */
const PERKS=[
  {id:'coffee',icon:'☕',partner:'רשת תחנות דלק',title:'קפה ומאפה',need:10,color:'#7a4b2a'},
  {id:'wash',icon:'🚿',partner:'רשת שטיפת רכב',title:'שטיפה חיצונית',need:25,color:'#2457a6'},
  {id:'kit',icon:'🧴',partner:'רשת תחנות דלק',title:'ערכת רכב: מים, מטהר אוויר ומגבונים',need:35,color:'#1f6f5c'},
  {id:'garage',icon:'🔧',partner:'רשת מוסכים',title:'בדיקת חורף ו-15% על טיפול',need:50,color:'#9a5b00'},
  {id:'insure',icon:'🛡️',partner:'חברת ביטוח',title:'הנחה בחידוש ביטוח הרכב',need:80,color:'#5b3fa6'}
];
function myStats(){
  const done=requests.filter(r=>r.driverId===me.id&&r.status==='done').length+requests.reduce((n,r)=>n+Object.values(r.covers||{}).filter(c=>c.driverId===me.id&&c.done).length,0);
  const weekly=requests.filter(r=>r.driverId===me.id&&r.status==='taken'&&r.schedule==='weekly').length;
  const rides=(me.pastRides||0)+done;
  return {rides,hours:(me.pastHours||0)+Math.round(done*1.3),people:(me.pastPassengers||0)+done,weekly};
}
function badgesFor(s){
  const v=me.verification?.status==='approved';
  return [
    {icon:'🔐',t:'נהג/ת מאומת/ת',on:v},
    {icon:'🚗',t:'נסיעה ראשונה',on:s.rides>=1},
    {icon:'🔟',t:'10 נסיעות',on:s.rides>=10},
    {icon:'🔁',t:'נהג/ת קבוע/ה',on:s.weekly>0},
    {icon:'♿',t:'מסיע/ה כיסאות גלגלים',on:!!(me.accessible||me.trunk)},
    {icon:'🗣️',t:'מדבר/ת כמה שפות',on:(me.languages||[]).length>1},
    {icon:'⛑️',t:'עזרה ראשונה',on:!!me.firstAid},
    {icon:'🥇',t:'50 נסיעות',on:s.rides>=50},
    {icon:'🌟',t:'נהג/ת השבוע',on:(me.fun?.orgVotes||0)>=3},
    {icon:'🏆',t:'100 נסיעות',on:s.rides>=100}
  ];
}
function renderRewards(){
  if(!me)return;const s=myStats(),red=me.redeemed||[];
  const next=PERKS.find(p=>s.rides<p.need);
  const prev=[...PERKS].reverse().find(p=>s.rides>=p.need);
  const from=prev?prev.need:0,pct=next?Math.round((s.rides-from)/(next.need-from)*100):100;
  const initials=me.name.split(' ').map(w=>w[0]).slice(0,2).join('');
  const since=me.joinedAt?new Date(me.joinedAt).toLocaleDateString('he-IL',{month:'long',year:'numeric'}):'';
  const badges=badgesFor(s);
  $('#rewardsPane').innerHTML=`
  <div class="rw-hero">
    <div class="rw-avatar">${esc(initials)}</div>
    <div><div class="rw-name">${esc(me.name)}</div>
      <div class="rw-sub">${me.type==='taxi'?'נהג/ת מונית':'אזרח/ית'} מתנדב/ת${me.verification?.status==='approved'?' · ✓ מאומת/ת':''}${since?` · מתנדב/ת מאז ${since}`:''}</div></div>
  </div>
  <div class="rw-stats">
    <div><b>${s.rides}</b><span>נסיעות</span></div>
    <div><b>${s.hours}</b><span>שעות התנדבות</span></div>
    <div><b>${s.people}</b><span>אנשים שהסעת</span></div>
  </div>
  <div class="card rw-next">
    ${next?`<div class="rw-next-top"><span>ההטבה הבאה: <b>${next.icon} ${esc(next.title)}</b></span><span class="hint">${s.rides}/${next.need}</span></div>
      <div class="rw-bar"><i style="width:${pct}%"></i></div>
      <div class="hint">עוד <b>${next.need-s.rides}</b> נסיעות. ${esc(next.partner)} מחכה לך 😊</div>`
      :'<b>🏆 פתחת את כל ההטבות! תודה ענקית.</b>'}
  </div>
  <h3>🎖️ התגים שלי</h3>
  <div class="rw-badges">${badges.map(b=>`<div class="rw-badge ${b.on?'on':''}"><span>${b.icon}</span>${esc(b.t)}</div>`).join('')}</div>
  <h3>🎁 הטבות מהשותפים</h3>
  <div class="rw-perks">${PERKS.map(p=>{const got=s.rides>=p.need,used=red.includes(p.id);
    return `<div class="rw-perk ${got?'':'locked'}" style="--c:${p.color}">
      <div class="rw-perk-ic">${p.icon}</div>
      <div class="rw-perk-body"><b>${esc(p.title)}</b><div class="hint">${esc(p.partner)} · שותף לדוגמה</div>
        <div class="hint">אחרי ${p.need} נסיעות <span class="rw-set">(נקבע ע״י השותף)</span></div></div>
      <div>${used?'<span class="tag">✓ מומש</span>':got?`<button class="btn brand sm" data-act="redeem" data-p="${p.id}">מימוש</button>`:`<span class="tag">🔒 עוד ${p.need-s.rides}</span>`}</div>
    </div>`;}).join('')}</div>
  ${(me.thanks||[]).length?`<h3>💌 מילים טובות</h3><div class="rw-thanks">${me.thanks.map(t=>`<div class="rw-thx"><p>"${esc(t.text)}"</p><span>${esc(t.from)} · ${esc(t.ago)}</span></div>`).join('')}</div>`:''}
  <div class="rw-cert card"><div><b>📜 אישור שעות התנדבות</b><div class="hint">אישור רשמי על ${s.hours} שעות התנדבות, לקורות חיים, ללימודים או למעסיק.</div></div><button class="btn ghost sm" data-act="certToast">הפקת אישור</button></div>
  <p class="hint" style="text-align:center;margin-top:18px">השותפים בוחרים בעצמם את ההטבה ואת מספר הנסיעות שנדרש. ההטבות ניתנות רק על נסיעות שהעמותה או הנוסע/ת אישרו.</p>`;
}
function fakeQr(seed){
  let x=0;for(const ch of seed)x=(x*31+ch.charCodeAt(0))>>>0;
  const n=21,c=8;let r='';
  const rnd=()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x%100;};
  const finder=(i,j)=>{for(const [a,b] of [[0,0],[0,n-7],[n-7,0]]){if(i>=a&&i<a+7&&j>=b&&j<b+7){const ii=i-a,jj=j-b;return ii===0||ii===6||jj===0||jj===6||(ii>1&&ii<5&&jj>1&&jj<5);}}return null;};
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const f=finder(i,j);if(f===true||(f===null&&rnd()<45))r+=`<rect x="${j*c}" y="${i*c}" width="${c}" height="${c}"/>`;}
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 ${n*c+16} ${n*c+16}" width="180" height="180"><rect x="-8" y="-8" width="${n*c+16}" height="${n*c+16}" fill="#fff"/><g fill="#1d2433">${r}</g></svg>`;
}
function openRedeem(pid){
  const p=PERKS.find(x=>x.id===pid);const code='NB-'+Math.random().toString(36).slice(2,6).toUpperCase();
  $('#redeemBody').innerHTML=`<div style="font-size:40px">${p.icon}</div><h2 style="margin:6px 0 2px">${esc(p.title)}</h2><div class="hint">${esc(p.partner)}</div>
    <div style="margin:16px auto;width:180px">${fakeQr(code+me.id)}</div>
    <div style="font-size:22px;font-weight:800;letter-spacing:2px" dir="ltr">${code}</div>
    <p class="hint">מציגים בקופה. קוד לדוגמה, לא תקף.</p>
    <div class="actions" style="justify-content:center"><button class="btn brand" data-act="doRedeem" data-p="${p.id}">סימון כמומש</button><button class="btn ghost" data-act="closeRedeem">סגירה</button></div>`;
  $('#redeemBg').classList.add('open');
}
const closeRedeem=()=>$('#redeemBg').classList.remove('open');


/* ===== קהילה ===== */
let commDrivers=[],commUnsub=null;
function openCommunity(){
  if(!api)return;
  if(!commUnsub)commUnsub=api.listen('drivers',l=>{commDrivers=l;renderCommunity();},()=>{});
  ensureRequests();renderCommunity();
}
const CATS=[
  {k:'orgVotes',i:'💛',t:'בחירת העמותות',why:d=>`${d.fun.orgVotes} עמותות בחרו בה/בו השבוע`},
  {k:'access',i:'♿',t:'שגריר/ת נגישות',why:d=>`${d.fun.access} נסיעות עם כיסא גלגלים או ליווי מיוחד`},
  {k:'lastMinute',i:'⚡',t:'מציל/ת הרגע האחרון',why:d=>`לקח/ה ${d.fun.lastMinute} נסיעות שהיו עלולות ליפול`},
  {k:'streak',i:'🔁',t:'הכי נאמן/ה',why:d=>`${d.fun.streak} שבועות ברצף באותה נסיעה קבועה`},
  {k:'thanks',i:'🙏',t:'הכי הרבה תודות',why:d=>`${d.fun.thanks} הודעות תודה ממשפחות ועמותות`}
];
const shortName=d=>{const p=String(d.name||'').split(' ');return p[0]+(p[1]?' '+p[1][0]+'׳':'');};
const cityOf=d=>String(d.area||'').split(',')[0].trim();
function renderCommunity(){
  const el=$('#communityBody');if(!el)return;
  const pool=commDrivers.filter(d=>d.active!==false&&d.verification?.status==='approved'&&d.showInCommunity!==false&&d.fun);
  const used=new Set();
  const winners=CATS.map(c=>{const w=[...pool].sort((a,b)=>(b.fun[c.k]||0)-(a.fun[c.k]||0)).find(d=>!used.has(d.id)&&(d.fun[c.k]||0)>0);if(w)used.add(w.id);return w?{c,w}:null;}).filter(Boolean);
  const newest=[...pool].sort((a,b)=>(b.joinedAt||b.createdAt||0)-(a.joinedAt||a.createdAt||0))[0];
  const doneCnt=requests.filter(r=>r.status==='done').length+requests.reduce((n,r)=>n+Object.values(r.covers||{}).filter(c=>c.done).length,0);
  const totalRides=pool.reduce((n,d)=>n+(d.pastRides||0),0)+doneCnt;
  const orgs=new Set(requests.filter(r=>r.kind==='org').map(r=>r.orgName)).size;
  const star=winners[0];
  el.innerHTML=`
  <h1>הקהילה שלנו</h1>
  <p class="lead">האנשים שמניעים את זה. כל שבוע אנחנו חוגגים נהגים מסיבות שונות, לא רק מי שנסע הכי הרבה.</p>
  <div class="cm-stats">
    <button data-act="cmRides"><b>${totalRides}</b><span>נסיעות עד היום ←</span></button>
    <button data-act="cmDrivers"><b>${pool.length}</b><span>נהגים מאומתים ←</span></button>
    <button data-act="cmOrgs"><b>${orgs}</b><span>עמותות פעילות ←</span></button>
  </div>
  ${star?`<div class="cm-hero" role="button" tabindex="0" data-act="cmDriver" data-id="${star.w.id}"><div class="cm-hero-badge">🌟 נהג/ת השבוע</div>
    <div class="cm-hero-row"><div class="rw-avatar">${esc(star.w.name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</div>
    <div><div class="rw-name">${esc(shortName(star.w))}</div><div class="rw-sub">${esc(cityOf(star.w))} · ${star.w.type==='taxi'?'נהג/ת מונית':'מתנדב/ת עם רכב פרטי'}</div></div></div>
    <p class="cm-quote">״${esc((star.w.thanks||[])[0]?.text||'תודה שאת/ה שם בשבילנו כל שבוע.')}״</p>
    <div class="cm-why">${star.c.i} ${esc(star.c.t)}: ${esc(star.c.why(star.w))}</div>
    <div class="cm-more">לפרופיל ולשליחת תודה ←</div></div>`:''}
  <h3>🏅 המצטיינים השבוע, כל אחד מסיבה אחרת</h3>
  <div class="cm-cats">${winners.slice(1).map(({c,w})=>`<div class="cm-cat" role="button" tabindex="0" data-act="cmDriver" data-id="${w.id}"><div class="cm-cat-i">${c.i}</div><div><b>${esc(c.t)}</b><div class="cm-cat-n">${esc(shortName(w))} · ${esc(cityOf(w))}</div><div class="hint">${esc(c.why(w))}</div></div></div>`).join('')}
    ${newest?`<div class="cm-cat" role="button" tabindex="0" data-act="cmDriver" data-id="${newest.id}"><div class="cm-cat-i">🌱</div><div><b>הצטרפות השבוע</b><div class="cm-cat-n">${esc(shortName(newest))} · ${esc(cityOf(newest))}</div><div class="hint">ברוכים הבאים! כבר ${newest.pastRides||0} נסיעות ראשונות</div></div></div>`:''}</div>
  <h3>👋 הכירו את</h3>
  <div class="cm-spot">
    <div class="cm-spot-card" role="button" tabindex="0" data-act="cmOrg" data-org="עמותת בית חם"><div class="cm-spot-tag">עמותה</div><b>עמותת בית חם</b>
      <p>מפעילה דירות בקהילה לאנשים עם מוגבלות שכלית. בזכות נהגים מתנדבים, הדיירים מגיעים כל שבוע לבתי ההורים ולטיפולים.</p></div>
    <div class="cm-spot-card" role="button" tabindex="0" data-act="cmDriver" data-id="d2"><div class="cm-spot-tag">נהג</div><b>${esc(shortName(commDrivers.find(d=>d.id==='d2')||{name:'אבי פ'}))}, נהג מונית</b>
      <p>״התחלתי בנסיעה אחת ביום שקט. היום יש לי שלוש נסיעות קבועות, ואני מכיר את הנוסעים בשמם.״</p></div>
  </div>
  <h3>📰 מה חדש</h3>
  <div class="cm-news">
    <a href="#drive"><span class="cm-date">השבוע</span>עמותה חדשה הצטרפה ופרסמה 4 נסיעות קבועות ראשונות. ←</a>
    <a href="#drive"><span class="cm-date">השבוע</span>נוספה אפשרות לכסות שבוע אחד בנסיעה קבועה, עד שנמצא נהג קבוע. ←</a>
    <button data-act="goRewards"><span class="cm-date">החודש</span>שותף ראשון להטבות: קפה ומאפה לנהגים אחרי 10 נסיעות (לדוגמה). ←</button>
  </div>
  <div class="cm-join"><b>רוצים להיות חלק?</b><div class="actions" style="justify-content:center"><a class="btn brand" href="#drive">🚗 הרשמה כנהג/ת</a><a class="btn ghost" href="#need">🙋 פרסום נסיעה</a></div></div>
  <p class="hint" style="text-align:center;margin-top:18px">נהגים מופיעים כאן רק בהסכמתם, עם שם פרטי ועיר בלבד. בגרסת ההדגמה התוכן לדוגמה.</p>`;
}


/* ===== קהילה: חלונות ===== */
const commPool=()=>commDrivers.filter(d=>d.active!==false&&d.verification?.status==='approved'&&d.showInCommunity!==false);
const ridesOfDriver=d=>(d.pastRides||0)+requests.filter(r=>r.driverId===d.id&&r.status==='done').length+requests.reduce((n,r)=>n+Object.values(r.covers||{}).filter(c=>c.driverId===d.id&&c.done).length,0);
const initials=d=>esc(String(d.name||'').split(' ').map(x=>x[0]).slice(0,2).join(''));
function cmDriverDlg(id){
  const d=commDrivers.find(x=>x.id===id);if(!d)return;
  const wins=CATS.filter(c=>(d.fun?.[c.k]||0)>0).map(c=>`<span class="tag">${c.i} ${esc(c.t)}</span>`).join(' ');
  const since=d.joinedAt?new Date(d.joinedAt).toLocaleDateString('he-IL',{month:'long',year:'numeric'}):'';
  openDlg(`<div class="cm-hero-row" style="margin-bottom:10px"><div class="rw-avatar">${initials(d)}</div><div><h2 style="margin:0">${esc(shortName(d))}</h2><div class="hint">${esc(cityOf(d))} · ${d.type==='taxi'?'נהג/ת מונית':'מתנדב/ת עם רכב פרטי'}${since?` · בקהילה מ${since}`:''}</div></div></div>
    <div class="cm-stats" style="margin:8px 0"><div><b>${ridesOfDriver(d)}</b><span>נסיעות</span></div><div><b>${d.fun?.thanks||0}</b><span>תודות</span></div><div><b>${d.fun?.streak||0}</b><span>שבועות ברצף</span></div></div>
    ${wins?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">${wins}</div>`:''}
    ${(d.languages||[]).length?`<p class="hint">🗣️ ${esc(d.languages.join(', '))}</p>`:''}
    ${(d.thanks||[]).slice(0,3).map(t=>`<div class="dlg-quote">״${esc(t.text)}״<div class="hint">${esc(t.from||'')}</div></div>`).join('')}
    <form id="thanksForm" data-id="${d.id}" style="margin-top:12px"><div class="field"><label class="lbl">💛 שליחת תודה ל${esc(String(d.name).split(' ')[0])}</label><textarea name="text" maxlength="300" placeholder="כמה מילים חמות"></textarea></div>
      <div class="field" style="margin-top:8px"><label class="lbl">מאת</label><input name="from" maxlength="60" placeholder="למשל: שירה, עמותת בית חם"></div>
      <p class="err" id="thanksErr"></p>
      <div class="actions"><button class="btn brand" type="submit">שליחה</button><button class="btn ghost" type="button" data-act="closeDlg">סגירה</button></div></form>`);
}
function cmListDlg(kind){
  if(kind==='drivers'){const l=commPool().sort((a,b)=>ridesOfDriver(b)-ridesOfDriver(a));
    openDlg(`<h2 style="margin-top:0">🚗 הנהגים שלנו</h2><div class="cm-list">${l.map(d=>`<button class="cm-row" data-act="cmDriver" data-id="${d.id}"><span class="rw-avatar sm">${initials(d)}</span><span><b>${esc(shortName(d))}</b><span class="hint"> · ${esc(cityOf(d))}</span></span><span class="hint">${ridesOfDriver(d)} נסיעות ←</span></button>`).join('')}</div><p class="hint">מופיעים רק נהגים שהסכימו להופיע בקהילה.</p><div class="actions"><button class="btn ghost" data-act="closeDlg">סגירה</button></div>`);}
  else if(kind==='orgs'){const m={};requests.filter(r=>r.kind==='org').forEach(r=>{m[r.orgName]=m[r.orgName]||{open:0,all:0};m[r.orgName].all++;if(r.status==='open')m[r.orgName].open++;});
    openDlg(`<h2 style="margin-top:0">🏠 העמותות הפעילות</h2><div class="cm-list">${Object.entries(m).map(([o,v])=>`<button class="cm-row" data-act="cmOrg" data-org="${esc(o)}"><span class="rw-avatar sm">🏠</span><span><b>${esc(o)}</b></span><span class="hint">${v.open?`${v.open} מחפשות נהג`:'הכל מכוסה ✓'} ←</span></button>`).join('')}</div><div class="actions"><button class="btn ghost" data-act="closeDlg">סגירה</button></div>`);}
  else {const by={};let tot=0;commPool().forEach(d=>{const n=ridesOfDriver(d);tot+=n;});const live=requests.filter(r=>r.status!=='cancelled');const wk=live.filter(r=>r.schedule==='weekly').length;
    openDlg(`<h2 style="margin-top:0">🚕 הנסיעות שלנו</h2><div class="cm-stats" style="margin:8px 0"><div><b>${tot}</b><span>בוצעו עד היום</span></div><div><b>${live.filter(r=>r.status==='open').length}</b><span>מחפשות נהג עכשיו</span></div><div><b>${wk}</b><span>קבועות</span></div></div>
      <p>כל נסיעה היא אדם שהגיע לטיפול, לבדיקה או לבית ההורים בזכות מתנדב/ת.</p><div class="actions"><a class="btn brand" href="#drive" data-act="closeDlg">לנסיעות שמחפשות נהג ←</a><button class="btn ghost" data-act="closeDlg">סגירה</button></div>`);}
}
function cmOrgDlg(o){
  const rs=requests.filter(r=>r.kind==='org'&&r.orgName===o&&r.status!=='cancelled');
  const open=rs.filter(r=>r.status==='open'&&!isExpired(r));
  const drv=[...new Set(rs.flatMap(r=>[r.driverName,...Object.values(r.covers||{}).map(c=>c.driverName)]).filter(Boolean))];
  openDlg(`<h2 style="margin-top:0">🏠 ${esc(o)}</h2>
    <div class="cm-stats" style="margin:8px 0"><div><b>${rs.length}</b><span>נסיעות שפורסמו</span></div><div><b>${open.length}</b><span>מחפשות נהג</span></div><div><b>${drv.length}</b><span>נהגים שהסיעו</span></div></div>
    ${open.length?`<h3>מחפשות נהג עכשיו</h3>${open.slice(0,4).map(r=>`<div class="cm-row" style="cursor:default"><span>${esc(r.fromCity)} ← ${esc(r.toCity)}</span><span class="hint">${whenText(r)}</span></div>`).join('')}`:'<p>✓ כל הנסיעות של העמותה מכוסות כרגע.</p>'}
    <div class="actions">${open.length?'<a class="btn brand" href="#drive" data-act="closeDlg">אני רוצה לעזור ←</a>':''}<button class="btn ghost" data-act="closeDlg">סגירה</button></div>`);
}

/* ===== חשבון: כניסה והרשמה ===== */
let installEvt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;});
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
/* זהות נוכחית: לכל היותר נהג, מבקש (פרטי או ארגון) ומנהל */
function reqIdentity(){if(!reqPhone)return null;const p=cleanPhone(reqPhone);
  const o=orgs.find(x=>cleanPhone(x.phone)===p&&x.status==='approved')||null;
  const r=requests.find(x=>cleanPhone(x.phone)===p);
  if(o)return {kind:'org',label:o.name};
  if(r&&r.kind==='org')return {kind:'org',label:r.orgName};
  return {kind:'private',label:r?.contactName||'הנסיעות שלי'};}
function renderAccount(){
  const ri=reqIdentity();
  const who=me?String(me.name||'').split(' ')[0]:ri?(ri.kind==='org'?ri.label:'הנסיעות שלי'):adminOn?'צוות':'';
  const ic=me?'🚗':ri?(ri.kind==='org'?'🏢':'🙋'):adminOn?'🛠️':'👤';
  $('#acctLabel').textContent=who||'כניסה / הרשמה';$('#acctTab').textContent=who?'החשבון שלי':'כניסה';
  document.querySelectorAll('.acct-ic,.tabbar [data-act=account] span').forEach(x=>x.textContent=ic);
  const s=$('#authStrip');if(!s)return;
  s.innerHTML=me||ri||adminOn?`<div class="auth-in">👋 ${me?`שלום ${esc(who)}!`:ri?`שלום${ri.kind==='org'?' '+esc(ri.label):''}!`:'מחובר/ת כצוות.'} ${me?'<a href="#drive">ללוח הנסיעות ←</a>':ri?'<a href="#need" data-act="goReqMine">לנסיעות ←</a>':'<a href="#admin">לניהול ←</a>'}</div>`
    :`<b>כבר רשומים או רוצים להצטרף?</b><div class="actions"><button class="btn brand" data-act="account">👤 כניסה / הרשמה</button></div>`;
}
function accountDlg(choose){
  const ri=reqIdentity(),logged=[];
  if(me)logged.push(`<div class="acct-row on"><span>🚗</span><div><b>${esc(me.name)}</b><div class="hint">נהג/ת מתנדב/ת</div></div><a class="btn ghost sm" href="#drive" data-act="closeDlg">ללוח</a><button class="btn ghost sm" data-act="acctOut" data-who="drv">יציאה</button></div>`);
  if(ri)logged.push(`<div class="acct-row on"><span>${ri.kind==='org'?'🏢':'🙋'}</span><div><b>${esc(ri.label)}</b><div class="hint">${ri.kind==='org'?'ארגון':'מבקש/ת פרטי/ת'} · <span dir="ltr">${esc(reqPhone)}</span></div></div><button class="btn ghost sm" data-act="goReqMine">לנסיעות</button><button class="btn ghost sm" data-act="acctOut" data-who="req">יציאה</button></div>`);
  if(adminOn)logged.push(`<div class="acct-row on"><span>🛠️</span><div><b>צוות נוסעים ביחד</b></div><a class="btn ghost sm" href="#admin" data-act="closeDlg">לניהול</a><button class="btn ghost sm" data-act="logout">יציאה</button></div>`);
  const role=(ic,t,sub,b1,b2)=>`<div class="role-card"><div class="role-head"><span>${ic}</span><div><b>${t}</b><div class="hint">${sub}</div></div></div><div class="role-btns">${b1}${b2}</div></div>`;
  const roles=[
    me?'':role('🚗','אני נהג/ת מתנדב/ת','נהגי מוניות ואזרחים. נרשמים ומאמתים לבד','<button class="btn brand sm" data-act="goDrvReg">הרשמה</button>','<button class="btn ghost sm" data-act="goDrvLogin">כבר רשום/ה: כניסה</button>'),
    ri&&ri.kind==='private'?'':role('🙋','אני צריך/ה הסעה','אדם פרטי. אימות קצר בפעם הראשונה','<button class="btn brand sm" data-act="goPostPrivate">פרסום נסיעה</button>','<button class="btn ghost sm" data-act="goReqMine">הנסיעות שלי</button>'),
    ri&&ri.kind==='org'?'':role('🏢','ארגון שצריך הסעות','עמותה, דיור מוגן, מסגרת או רווחה. מצטרפים דרך שיחה ואימות מול הצוות','<button class="btn brand sm" data-act="orgApply">בקשת הצטרפות</button>','<button class="btn ghost sm" data-act="goReqMine">ארגון מאושר: כניסה</button>')
  ].filter(Boolean);
  openDlg(`<h2 style="margin-top:0">${logged.length?'החשבון שלי':'כניסה / הרשמה'}</h2>
    ${logged.length?`<div class="acct-list">${logged.join('')}</div>`:'<p class="hint" style="margin-top:-6px">מי את/ה?</p>'}
    ${logged.length&&!choose?'<div style="text-align:center;margin:10px 0"><button class="linkbtn" data-act="acctSwitch">כניסה לחשבון אחר</button></div>':`<div class="role-list">${roles.join('')}</div>`}
    <a class="partner-link" href="#about" data-act="closeDlg">🤝 רוצים לקחת חלק בפרויקט? <b>צרו קשר ←</b></a>
    <div class="acct-foot">${adminOn?'':'<a href="#admin" data-act="closeDlg">🛠️ כניסת צוות</a>'}${isStandalone()?'':installEvt?'<button class="linkbtn" data-act="install">📲 התקנה בטלפון</button>':'<span class="hint">📲 אפשר להוסיף למסך הבית מתפריט הדפדפן</span>'}</div>
    <div class="actions" style="justify-content:center"><button class="btn ghost" data-act="closeDlg">סגירה</button></div>`);
}
const ORG_TYPES={nonprofit:'עמותה',housing:'דיור מוגן / מסגרת / מרכז יום',welfare:'רשות מקומית / מחלקת רווחה',health:'קופת חולים / מרפאה',other:'ארגון אחר'};
const orgVerified=n=>orgs.some(o=>o.status==='approved'&&o.name===n);
function orgApplyDlg(){
  openDlg(`<h2 style="margin-top:0">🏢 הצטרפות כארגון</h2>
    <p class="hint" style="margin-top:-6px">ארגונים מצטרפים אחרי שיחת היכרות קצרה ואימות. ממלאים כאן, ואנחנו חוזרים אליכם תוך כמה ימים.</p>
    <form id="orgForm" novalidate>
      <div class="field"><span class="lbl req">סוג הארגון</span><div class="checks" style="flex-direction:column;align-items:stretch">${Object.entries(ORG_TYPES).map(([k,v],i)=>`<label style="border-radius:10px"><input type="radio" name="type" value="${k}" ${i===0?'checked':''}>${v}</label>`).join('')}</div></div>
      <div class="grid" style="margin-top:10px">
        <div class="field"><label class="lbl req">שם הארגון</label><input name="name" type="text" maxlength="80"></div>
        <div class="field"><label class="lbl req" id="regLbl">מספר עמותה / ח.פ.</label><input name="regNum" type="text" inputmode="numeric" maxlength="12" placeholder="9 ספרות"></div>
        <div class="field"><label class="lbl req">איש/אשת קשר</label><input name="contactName" type="text" maxlength="60"></div>
        <div class="field"><label class="lbl">תפקיד</label><input name="role" type="text" maxlength="60" placeholder="למשל: רכזת דיור"></div>
        <div class="field"><label class="lbl req">טלפון</label><input name="phone" type="tel" inputmode="tel" placeholder="05X-XXXXXXX"></div>
        <div class="field"><label class="lbl req">אימייל</label><input name="email" type="email" dir="ltr"></div>
        <div class="field"><label class="lbl">כמה נסיעות בחודש בערך?</label><input name="ridesPerMonth" type="text" inputmode="numeric" maxlength="5"></div>
      </div>
      <div class="field" style="margin-top:10px"><label class="lbl">ספרו לנו בקצרה</label><textarea name="message" maxlength="500" placeholder="מי האוכלוסייה, לאן צריך להגיע, מה חשוב לכם"></textarea></div>
      <div class="checks" style="margin-top:10px"><label style="border-radius:12px;align-items:flex-start"><input type="checkbox" name="terms" value="1" style="margin-top:5px"><span>קראתי ומסכים/ה ל<a href="#terms" data-act="closeDlg">תנאי השימוש</a>, ומאשר/ת שאני מוסמך/ת לפנות בשם הארגון.</span></label></div>
      <p class="hint">מה נבדוק: רישום ברשם העמותות או ברשם החברות, אישור ניהול תקין לעמותות, שיחה עם איש הקשר, והסכם שיתוף פעולה קצר.</p>
      <p class="err" id="orgErr"></p>
      <div class="actions"><button class="btn brand" type="submit">שליחת בקשה</button><button class="btn ghost" type="button" data-act="closeDlg">ביטול</button></div>
    </form>`);
}
async function submitOrg(e){
  e.preventDefault();const f=e.target,fd=new FormData(f),s=k=>String(fd.get(k)||'').trim(),err=$('#orgErr');
  const o={type:s('type'),name:s('name'),regNum:s('regNum').replace(/\D/g,''),contactName:s('contactName'),role:s('role'),phone:s('phone'),email:s('email'),ridesPerMonth:s('ridesPerMonth'),message:s('message'),status:'pending',checks:{registry:false,contact:false,agreement:false},at:Date.now()};
  if(!o.name)return err.textContent='נא למלא את שם הארגון.';
  if(!(['welfare','health'].includes(o.type)&&!o.regNum)&&o.regNum.length!==9)return err.textContent='מספר עמותה או ח.פ. הוא 9 ספרות (לרשות או קופת חולים אפשר להשאיר ריק).';
  if(!o.contactName)return err.textContent='נא למלא איש/אשת קשר.';
  if(!validPhone(o.phone))return err.textContent='מספר הטלפון לא תקין.';
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email))return err.textContent='כתובת האימייל לא תקינה.';
  if(fd.get('terms')!=='1')return err.textContent='נא לאשר את התנאים.';
  await api.add('orgs',o);notify('admin',`🏢 בקשת הצטרפות חדשה: ${o.name} (${ORG_TYPES[o.type]})`,'#admin');
  openDlg(`<h2 style="margin-top:0">✅ הבקשה התקבלה</h2><p>תודה! צוות נוסעים ביחד יחזור ל${esc(o.contactName)} בטלפון או במייל לשיחת היכרות קצרה.</p><p class="hint">אחרי האימות תקבלו גישה לפרסום נסיעות בשם הארגון, והנסיעות שלכם יסומנו ✓ ארגון מאומת.</p><div class="actions"><button class="btn brand" data-act="closeDlg">סגירה</button></div>`);
}
function validTz(t){if(!/^\d{5,9}$/.test(t))return false;t=t.padStart(9,'0');let s=0;for(let i=0;i<9;i++){let d=+t[i]*((i%2)+1);s+=d>9?d-9:d;}return s%10===0;}
function monthlyRides(phone){const pid=cleanPhone(phone),m=todayStr().slice(0,7);let n=0;
  for(const r of requests){if(cleanPhone(r.phone)!==pid||r.status==='cancelled')continue;
    if(r.schedule==='weekly')n+=4*((r.days||[]).length||1);else if((r.date||'').slice(0,7)===m)n++;}
  return n;}
const ELIG={age:'גיל 70+',disability:'מוגבלות / נכות',medical:'טיפול רפואי קבוע',other:'אחר'};
const PSTAT={pending:'ממתין לאימות',approved:'מאומת',blocked:'חסום'};
let pFilter='pending';
function renderPvts(){
  if(!adminOn||!$('#aPvtList'))return;
  const waiting=pvts.filter(x=>x.status==='pending').length;const c=$('#pvtCnt');c.hidden=!waiting;c.textContent=waiting;
  const PF={pending:`ממתינים (${waiting})`,approved:'מאומתים',blocked:'חסומים',all:'הכל'};
  $('#pChips').innerHTML=Object.entries(PF).map(([k,v])=>`<button class="chip ${k===pFilter?'on':''}" data-act="pfilter" data-f="${k}">${v}</button>`).join('');
  const l=pvts.filter(x=>pFilter==='all'||x.status===pFilter).sort((a,b)=>b.at-a.at);
  $('#aPvtList').innerHTML=l.length?l.map(x=>{const rides=requests.filter(r=>cleanPhone(r.phone)===x.id&&r.status!=='cancelled');const used=monthlyRides(x.phone),lim=x.refName?12:6;
    const abuse=reports.filter(p=>p.type==='abuse'&&rides.some(r=>r.id===p.rideId)).length;
    return `<article class="item ${x.status==='blocked'?'inactive':''}">
    <div class="item-top"><span class="when">${esc(x.name)}</span><span class="badge ${x.status==='approved'?'s-done':x.status==='blocked'?'s-cancelled':'s-open'}">${PSTAT[x.status]}</span></div>
    <div class="meta" style="margin-top:6px"><a dir="ltr" href="tel:${esc(x.id)}">${esc(x.phone)}</a><span>ת״ז: ••••${esc(x.tzLast4||'')}</span><span>סיבה: ${ELIG[x.elig]||'-'}</span>
      ${x.refName?`<span>גורם מפנה: <b>${esc(x.refName)}</b>${x.refPhone?` · <a dir="ltr" href="tel:${esc(cleanPhone(x.refPhone))}">${esc(x.refPhone)}</a>`:''}</span>`:'<span class="hint">אין גורם מפנה</span>'}</div>
    <div class="meta" style="margin-top:6px"><button class="linkbtn" data-act="filterQ" data-q="${esc(x.phone)}">${rides.length} נסיעות ←</button><span class="${used>lim?'warn-t':''}">החודש: ${used} מתוך ${lim}</span>${abuse?`<span class="warn-t">🚩 ${abuse} דיווחי חשד לניצול</span>`:''}</div>
    <div class="actions">${x.status!=='approved'?`<button class="btn accent sm" data-act="pvtSet" data-id="${x.id}" data-s="approved">✓ אימות</button>`:''}${x.status!=='blocked'?`<button class="btn danger sm" data-act="pvtSet" data-id="${x.id}" data-s="blocked">חסימה</button>`:`<button class="btn ghost sm" data-act="pvtSet" data-id="${x.id}" data-s="pending">החזרה לבדיקה</button>`}</div></article>`;}).join(''):'<div class="empty">אין מבקשים בסינון הזה.</div>';
}
const CT_TYPES={partner:'🤝 רוצים לקחת חלק',donor:'💛 תרומה לתפעול',perks:'☕ הטבות לנהגים',fleet:'🚕 חברת מוניות / הסעות',collab:'🤝 שיתוף פעולה',press:'📰 תקשורת',other:'💬 אחר'};
async function submitContact(e){
  e.preventDefault();const f=e.target,fd=new FormData(f),s=k=>String(fd.get(k)||'').trim(),err=$('#ctErr');
  const c={type:'partner',name:s('name'),org:s('org'),phone:s('phone'),email:s('email'),message:s('message'),status:'new',at:Date.now()};
  if(!c.name)return err.textContent='נא למלא שם.';
  if(!validPhone(c.phone))return err.textContent='מספר הטלפון לא תקין.';
  if(c.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email))return err.textContent='כתובת האימייל לא תקינה.';
  err.textContent='';await api.add('contacts',c);notify('admin',`📨 פנייה חדשה: ${CT_TYPES[c.type]} · ${c.name}${c.org?' ('+c.org+')':''}`,'#admin');
  f.reset();$('#ctCard').innerHTML='<p style="font-size:18px;margin:0">✅ תודה! נחזור אליך בקרוב.</p>';
}
function renderContacts(){
  if(!adminOn||!$('#aCtList'))return;
  const n=contacts.filter(c=>c.status==='new').length;const cc=$('#ctCnt');cc.hidden=!n;cc.textContent=n;
  const l=[...contacts].sort((a,b)=>(a.status==='new'?0:1)-(b.status==='new'?0:1)||b.at-a.at);
  $('#aCtList').innerHTML=l.length?l.map(c=>`<article class="item ${c.status==='handled'?'inactive':''}">
    <div class="item-top"><span class="when">${CT_TYPES[c.type]||''}</span><span class="badge ${c.status==='new'?'s-open':'s-done'}">${c.status==='new'?'חדשה':'טופלה'}</span></div>
    <div class="meta" style="margin-top:6px"><span><b>${esc(c.name)}</b>${c.org?` · ${esc(c.org)}`:''}</span><a dir="ltr" href="tel:${esc(cleanPhone(c.phone))}">${esc(c.phone)}</a>${c.email?`<a dir="ltr" href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:''}<span>${new Date(c.at).toLocaleDateString('he-IL')}</span></div>
    ${c.message?`<div class="meta" style="margin-top:6px">💬 ${esc(c.message)}</div>`:''}
    <div class="actions"><button class="btn ${c.status==='new'?'accent':'ghost'} sm" data-act="ctSet" data-id="${c.id}" data-s="${c.status==='new'?'handled':'new'}">${c.status==='new'?'✓ סימון כטופלה':'החזרה לחדשות'}</button></div></article>`).join(''):'<div class="empty">אין פניות.</div>';
}
const OSTAT={pending:'חדשה',contacted:'בתהליך',approved:'מאושר',rejected:'נדחה'};
let oFilter='pending';
function renderOrgs(){
  if(!adminOn||!$('#aOrgList'))return;
  const waiting=orgs.filter(o=>o.status==='pending'||o.status==='contacted').length;
  const c=$('#orgCnt');c.hidden=!waiting;c.textContent=waiting;
  const OF={pending:`ממתינים (${waiting})`,approved:'מאושרים',rejected:'נדחו',all:'הכל'};
  $('#oChips').innerHTML=Object.entries(OF).map(([k,v])=>`<button class="chip ${k===oFilter?'on':''}" data-act="ofilter" data-f="${k}">${v}</button>`).join('');
  const l=orgs.filter(o=>oFilter==='all'||o.status===oFilter||(oFilter==='pending'&&o.status==='contacted')).sort((a,b)=>b.at-a.at);
  const CK={registry:'נבדק ברשם (עמותות / חברות)',contact:'שיחת היכרות התקיימה',agreement:'הסכם שיתוף פעולה נחתם'};
  $('#aOrgList').innerHTML=l.length?l.map(o=>{const ck=o.checks||{};const all=Object.keys(CK).every(k=>ck[k]);
    const isAm=String(o.regNum||'').startsWith('58');const regUrl=isAm?`https://www.guidestar.org.il/organization/${encodeURIComponent(o.regNum)}`:`https://ica.justice.gov.il/GenericCorporarionInfo/SearchCorporation?unit=8`;
    return `<article class="item ${o.status==='rejected'?'inactive':''}">
    <div class="item-top"><span class="when">${esc(o.name)} <span class="tag">${ORG_TYPES[o.type]||''}</span></span><span class="badge ${o.status==='approved'?'s-done':o.status==='rejected'?'s-cancelled':'s-open'}">${OSTAT[o.status]}</span></div>
    <div class="meta" style="margin-top:6px">${o.regNum?`<span>${isAm?'מס׳ עמותה':'ח.פ.'}: <a href="${regUrl}" target="_blank" rel="noopener" dir="ltr">${esc(o.regNum)}</a></span>`:'<span class="hint">גוף ציבורי, בלי מספר רשם</span>'}
      <span>${esc(o.contactName)}${o.role?` (${esc(o.role)})`:''} · <a dir="ltr" href="tel:${esc(cleanPhone(o.phone))}">${esc(o.phone)}</a> · <a dir="ltr" href="mailto:${esc(o.email)}">${esc(o.email)}</a></span>
      ${o.ridesPerMonth?`<span>כ-${esc(o.ridesPerMonth)} נסיעות בחודש</span>`:''}
      ${o.status==='approved'?`<button class="linkbtn" data-act="filterQ" data-q="${esc(o.name)}">לנסיעות של הארגון ←</button>`:''}</div>
    ${o.message?`<div class="meta" style="margin-top:6px">💬 ${esc(o.message)}</div>`:''}
    <div class="org-checks">${Object.entries(CK).map(([k,v])=>`<label><input type="checkbox" data-act="orgCheck" data-id="${o.id}" data-k="${k}" ${ck[k]?'checked':''} ${o.status==='approved'?'disabled':''}> ${v}</label>`).join('')}</div>
    ${o.note?`<div class="hint">📝 ${esc(o.note)}</div>`:''}
    <div class="actions">${o.status==='approved'?`<button class="btn ghost sm" data-act="orgSet" data-id="${o.id}" data-s="contacted">ביטול אישור</button>`:o.status==='rejected'?`<button class="btn ghost sm" data-act="orgSet" data-id="${o.id}" data-s="pending">החזרה לבדיקה</button>`
      :`${o.status==='pending'?`<button class="btn ghost sm" data-act="orgSet" data-id="${o.id}" data-s="contacted">📞 סימון: יצרנו קשר</button>`:''}<button class="btn accent sm" data-act="orgSet" data-id="${o.id}" data-s="approved" ${all?'':'disabled title="צריך לסמן את כל הבדיקות"'}>✓ אישור הארגון</button><button class="btn danger sm" data-act="orgSet" data-id="${o.id}" data-s="rejected">דחייה</button>`}</div></article>`;}).join(''):'<div class="empty">אין ארגונים בסינון הזה.</div>';
}

/* ===== עריכת נסיעה (ניהול) ===== */
let adminAdding=false,editId=null;
function openEdit(id){
  const r=requests.find(x=>x.id===id);if(!r)return;editId=id;
  const c=r.cog||{};const f=(n,l,v,extra='')=>`<div class="field"><label class="lbl">${l}</label><input name="${n}" value="${esc(v||'')}" ${extra}></div>`;
  $('#editBody').innerHTML=`<div class="me" style="margin-bottom:6px"><h2 style="margin:0">עריכת נסיעה</h2><button class="btn ghost sm" type="button" data-act="closeEdit">סגירה</button></div>
  <form id="editForm" novalidate>
    <div class="seg"><label><input type="radio" name="kind" value="org" ${r.kind==='org'?'checked':''}>עמותה / מסגרת</label><label><input type="radio" name="kind" value="private" ${r.kind!=='org'?'checked':''}>אדם פרטי</label></div>
    <div class="seg" style="margin-top:10px" data-e-org><label><input type="radio" name="access" value="all" ${r.access!=='approved'?'checked':''}>כל נהג מאומת</label><label><input type="radio" name="access" value="approved" ${r.access==='approved'?'checked':''}>רק נהגים שהעמותה אישרה</label></div>
    <div class="grid" style="margin-top:12px">
      ${f('orgName','שם העמותה',r.orgName,'type="text" maxlength="80"')}
      ${f('contactName','איש/אשת קשר',r.contactName,'type="text" maxlength="80"')}
      ${f('phone','טלפון לתיאום',r.phone,'type="tel"')}
    </div>
    <h3>מסלול</h3>
    <div class="grid">
      ${f('fromCity','עיר מוצא',r.fromCity,'type="text" maxlength="40"')}
      ${f('fromPlace','נקודת איסוף (כללית)',r.fromPlace,'type="text" maxlength="80"')}
      ${f('toCity','עיר יעד',r.toCity,'type="text" maxlength="40"')}
      ${f('toPlace','יעד (כללי)',r.toPlace,'type="text" maxlength="80"')}
    </div>
    <h3>מתי</h3>
    <div class="seg"><label><input type="radio" name="schedule" value="once" ${r.schedule!=='weekly'?'checked':''}>פעם אחת</label><label><input type="radio" name="schedule" value="weekly" ${r.schedule==='weekly'?'checked':''}>קבוע, כל שבוע</label></div>
    <div class="grid" style="margin-top:12px">
      <div class="field" data-e-once><label class="lbl">תאריך</label><input type="date" name="date" value="${esc(r.date||'')}"></div>
      <div class="field full" data-e-weekly><span class="lbl">ימים</span><div class="checks">${DAYS.slice(0,6).map((d,i)=>`<label><input type="checkbox" name="days" value="${i}" ${(r.days||[]).includes(String(i))?'checked':''}>${d}׳</label>`).join('')}</div></div>
      ${f('time','שעת איסוף',r.time,'type="time"')}
      <div class="field" data-e-weekly><label class="lbl">עד תאריך</label><input type="date" name="until" value="${esc(r.until||'')}"></div>
      ${f('passengers','מספר נוסעים',r.passengers||1,'type="number" min="1" max="8"')}
    </div>
    <h3>צרכים</h3>
    <div class="checks">${NEEDS.map(n=>`<label><input type="checkbox" name="needs" value="${n.k}" ${hasNeed(r,n.k)?'checked':''}>${n.i} ${n.t}</label>`).join('')}</div>
    <div class="cog" data-e-cog>
      <div class="cog-h">🧠 הנחיות לנהג</div>
      <div class="seg" style="margin-top:6px"><label><input type="radio" name="cogAlone" value="no" ${c.alone!=='yes'?'checked':''}>לא להשאיר לבד</label><label><input type="radio" name="cogAlone" value="yes" ${c.alone==='yes'?'checked':''}>אפשר להשאיר לבד לרגע</label></div>
      <div class="grid" style="margin-top:10px">
        ${f('cogFrom','מי מוסר באיסוף',c.from,'type="text" maxlength="60"')}
        ${f('cogTo','מי מקבל ביעד',c.to,'type="text" maxlength="60"')}
        ${f('cogComm','איך לתקשר',c.comm,'type="text" maxlength="160"')}
        ${f('cogCalm','מה מלחיץ ומה מרגיע',c.calm,'type="text" maxlength="160"')}
      </div>
    </div>
    <div class="field full" style="margin-top:12px"><label class="lbl">הערות לנהג</label><textarea name="notes" maxlength="400">${esc(r.notes||'')}</textarea></div>
    <p class="err" id="editErr"></p>
    <div class="actions"><button class="btn brand" type="submit">שמירת שינויים</button><button class="btn ghost" type="button" data-act="closeEdit">ביטול</button></div>
  </form>`;
  syncEdit();$('#editBg').classList.add('open');
}
function syncEdit(){
  const f=$('#editForm');if(!f)return;
  const sched=f.schedule.value,needs=[...f.querySelectorAll('input[name=needs]:checked')].map(x=>x.value);
  f.querySelectorAll('[data-e-once]').forEach(e=>e.hidden=sched!=='once');
  f.querySelectorAll('[data-e-weekly]').forEach(e=>e.hidden=sched!=='weekly');
  f.querySelector('[data-e-cog]').hidden=!NEEDS.some(n=>n.cog&&needs.includes(n.k));
  f.orgName.closest('.field').hidden=f.kind.value!=='org';f.querySelector('[data-e-org]').hidden=f.kind.value!=='org';
}
const closeEdit=()=>{$('#editBg').classList.remove('open');editId=null;};
async function saveEdit(e){
  e.preventDefault();const f=e.target,fd=new FormData(f),err=$('#editErr');err.textContent='';
  const s=k=>String(fd.get(k)||'').trim();
  const u={kind:s('kind'),orgName:s('orgName'),contactName:s('contactName'),phone:cleanPhone(s('phone')),fromCity:s('fromCity'),fromPlace:s('fromPlace'),
    toCity:s('toCity'),toPlace:s('toPlace'),schedule:s('schedule'),date:s('date'),days:fd.getAll('days'),until:s('until'),time:s('time'),
    passengers:Math.max(1,parseInt(fd.get('passengers'),10)||1),needs:fd.getAll('needs'),notes:s('notes'),access:s('kind')==='org'?(s('access')||'all'):'all'};
  if(u.kind==='org'&&!u.orgName)return err.textContent='נא למלא שם עמותה.';
  if(!u.contactName||!validPhone(u.phone))return err.textContent='נא לבדוק את איש הקשר והטלפון.';
  if(!u.fromCity||!u.toCity||!u.time)return err.textContent='נא למלא עיר מוצא, עיר יעד ושעה.';
  if(u.schedule==='once'){if(!u.date)return err.textContent='נא לבחור תאריך.';if(isRestDay(u.date))return err.textContent=`🕯️ אי אפשר לקבוע נסיעה ב${restName(u.date)}.`;u.days=[];u.until='';}
  else{if(!u.days.length)return err.textContent='נא לבחור לפחות יום אחד.';u.date='';}
  if(NEEDS.some(n=>n.cog&&u.needs.includes(n.k))){if(!s('cogTo'))return err.textContent='נא לכתוב מי מקבל/ת את הנוסע/ת ביעד.';
    u.cog={alone:s('cogAlone')||'no',from:s('cogFrom'),to:s('cogTo'),comm:s('cogComm'),calm:s('cogCalm')};}
  for(const k of ['wheelchair','escort','returnTrip','patience'])u[k]=false;
  try{await api.update('requests',editId,u);closeEdit();toast('השינויים נשמרו ✓');}
  catch(x){console.error(x);err.textContent='השמירה נכשלה. נסו שוב.';}
}

/* ===== ניהול ===== */
let adminOn=false,aTab='reqs',aFilter='open',aQuery='',drvUnsub=null,dFilter='pending';
function startDash(){
  setTimeout(()=>{try{renderAccount();}catch(e){}},0);
  adminOn=true;$('#loginBox').hidden=true;$('#dash').hidden=false;
  if(reqUnsub){reqUnsub();reqUnsub=null;}ensureRequests();renderBell();
  drvUnsub=api.listen('drivers',l=>{drivers=l;renderAdmin();},x=>{console.error(x);$('#dashErr').textContent='אין הרשאה. ודאו שהמשתמש מוגדר כמנהל.';});
}
function stopDash(){adminOn=false;setTimeout(()=>{try{renderAccount();}catch(e){}},0);if(drvUnsub){drvUnsub();drvUnsub=null;}drivers=[];$('#dash').hidden=true;$('#loginBox').hidden=false;}
function renderAdmin(){
  if(!adminOn)return;
  const live=requests.filter(r=>!isExpired(r)&&r.status!=='cancelled'&&r.status!=='done');
  const uncovered=live.filter(r=>occDates(r,1).some(d=>!driverFor(r,d))).length;
  const vs=d=>d.verification?.status||'none';
  const flagged=drivers.filter(d=>issuesOf(d).total>=3).length;
  const openReps=reports.filter(x=>x.status==='open').length;
  const urgent=urgentRides();
  const tile=(go,n,t,hot)=>`<button class="stat ${hot?'hot':''}" data-act="statnav" data-go="${go}"><div class="n">${n}</div><div class="t">${t} ←</div></button>`;
  $('#stats').innerHTML=tile('missing',uncovered,'נסיעה קרובה בלי נהג',uncovered)+tile('seeking',live.filter(r=>r.schedule==='weekly'&&r.status==='open').length,'קבועות שמחפשות נהג קבוע')
    +tile('approved',drivers.filter(d=>d.active&&vs(d)==='approved').length,'נהגים מאומתים')+tile('pending',drivers.filter(d=>vs(d)==='pending').length,'ממתינים לאימות',drivers.some(d=>vs(d)==='pending'))
    +tile('cts',contacts.filter(c=>c.status==='new').length,'פניות תורמים ושותפים',contacts.some(c=>c.status==='new'))+tile('pvt',pvts.filter(x=>x.status==='pending').length,'מבקשים פרטיים לאימות',pvts.some(x=>x.status==='pending'))+tile('orgs',orgs.filter(o=>o.status==='pending'||o.status==='contacted').length,'ארגונים ממתינים',orgs.some(o=>o.status==='pending'))+tile('reports',openReps,'דיווחים פתוחים',openReps)+tile('flagged',flagged,'נהגים לבדיקה',flagged);
  $('#urgentBox').innerHTML=urgent.length?`<button class="urgent" data-act="statnav" data-go="urgent">🚨 <b>${urgent.length===1?'נסיעה אחת':urgent.length+' נסיעות'} ב-24 השעות הקרובות עדיין בלי נהג.</b> לחצו לרשימה ←</button>`:'';
  const rc=$('#repCnt');rc.hidden=!openReps;rc.textContent=openReps;
  const F={open:'פעילות',urgent:'דחופות',missing:'בלי נהג',seeking:'מחפשות נהג קבוע',expired:'עבר המועד',done:'בוצעו',cancelled:'בוטלו',all:'הכל'};
  $('#aChips').innerHTML=Object.entries(F).map(([k,v])=>`<button class="chip ${k===aFilter?'on':''}" data-act="afilter" data-f="${k}">${v}</button>`).join('');
  let l=requests.filter(r=>{
    if(aFilter==='all')return true;
    if(aFilter==='expired')return isExpired(r)&&(r.status==='open'||r.status==='taken');
    if(aFilter==='open')return (r.status==='open'||r.status==='taken')&&!isExpired(r);
    if(aFilter==='urgent')return urgent.includes(r);
    if(aFilter==='seeking')return r.schedule==='weekly'&&r.status==='open'&&!isExpired(r);
    if(aFilter==='missing')return (r.status==='open'||r.status==='taken')&&!isExpired(r)&&occDates(r,2).some(d=>!driverFor(r,d));
    return r.status===aFilter;});
  const q=norm(aQuery);
  if(q)l=l.filter(r=>[r.orgName,r.contactName,r.phone,r.fromCity,r.toCity,r.driverName,r.notes].some(x=>norm(x).includes(q)));
  l.sort((a,b)=>((occDates(a,1)[0]||a.date||'')+a.time).localeCompare((occDates(b,1)[0]||b.date||'')+b.time));
  $('#aReqList').innerHTML=l.length?l.map(r=>{
    const occ=occDates(r,3);
    return `<article class="item">
    <div class="item-top"><span class="when">${whenText(r)}</span><span class="badge s-${r.status}">${r.schedule==='weekly'&&r.status==='open'?'מחפשת נהג קבוע':STATUS[r.status]}</span></div>
    ${routeHtml(r)}<div class="meta" style="gap:6px">${needsTags(r)}</div>
    <div class="meta" style="margin-top:6px"><span>מבקש/ת: <b>${esc(r.contactName)}</b> · ${r.kind==='org'?`<button class="linkbtn" data-act="filterQ" data-q="${esc(r.orgName)}">${esc(r.orgName)}</button>${orgVerified(r.orgName)?' <span class="tag">✓ ארגון מאומת</span>':' <span class="tag need">ארגון לא מאומת</span>'}`:'אדם פרטי'} · <a dir="ltr" href="tel:${esc(cleanPhone(r.phone))}">${esc(r.phone)}</a></span>
      ${r.driverName&&(r.status==='taken'||r.status==='done')?`<span>🚗 ${r.status==='done'?'נהג/ת':'קבוע/ה'}: <button class="linkbtn" data-act="gotoDriver" data-id="${r.driverId}">${esc(r.driverName)}</button> · <a dir="ltr" href="tel:${esc(cleanPhone(r.driverPhone))}">${esc(r.driverPhone)}</a></span>`:''}
      ${r.privPending?'<button class="tag need linkbtn" data-act="statnav" data-go="pvt">🪪 ממתין לאימות מבקש</button>':''}${r.access==='approved'?'<span class="tag">🔐 נהגים מאושרי עמותה</span>':''}${r.isReturn?'<span class="tag">↩ נסיעת חזור</span>':''}${r.status==='done'?`<span class="tag ${r.confirmed===true?'':'need'}">${r.confirmed===true?'✓ המבקש אישר':r.confirmed===false?'✗ המבקש דיווח שלא בוצעה':'⏳ מחכה לאישור המבקש'}</span>`:''}</div>
    ${occ.length&&(r.status==='open'||r.status==='taken')?`<div class="occ">${occ.map(d=>{const dr=driverFor(r,d);return dr?`<div class="got"><span>${fmtDate(d)}</span><button class="linkbtn" data-act="gotoDriver" data-id="${dr.driverId}">✓ ${esc(dr.driverName)}${dr.cover?' (חד-פעמי)':''}</button></div>`:`<div class="miss"><span>${fmtDate(d)}</span><span>⚠️ אין נהג</span></div>`;}).join('')}</div>`:''}
    ${r.notes?`<div class="meta" style="margin-top:6px">💬 ${esc(r.notes)}</div>`:''}
    ${r.feedback?`<div class="meta" style="margin-top:6px">${r.feedback.score>0?'👍':'👎'} משוב מהמבקש${r.feedback.text?`: ${esc(r.feedback.text)}`:''}</div>`:''}
    ${Object.entries(r.covers||{}).flatMap(([dt,c])=>[c.feedback&&`${c.feedback.score>0?'👍':'👎'} משוב מהמבקש (${fmtDate(dt)})${c.feedback.text?`: ${esc(c.feedback.text)}`:''}`,c.driverFeedback&&`${c.driverFeedback.score>0?'👍':'👎'} משוב מהנהג/ת (${fmtDate(dt)})${c.driverFeedback.text?`: ${esc(c.driverFeedback.text)}`:''}`]).filter(Boolean).map(t=>`<div class="meta" style="margin-top:6px">${t}</div>`).join('')}
    ${r.driverFeedback?`<div class="meta" style="margin-top:6px">${r.driverFeedback.score>0?'👍':'👎'} משוב מהנהג/ת${r.driverFeedback.text?`: ${esc(r.driverFeedback.text)}`:''}</div>`:''}
    <div class="actions">
      <button class="btn ghost sm" data-act="aedit" data-id="${r.id}">✏️ עריכה</button>
      ${r.status==='open'||r.status==='taken'?`<button class="btn danger sm" data-act="acancel" data-id="${r.id}">ביטול</button>`:`<button class="btn ghost sm" data-act="areopen" data-id="${r.id}">החזרה ללוח</button>`}
      ${r.status==='taken'?`<button class="btn ghost sm" data-act="release" data-id="${r.id}">שחרור הנהג הקבוע</button>`:''}
    </div></article>`;}).join(''):'<div class="empty">אין נסיעות בסינון הזה.</div>';

  const pendingN=drivers.filter(d=>vs(d)==='pending').length;
  const DF={pending:`ממתינים לאימות (${pendingN})`,flagged:`לבדיקה (${flagged})`,orgreq:'בקשות אישור עמותה',approved:'מאומתים',none:'טרם הגישו',all:'הכל'};
  $('#dChips').innerHTML=Object.entries(DF).map(([k,v])=>`<button class="chip ${k===dFilter?'on':''}" data-act="dfilter" data-f="${k}">${v}</button>`).join('');
  const dl=drivers.filter(d=>dFilter==='all'||vs(d)===dFilter||(dFilter==='none'&&vs(d)==='rejected')||(dFilter==='flagged'&&issuesOf(d).total>=3)||(dFilter==='orgreq'&&(d.orgRequests||[]).length)).sort((a,b)=>(b.active-a.active)||((b.verification?.submittedAt||0)-(a.verification?.submittedAt||0)));
  const rideCount=(id,st)=>requests.filter(r=>r.driverId===id&&r.status===st).length+(st==='done'?requests.reduce((n,r)=>n+Object.values(r.covers||{}).filter(c=>c.driverId===id&&c.done).length,0):0);
  $('#aDrvList').innerHTML=dl.length?dl.map(d=>{const v=d.verification||{status:'none'};
    const expired=Object.keys(DOCS).filter(k=>docExpired(k,v.docs?.[k]));
    const thumbs=v.docs?`<div class="thumbs">${Object.entries(DOCS).map(([k,def])=>{const x=v.docs[k];if(!x)return `<div class="thumb warn"><div class="noimg">—</div>${def.title}<br>חסר</div>`;
      const isImg=x.url&&String(x.type||'').startsWith('image/'),date=x[def.dateKey],exp=docExpired(k,x);
      const inner=`${isImg?`<img src="${esc(x.url)}" alt="">`:'<div class="noimg">📄</div>'}${def.title}<br>${def.dateLabel}: <b style="color:${exp?'var(--danger)':'inherit'}">${date?esc(date.split('-').reverse().join('/')):'—'}</b>`;
      return isImg?`<button class="thumb ${exp?'warn':''}" data-act="showDoc" data-src="${esc(x.url)}">${inner}</button>`
        :(x.url&&!x.url.startsWith('data:')?`<a class="thumb ${exp?'warn':''}" href="${esc(x.url)}" target="_blank" rel="noopener" style="text-decoration:none">${inner}</a>`:`<div class="thumb ${exp?'warn':''}">${inner}</div>`);}).join('')}</div>`:'';
    const prof=[carDesc(d)&&`🚗 ${esc(carDesc(d))}`,d.trunk&&'מקום לכיסא מתקפל',(d.languages||[]).length&&`🗣️ ${esc(d.languages.join(', '))}`,(d.experience||[]).length&&`🤝 ${esc(d.experience.join(', '))}`,d.firstAid&&'⛑️ עזרה ראשונה',d.emergencyName&&`🆘 ${esc(d.emergencyName)} <span dir="ltr">${esc(d.emergencyPhone)}</span>`].filter(Boolean);
    const iss=issuesOf(d);const orgs=[...new Set(requests.filter(r=>r.kind==='org').map(r=>r.orgName))];
    const issuesHtml=iss.total?`<div class="issues ${iss.total>=3?'bad':''}"><b>${iss.total>=3?'⚠️ דפוס חוזר: ':''}${iss.total} אירועים ב-90 הימים האחרונים</b>
      <div class="hint">${[iss.late&&`איחורים: ${iss.late}`,iss.noshow&&`לא הגיע: ${iss.noshow}`,iss.attitude&&`יחס: ${iss.attitude}`,iss.lateCancel&&`ביטולים מאוחרים: ${iss.lateCancel}`,iss.neg&&`משוב שלילי: ${iss.neg}`].filter(Boolean).join(' · ')}</div>
      ${iss.total>=3&&d.active?'<div class="hint">מומלץ לשוחח עם הנהג/ת, ואם זה חוזר, להשהות.</div>':''}
      <button class="linkbtn" data-act="repsOf" data-id="${d.id}">לכל הדיווחים ←</button></div>`:'';
    const orgHtml=`<div class="orgappr">🏠 אישורי עמותות: ${(d.orgApprovals||[]).length?(d.orgApprovals||[]).map(o=>`<span class="tag">${esc(o)} <button class="x-mini" data-act="orgRevoke" data-id="${d.id}" data-org="${esc(o)}" aria-label="הסרה">×</button></span>`).join(' '):'<span class="hint">אין</span>'}
      ${(d.orgRequests||[]).length?`<div class="hint">ביקש/ה אישור מ: ${d.orgRequests.map(o=>`<button class="linkbtn" data-act="orgGrant" data-id="${d.id}" data-org="${esc(o)}">✓ ${esc(o)}</button>`).join(' ')}</div>`:''}
      ${v.status==='approved'?`<div class="org-add"><select data-orgsel>${orgs.filter(o=>!(d.orgApprovals||[]).includes(o)).map(o=>`<option>${esc(o)}</option>`).join('')}</select><button class="btn ghost sm" data-act="orgGrant" data-id="${d.id}">הוספת אישור עמותה</button></div>`:''}</div>`;
    return `<article class="item ${d.active?'':'inactive'} ${hiDriver===d.id?'hilite':''}" id="drv-${d.id}">
    <div class="item-top"><span class="when">${esc(d.name)} <span class="tag">${d.type==='taxi'?'נהג/ת מונית':'אזרח/ית'}</span></span><span class="badge v-${v.status}">${v.status==='approved'?'✓ מאומת/ת ע״י נוסעים ביחד':VSTATUS[v.status]}</span></div>
    <div class="meta" style="margin-top:6px"><span>📍 ${esc(d.area)}</span><span dir="ltr">${esc(d.phone)}</span>${d.accessible?'<span class="tag">♿ נגיש</span>':''}
      <button class="linkbtn" data-act="ridesOf" data-q="${esc(d.name)}">נסיעות קבועות: <b>${rideCount(d.id,'taken')}</b></button><button class="linkbtn" data-act="ridesOf" data-q="${esc(d.name)}">בוצעו: <b>${rideCount(d.id,'done')}</b></button>
      ${expired.length?`<span class="tag need">⚠️ פג תוקף: ${expired.map(k=>DOCS[k].title).join(', ')}</span>`:''}</div>
    ${prof.length?`<div class="meta" style="margin-top:6px">${prof.map(x=>`<span>${x}</span>`).join('')}</div>`:''}
    ${v.status==='rejected'&&v.note?`<div class="meta" style="margin-top:6px">סיבת דחייה: ${esc(v.note)}</div>`:''}
    ${issuesHtml}${orgHtml}
    ${thumbs}
    ${v.status==='pending'?`<div class="reject-row"><button class="btn accent sm" data-act="approve" data-id="${d.id}">✓ אימות ע״י נוסעים ביחד</button><input type="text" data-reason placeholder="סיבה לדחייה (תוצג לנהג/ת)"><button class="btn danger sm" data-act="reject" data-id="${d.id}">החזרה לתיקון</button></div>`:''}
    <div class="actions">${v.status==='approved'?`<input type="text" data-reason placeholder="סיבה" style="max-width:200px"><button class="btn ghost sm" data-act="reject" data-id="${d.id}">ביטול אימות</button>`:''}
      <button class="btn ${d.active?'ghost':'accent'} sm" data-act="toggleDriver" data-id="${d.id}">${d.active?'השהיה':'הפעלה'}</button></div></article>`;}).join(''):'<div class="empty">אין נהגים בסינון הזה.</div>';
  renderReports();renderOrgs();renderPvts();renderContacts();
}
const REP_TYPES={abuse:'🚩 חשד לניצול (לא נראה שצריך הסעה)',passenger_attitude:'😠 יחס לא ראוי כלפיי',wrong_details:'📝 פרטים לא מדויקים בבקשה',driver_late:'⏰ הנהג/ת איחר/ה',driver_no_show:'🚫 הנהג/ת לא הגיע/ה',attitude:'😟 יחס לא נאות',no_show_passenger:'🚪 הנוסע/ת לא הגיע/ה',safety:'🚨 תאונה או אירוע חריג',other:'💬 אחר'};
const DRIVER_FAULT=['driver_late','driver_no_show','attitude'];
let rFilter='open',repDriver=null,hiDriver=null;
function renderReports(){
  if(!adminOn)return;
  const RF={open:'פתוחים',handled:'טופלו',all:'הכל'};
  $('#rChips').innerHTML=Object.entries(RF).map(([k,v])=>`<button class="chip ${k===rFilter?'on':''}" data-act="rfilter" data-f="${k}">${v}</button>`).join('')+(repDriver?`<button class="chip on" data-act="repsOf" data-id="">נהג/ת: ${esc((drivers.find(d=>d.id===repDriver)||{}).name||'')} ×</button>`:'');
  const l=reports.filter(x=>(rFilter==='all'||x.status===rFilter)&&(!repDriver||x.aboutDriverId===repDriver)).sort((a,b)=>b.at-a.at);
  $('#aRepList').innerHTML=l.length?l.map(x=>{const r=reqById(x.rideId);return `<article class="item">
    <div class="item-top"><span class="when">${REP_TYPES[x.type]||x.type}</span><span class="badge ${x.status==='open'?'s-open':'s-done'}">${x.status==='open'?'פתוח':'טופל'}</span></div>
    <div class="meta" style="margin-top:6px"><span>דיווח של: <b>${esc(x.byName||'')}</b> (${x.by==='driver'?'נהג/ת':x.by==='requester'?'מבקש/ת':'מנהל'})</span><span>${new Date(x.at).toLocaleDateString('he-IL')}</span>
      ${x.aboutDriverId?`<span>על: <button class="linkbtn" data-act="gotoDriver" data-id="${x.aboutDriverId}">${esc(x.aboutDriverName||'')}</button></span>`:''}
      ${x.by==='driver'&&r?`<span>על: <button class="linkbtn" data-act="filterQ" data-q="${esc(r.kind==='org'?r.orgName:r.contactName)}">${esc(r.kind==='org'?r.orgName:r.contactName)}</button></span>`:''}
      ${r?`<span>נסיעה: <button class="linkbtn" data-act="filterQ" data-q="${esc(r.contactName)}">${esc(r.fromCity)} ← ${esc(r.toCity)}</button></span>`:''}</div>
    ${x.text?`<div class="meta" style="margin-top:6px">💬 ${esc(x.text)}</div>`:''}
    <div class="actions">${x.status==='open'?`<button class="btn accent sm" data-act="repDone" data-id="${x.id}">✓ סימון כטופל</button>`:''}${x.aboutDriverId?`<button class="btn danger sm" data-act="suspendDriver" data-id="${x.aboutDriverId}">השהיית הנהג/ת</button>`:''}</div></article>`;}).join(''):'<div class="empty">אין דיווחים בסינון הזה.</div>';
}
/* אירועים שליליים לנהג ב-90 יום */
function issuesOf(d){
  const since=Date.now()-90*864e5;
  const rs=reports.filter(x=>x.aboutDriverId===d.id&&x.at>=since&&DRIVER_FAULT.includes(x.type));
  const late=rs.filter(x=>x.type==='driver_late').length,noshow=rs.filter(x=>x.type==='driver_no_show').length,attitude=rs.filter(x=>x.type==='attitude').length;
  const lateCancel=(d.lateCancels||[]).filter(x=>x.at>=since).length;
  const neg=requests.filter(r=>r.driverId===d.id&&r.feedback&&r.feedback.score<0).length+requests.reduce((n,r)=>n+Object.values(r.covers||{}).filter(c=>c.driverId===d.id&&c.feedback&&c.feedback.score<0).length,0);
  return {late,noshow,attitude,lateCancel,neg,total:late+noshow+attitude+lateCancel+neg};
}
function hoursUntil(date,time){return (new Date(`${date}T${time||'00:00'}`).getTime()-Date.now())/36e5;}
function urgentRides(){return requests.filter(r=>(r.status==='open'||r.status==='taken')&&!isExpired(r)&&occDates(r,1).some(d=>!driverFor(r,d)&&hoursUntil(d,r.time)<=24&&hoursUntil(d,r.time)>-1));}

/* ===== זמינות ===== */
const SLOTS={morning:{t:'בוקר (6–12)',from:6,to:12},noon:{t:'צהריים (12–16)',from:12,to:16},evening:{t:'ערב (16–21)',from:16,to:21}};
function fitsAvail(d,date,time){
  if(!date)return false;
  const day=String(new Date(date+'T12:00').getDay()),hr=parseInt(String(time).split(':')[0],10);
  const dOk=!(d.avDays||[]).length||(d.avDays||[]).includes(day);
  const sOk=!(d.avSlots||[]).length||(d.avSlots||[]).some(k=>hr>=SLOTS[k].from&&hr<SLOTS[k].to);
  return dOk&&sOk;
}

/* ===== התראות ===== */
async function notify(to,text,link){try{await api.add('notifs',{to,text,link:link||'',at:Date.now(),read:false});}catch(e){console.error(e);}}
function notifyNewRide(r){
  const occ=occDates(r,1)[0];
  for(const d of allDrivers){
    if(d.active===false||d.verification?.status!=='approved')continue;
    if(!(areaMatch(d.area,r.fromCity)||areaMatch(d.area,r.toCity)))continue;
    if(!fitsAvail(d,occ,r.time))continue;
    notify('drv:'+(d.id),`🆕 נסיעה חדשה באזור שלך: ${r.fromCity} ← ${r.toCity}, ${r.schedule==='weekly'?'כל שבוע':fmtDate(r.date)} ב-${r.time}`,'#drive');
  }
}
/* ההתראות לפי המסך: נהג בלוח, מבקש בעמוד הנסיעות, מנהל בניהול. בבית: הכל. */
function myTargets(){const v=(location.hash||'#home').slice(1),t=[];
  if(me&&(v==='drive'||v==='home'||v==='community'))t.push('drv:'+me.id);
  if(reqPhone&&(v==='need'||v==='home'))t.push('req:'+cleanPhone(reqPhone));
  if(adminOn&&(v==='admin'||v==='home'))t.push('admin');return t;}
function virtualNotifs(){
  const out=[];const tmr=addDays(1);
  const T=myTargets();
  if(me&&T.includes('drv:'+me.id))for(const it of myItems())if(it.date===tmr)out.push({virt:true,text:`⏰ תזכורת: מחר ב-${it.r.time} נסיעה מ${it.r.fromCity} ל${it.r.toCity}`,link:'#drive'});
  if(reqPhone&&T.includes('req:'+cleanPhone(reqPhone)))for(const r of requests)if(cleanPhone(r.phone)===cleanPhone(reqPhone)&&r.status!=='cancelled')for(const d of occDates(r,2))if(!driverFor(r,d)&&hoursUntil(d,r.time)<=24&&hoursUntil(d,r.time)>0)out.push({virt:true,text:`⚠️ לנסיעה ${fmtDate(d)} ב-${r.time} מ${r.fromCity} עדיין אין נהג. הצוות שלנו מטפל.`,link:'#need'});
  if(adminOn&&T.includes('admin')){const u=urgentRides().length;if(u)out.push({virt:true,text:`🚨 ${u===1?'נסיעה אחת':u+' נסיעות'} ב-24 השעות הקרובות בלי נהג`,link:'#admin'});}
  return out;
}
function renderBell(){
  const t=myTargets();const mine=notifs.filter(n=>t.includes(n.to)).sort((a,b)=>b.at-a.at);
  const v=virtualNotifs();const unread=mine.filter(n=>!n.read).length+v.length;
  const c=$('#bellCnt');c.hidden=!unread;c.textContent=unread;
  if($('#bellPanel').hidden)return;
  $('#bellPanel').innerHTML=`<div class="bell-head"><b>התראות</b><span><button class="linkbtn" data-act="bellRead">סימון הכל כנקרא</button> <button class="x-mini" style="font-size:20px;color:var(--muted)" data-act="bellClose" aria-label="סגירה">×</button></span></div>
    ${[...v,...mine].length?[...v,...mine].slice(0,30).map(n=>`<button class="bell-item ${n.read?'':'unread'}" data-act="bellGo" data-id="${n.id||''}" data-link="${esc(n.link||'')}">${esc(n.text)}${n.at?`<span class="hint">${new Date(n.at).toLocaleString('he-IL',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'numeric'})}</span>`:''}</button>`).join(''):'<div class="empty" style="padding:20px">אין התראות כרגע</div>'}
    <p class="hint" style="margin:8px 4px 0">בגרסה המלאה ההתראות יגיעו גם בוואטסאפ או ב-SMS.</p>`;
}

/* ===== דיאלוגים: דיווח, סיבת ביטול, משוב ===== */
function openDlg(html){$('#dlgBody').innerHTML=html;$('#dlgBg').classList.add('open');}
const closeDlg=()=>$('#dlgBg').classList.remove('open');
function openReport(rideId,by,date){
  const r=reqById(rideId);if(!r)return;
  const types=by==='driver'?['no_show_passenger','wrong_details','passenger_attitude','abuse','safety','other']:['driver_late','driver_no_show','attitude','safety','other'];
  const dr=driverFor(r,date||occDates(r,1)[0]||r.date)||(r.driverId?{driverId:r.driverId,driverName:r.driverName}:null);
  openDlg(`<h2 style="margin-top:0">⚠️ דיווח על בעיה</h2><p class="hint">${esc(r.fromCity)} ← ${esc(r.toCity)} · ${whenText(r)}</p>
    <form id="repForm" data-ride="${r.id}" data-by="${by}" data-driver="${dr?.driverId||''}" data-dname="${esc(dr?.driverName||'')}">
      <div class="checks" style="flex-direction:column;align-items:stretch">${types.map((t,i)=>`<label style="border-radius:10px"><input type="radio" name="type" value="${t}" ${i===0?'checked':''}>${REP_TYPES[t]}</label>`).join('')}</div>
      <div class="field" style="margin-top:12px"><label class="lbl">מה קרה?</label><textarea name="text" maxlength="500" placeholder="כמה מילים שיעזרו לנו לטפל"></textarea></div>
      <p class="hint">הדיווח מגיע רק לצוות הניהול, ולא מוצג לצד השני.</p>
      <p class="err" id="repErr"></p>
      <div class="actions"><button class="btn brand" type="submit">שליחת דיווח</button><button class="btn ghost" type="button" data-act="closeDlg">ביטול</button></div></form>`);
}
async function submitReport(e){
  e.preventDefault();const f=e.target,fd=new FormData(f);
  const type=fd.get('type'),text=String(fd.get('text')||'').trim();
  if((type==='other'||type==='safety')&&!text){$('#repErr').textContent='נא לתאר בקצרה מה קרה.';return;}
  const by=f.dataset.by,r=reqById(f.dataset.ride);
  const rep={rideId:f.dataset.ride,by,byName:by==='driver'?me?.name:(r?.kind==='org'?`${r.contactName}, ${r.orgName}`:r?.contactName),type,text,at:Date.now(),status:'open'};
  if(DRIVER_FAULT.includes(type)&&f.dataset.driver){rep.aboutDriverId=f.dataset.driver;rep.aboutDriverName=f.dataset.dname;}
  await api.add('reports',rep);notify('admin',`📣 דיווח חדש: ${REP_TYPES[type]} (${r?.fromCity||''} ← ${r?.toCity||''})`,'#admin');
  closeDlg();toast('הדיווח נשלח לצוות. תודה שעדכנת 🙏');
}
let pendingRelease=null;
function askReason(kind,id,date){
  pendingRelease={kind,id,date};
  openDlg(`<h2 style="margin-top:0">ביטול פחות מ-24 שעות לפני</h2><p>הנוסע/ת כבר מתכנן/ת על הנסיעה. נעדכן את המבקש ואת הצוות, והנסיעה תחזור ללוח.</p>
    <form id="reasonForm"><div class="field"><label class="lbl req">סיבת הביטול</label><textarea name="reason" maxlength="300" placeholder="למשל: מחלה, תקלה ברכב"></textarea></div>
    <p class="hint">ביטולים מאוחרים נרשמים. ביטולים חוזרים יובילו לבדיקה.</p><p class="err" id="reasonErr"></p>
    <div class="actions"><button class="btn danger" type="submit">ביטול והחזרה ללוח</button><button class="btn ghost" type="button" data-act="closeDlg">חזרה</button></div></form>`);
}
async function doRelease(kind,id,date,reason){
  const r=reqById(id);if(!r)return;
  if(kind==='cover'){const c={...r.covers};delete c[date];await api.update('requests',id,{covers:c});}
  else await api.update('requests',id,RELEASE);
  if(reason&&me){await api.update('drivers',me.id,{lateCancels:[...(me.lateCancels||[]),{at:Date.now(),rideId:id,reason}]});
    notify('req:'+cleanPhone(r.phone),`⚠️ ${me.name} ביטל/ה את הנסיעה ${fmtDate(date)} (${reason}). הנסיעה חזרה ללוח ונעדכן כשיימצא נהג.`,'#need');
    notify('admin',`⚠️ ביטול מאוחר: ${me.name}, ${r.fromCity} ← ${r.toCity} ${fmtDate(date)}. סיבה: ${reason}`,'#admin');}
  toast('הנסיעה חזרה ללוח');
}
function askFeedback(rideId,key,by){
  const drv=by==='driver';
  openDlg(`<h2 style="margin-top:0">${drv?'תודה רבה! 🎉 איך היה?':'תודה! איך הייתה הנסיעה?'}</h2><p class="hint">${drv?'נבקש מהמבקש לאשר שהנסיעה בוצעה. ':''}המשוב פרטי ומגיע רק לצוות.</p>
    <form id="fbForm" data-ride="${rideId}" data-key="${key||''}" data-by="${drv?'driver':'requester'}"><div class="checks"><label><input type="radio" name="score" value="1" checked>👍 ${drv?'הכל היה בסדר':'הייתה טובה'}</label><label><input type="radio" name="score" value="-1">👎 ${drv?'היה משהו לא בסדר (יחס, פרטים, המתנה)':'משהו לא היה בסדר'}</label></div>
    <div class="field" style="margin-top:10px"><label class="lbl">רוצים להוסיף משהו? (לא חובה)</label><textarea name="text" maxlength="300"></textarea></div>
    <div class="actions"><button class="btn brand" type="submit">שליחה</button><button class="btn ghost" type="button" data-act="closeDlg">דילוג</button></div></form>`);
}

/* ===== אירועים ===== */
function armed(el,label){if(el.dataset.sure)return true;const orig=el.textContent;el.dataset.sure='1';el.textContent=label;setTimeout(()=>{if(el.isConnected){delete el.dataset.sure;el.textContent=orig;}},3500);return false;}
const RELEASE={status:'open',driverId:null,driverName:null,driverPhone:null,driverCar:null,takenAt:null};
const reqById=id=>requests.find(r=>r.id===id);
function goMine(){driverTab='mine';setTabs('dtab','mine',{open:'#openPane',mine:'#minePane',rewards:'#rewardsPane',profile:'#profilePane'});}
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const {act,id,date}=el.dataset;
  try{switch(act){
    case 'ntab':setTabs('ntab',el.dataset.tab,{post:'#nPost',mine:'#nMine'});renderReqMine();break;
    case 'dtab':e.preventDefault();driverTab=el.dataset.tab;setTabs('dtab',driverTab,{open:'#openPane',mine:'#minePane',rewards:'#rewardsPane',profile:'#profilePane'});if(driverTab==='profile')renderProfile();if(driverTab==='rewards')renderRewards();break;
    case 'bfilter':boardFilter=el.dataset.f;renderBoard();break;
    case 'claimSeries':{
      if(!isVerified()){toast('צריך להשלים אימות לפני שלוקחים נסיעה');return;}
      if(!armed(el,'לאשר? לחצו שוב'))return;el.disabled=true;
      try{await api.claim(id,d=>d.status==='open',()=>({status:'taken',...meInfo(),takenAt:Date.now()}));}
      catch(x){toast('מישהו/י כבר לקח/ה את הנסיעה הזו 🙂');return;}
      {const r=reqById(id);notify('req:'+cleanPhone(r.phone),`🚗 ${me.name} לקח/ה את הנסיעה מ${r.fromCity} ל${r.toCity}${r.schedule==='weekly'?' באופן קבוע':''}. יתקשר/תתקשר לתיאום.`,'#need');}
      toast('הנסיעה שלך! עכשיו להתקשר לתיאום');goMine();break;}
    case 'claimOnce':{
      if(!isVerified()){toast('צריך להשלים אימות לפני שלוקחים נסיעה');return;}
      if(!armed(el,'לאשר? לחצו שוב'))return;el.disabled=true;
      try{await api.claim(id,d=>d.status==='open'&&!(d.covers||{})[date],d=>({covers:{...(d.covers||{}),[date]:{...meInfo(),at:Date.now()}}}));}
      catch(x){toast('מישהו/י כבר לקח/ה את המועד הזה 🙂');return;}
      {const r=reqById(id);notify('req:'+cleanPhone(r.phone),`🚗 ${me.name} לקח/ה את הנסיעה ${fmtDate(date)} מ${r.fromCity} ל${r.toCity}.`,'#need');}
      toast(`לקחת את ${fmtDate(date)}. תודה! 💛`);goMine();break;}
    case 'done':{const r=reqById(id);await api.update('requests',id,{status:'done',doneAt:Date.now(),confirmed:null});notify('req:'+cleanPhone(r.phone),`✅ ${me?.name||'הנהג/ת'} סימן/ה שהנסיעה מ${r.fromCity} בוצעה. נשמח שתאשרו.`,'#need');askFeedback(id,'','driver');break;}
    case 'coverDone':{const r=reqById(id);await api.update('requests',id,{covers:{...r.covers,[date]:{...r.covers[date],done:true,confirmed:null}}});notify('req:'+cleanPhone(r.phone),`✅ ${me?.name||'הנהג/ת'} סימן/ה שהנסיעה ${fmtDate(date)} בוצעה. נשמח שתאשרו.`,'#need');askFeedback(id,date,'driver');break;}
    case 'release':{
      if(adminOn&&location.hash==='#admin'){if(!armed(el,'לשחרר? לחצו שוב'))return;await api.update('requests',id,RELEASE);toast('הנהג שוחרר והנסיעה חזרה ללוח');break;}
      const r=reqById(id);const d=date||occDates(r,1)[0]||r.date;
      if(hoursUntil(d,r.time)<24){askReason('series',id,d);break;}
      if(!armed(el,'בטוח/ה? לחצו שוב'))return;await doRelease('series',id,d,'');break;}
    case 'coverRelease':{const r=reqById(id);
      if(hoursUntil(date,r.time)<24){askReason('cover',id,date);break;}
      if(!armed(el,'בטוח/ה? לחצו שוב'))return;await doRelease('cover',id,date,'');break;}
    case 'report':openReport(id,el.dataset.by,date);break;
    case 'closeDlg':closeDlg();break;
    case 'confirmYes':{const r=reqById(id),k=el.dataset.key;
      if(k)await api.update('requests',id,{covers:{...r.covers,[k]:{...r.covers[k],confirmed:true}}});else await api.update('requests',id,{confirmed:true});
      askFeedback(id,k);break;}
    case 'confirmNo':{const r=reqById(id),k=el.dataset.key;
      if(k)await api.update('requests',id,{covers:{...r.covers,[k]:{...r.covers[k],confirmed:false}}});else await api.update('requests',id,{confirmed:false});
      openReport(id,'requester',k||r.date);setTimeout(()=>{const x=document.querySelector('#repForm input[value=driver_no_show]');if(x)x.checked=true;},0);break;}
    case 'askOrg':{const o=el.dataset.org;await api.update('drivers',me.id,{orgRequests:[...new Set([...(me.orgRequests||[]),o])]});notify('admin',`🏠 ${me.name} מבקש/ת אישור מ${o}`,'#admin');toast('הבקשה נשלחה לעמותה');break;}
    case 'orgGrant':{const d=drivers.find(x=>x.id===id);const o=el.dataset.org||el.closest('.org-add')?.querySelector('[data-orgsel]')?.value;if(!o)return;
      await api.update('drivers',id,{orgApprovals:[...new Set([...(d.orgApprovals||[]),o])],orgRequests:(d.orgRequests||[]).filter(x=>x!==o)});notify('drv:'+id,`🏠 ${o} אישרה אותך. עכשיו אפשר לקחת גם את הנסיעות שלה.`,'#drive');toast(`נוסף אישור של ${o}`);break;}
    case 'orgRevoke':{const d=drivers.find(x=>x.id===id);await api.update('drivers',id,{orgApprovals:(d.orgApprovals||[]).filter(x=>x!==el.dataset.org)});break;}
    case 'statnav':{const g=el.dataset.go;
      if(['missing','seeking','urgent'].includes(g)){aFilter=g;aQuery='';$('#aSearch').value='';setTabs('atab','reqs',{reqs:'#aReqPane',drvs:'#aDrvPane',reps:'#aRepPane',orgs:'#aOrgPane',pvt:'#aPvtPane',cts:'#aCtPane'});}
      else if(g==='cts'){setTabs('atab','cts',{reqs:'#aReqPane',drvs:'#aDrvPane',reps:'#aRepPane',orgs:'#aOrgPane',pvt:'#aPvtPane',cts:'#aCtPane'});}
      else if(g==='pvt'){pFilter='pending';setTabs('atab','pvt',{reqs:'#aReqPane',drvs:'#aDrvPane',reps:'#aRepPane',orgs:'#aOrgPane',pvt:'#aPvtPane',cts:'#aCtPane'});}
      else if(g==='orgs'){oFilter='pending';setTabs('atab','orgs',{reqs:'#aReqPane',drvs:'#aDrvPane',reps:'#aRepPane',orgs:'#aOrgPane',pvt:'#aPvtPane',cts:'#aCtPane'});}
      else if(g==='reports'){rFilter='open';repDriver=null;setTabs('atab','reps',{reqs:'#aReqPane',drvs:'#aDrvPane',reps:'#aRepPane',orgs:'#aOrgPane',pvt:'#aPvtPane',cts:'#aCtPane'});}
      else{dFilter=g;setTabs('atab','drvs',{reqs:'#aReqPane',drvs:'#aDrvPane',reps:'#aRepPane',orgs:'#aOrgPane',pvt:'#aPvtPane',cts:'#aCtPane'});}
      renderAdmin();document.querySelector('#dash .tabs').scrollIntoView({behavior:'smooth',block:'start'});break;}
    case 'gotoDriver':{dFilter='all';hiDriver=id;setTabs('atab','drvs',{reqs:'#aReqPane',drvs:'#aDrvPane',reps:'#aRepPane',orgs:'#aOrgPane',pvt:'#aPvtPane',cts:'#aCtPane'});renderAdmin();setTimeout(()=>document.getElementById('drv-'+id)?.scrollIntoView({behavior:'smooth',block:'center'}),50);setTimeout(()=>{hiDriver=null;},3000);break;}
    case 'ridesOf':case 'filterQ':{aQuery=el.dataset.q;$('#aSearch').value=aQuery;aFilter='all';setTabs('atab','reqs',{reqs:'#aReqPane',drvs:'#aDrvPane',reps:'#aRepPane',orgs:'#aOrgPane',pvt:'#aPvtPane',cts:'#aCtPane'});renderAdmin();document.querySelector('#dash .tabs').scrollIntoView({behavior:'smooth',block:'start'});break;}
    case 'repsOf':{repDriver=id||null;rFilter='all';setTabs('atab','reps',{reqs:'#aReqPane',drvs:'#aDrvPane',reps:'#aRepPane',orgs:'#aOrgPane',pvt:'#aPvtPane',cts:'#aCtPane'});renderAdmin();break;}
    case 'rfilter':rFilter=el.dataset.f;renderReports();break;
    case 'repDone':await api.update('reports',id,{status:'handled',handledAt:Date.now()});toast('סומן כטופל');break;
    case 'suspendDriver':{const d=drivers.find(x=>x.id===id);if(d&&d.active===false){toast('הנהג/ת כבר מושהה/ית');break;}if(!armed(el,'להשהות? לחצו שוב'))return;await api.update('drivers',id,{active:false});notify('drv:'+id,'החשבון שלך הושהה זמנית. הצוות ייצור איתך קשר.','#drive');toast('הנהג/ת הושהה/תה');break;}
    case 'bell':{const pn=$('#bellPanel');pn.style.top=(el.getBoundingClientRect().bottom+8)+'px';pn.hidden=!pn.hidden;renderBell();break;}
    case 'orgApply':orgApplyDlg();break;
    case 'ctSet':await api.update('contacts',id,{status:el.dataset.s});break;
    case 'toggleDrvLogin':{const b=$('#dLoginBox');b.hidden=!b.hidden;if(!b.hidden)$('#dLoginPhone').focus();break;}
    case 'pfilter':pFilter=el.dataset.f;renderPvts();break;
    case 'pvtSet':{const s=el.dataset.s;if(s==='blocked'&&!armed(el,'לחסום? לחצו שוב'))return;await api.update('pvts',id,{status:s,decidedAt:Date.now()});
      const rs=requests.filter(r=>cleanPhone(r.phone)===id&&r.status!=='cancelled');
      for(const r of rs){if(s==='approved'&&r.privPending)await api.update('requests',r.id,{privPending:false});if(s==='blocked'&&r.status==='open')await api.update('requests',r.id,{privPending:true});}
      if(s==='approved'){notify('req:'+id,'✅ אומתת ע״י צוות נוסעים ביחד. הנסיעות שלך פורסמו לנהגים.','#need');const r0=rs[0];if(r0)notifyNewRide(r0);}
      toast(s==='approved'?'אומת/ה, והנסיעות פורסמו ✓':s==='blocked'?'נחסם/ה':'עודכן');break;}
    case 'ofilter':oFilter=el.dataset.f;renderOrgs();break;
    case 'orgCheck':{const o=orgs.find(x=>x.id===id);await api.update('orgs',id,{checks:{...(o.checks||{}),[el.dataset.k]:el.checked}});break;}
    case 'orgSet':{const s=el.dataset.s;if(s==='rejected'&&!armed(el,'לדחות? לחצו שוב'))return;await api.update('orgs',id,{status:s,decidedAt:Date.now()});toast(s==='approved'?'הארגון אושר ✓':s==='contacted'?'סומן: בתהליך':s==='rejected'?'הבקשה נדחתה':'עודכן');break;}
    case 'cmDriver':cmDriverDlg(id);break;
    case 'cmOrg':cmOrgDlg(el.dataset.org);break;
    case 'cmDrivers':cmListDlg('drivers');break;
    case 'cmOrgs':cmListDlg('orgs');break;
    case 'cmRides':cmListDlg('rides');break;
    case 'goRewards':location.hash='#drive';setTimeout(()=>document.querySelector('[data-act=dtab][data-tab=rewards]')?.click(),60);break;
    case 'account':accountDlg();break;
    case 'acctSwitch':accountDlg(true);break;
    case 'goDrvReg':closeDlg();location.hash='#drive';setTimeout(()=>{$('#dLoginBox').hidden=true;$('#dName')?.focus();$('#regForm').scrollIntoView({block:'start'});},60);break;
    case 'goDrvLogin':closeDlg();location.hash='#drive';setTimeout(()=>{$('#dLoginBox').hidden=false;$('#dLoginPhone').focus();},60);break;
    case 'goPostPrivate':closeDlg();location.hash='#need';setTabs('ntab','post',{post:'#nPost',mine:'#nMine'});setTimeout(()=>{const x=document.querySelector('#needForm input[name=kind][value=private]');if(x){x.checked=true;syncNeedForm();}},30);break;
    case 'goReqMine':closeDlg();location.hash='#need';setTabs('ntab','mine',{post:'#nPost',mine:'#nMine'});renderReqMine();break;
    case 'acctOut':if(el.dataset.who==='drv'){me=null;lsSet(ME_KEY,null);enterBoard();}else{reqPhone=null;lsSet(REQ_KEY,null);renderReqMine();}closeDlg();renderAccount();renderBell();toast('יצאת מהחשבון');break;
    case 'install':if(installEvt){installEvt.prompt();installEvt=null;closeDlg();}break;
    case 'bellClose':$('#bellPanel').hidden=true;break;
    case 'bellRead':{for(const n of notifs.filter(n=>myTargets().includes(n.to)&&!n.read))await api.update('notifs',n.id,{read:true});break;}
    case 'bellGo':{if(id)await api.update('notifs',id,{read:true});$('#bellPanel').hidden=true;if(el.dataset.link)location.hash=el.dataset.link;break;}
    case 'driverOut':me=null;lsSet(ME_KEY,null);enterBoard();break;
    case 'demoDriver':me={id:'d1',name:'אורית לוי',phone:'052-1234567'};enterBoard();toast('נכנסת כאורית, נהגת מאומתת (דוגמה)');break;
    case 'demoOrg':reqPhone='035551234';lsSet(REQ_KEY,reqPhone);renderReqMine();break;
    case 'reqOut':reqPhone=null;lsSet(REQ_KEY,null);renderReqMine();break;
    case 'reqCancel':if(!armed(el,'לבטל? לחצו שוב'))return;await api.update('requests',id,{status:'cancelled'});toast('הנסיעה בוטלה');break;
    case 'previewShabbat':forceShabbat=true;renderShabbat();break;
    case 'exitShabbat':forceShabbat=false;renderShabbat();break;
    case 'resetDemo':if(!armed(el,'בטוח? לחצו שוב'))return;api.reset();me=null;lsSet(ME_KEY,null);reqPhone=null;lsSet(REQ_KEY,null);enterBoard();renderReqMine();toast('נתוני ההדגמה אופסו');break;
    case 'atab':aTab=el.dataset.tab;setTabs('atab',aTab,{reqs:'#aReqPane',drvs:'#aDrvPane',reps:'#aRepPane',orgs:'#aOrgPane',pvt:'#aPvtPane',cts:'#aCtPane'});break;
    case 'afilter':aFilter=el.dataset.f;renderAdmin();break;
    case 'dfilter':dFilter=el.dataset.f;renderAdmin();break;
    case 'adminAdd':adminAdding=true;location.hash='#need';setTabs('ntab','post',{post:'#nPost',mine:'#nMine'});$('#adminAddNote').hidden=false;break;
    case 'cancelAdminAdd':adminAdding=false;$('#adminAddNote').hidden=true;break;
    case 'aedit':openEdit(id);break;
    case 'closeEdit':closeEdit();break;
    case 'acancel':if(!armed(el,'לבטל? לחצו שוב'))return;await api.update('requests',id,{status:'cancelled'});break;
    case 'areopen':await api.update('requests',id,{...RELEASE});break;
    case 'toggleDriver':{const d=drivers.find(x=>x.id===id);await api.update('drivers',id,{active:!d.active});break;}
    case 'approve':{const d=drivers.find(x=>x.id===id);await api.update('drivers',id,{verification:{...d.verification,status:'approved',approvedAt:Date.now(),note:'',by:'נוסעים ביחד'}});notify('drv:'+id,'✅ החשבון שלך אומת ע״י צוות נוסעים ביחד. אפשר לקחת נסיעות!','#drive');toast(`${d.name} אומת/ה ✅`);break;}
    case 'reject':{const d=drivers.find(x=>x.id===id);const note=(el.closest('.item').querySelector('[data-reason]')?.value||'').trim();
      if(!note){toast('נא לכתוב סיבה, היא תוצג לנהג/ת');return;}
      await api.update('drivers',id,{verification:{...d.verification,status:'rejected',note}});toast('נשלח לתיקון');break;}
    case 'showDoc':$('#lightImg').src=el.dataset.src;$('#light').classList.add('open');break;
    case 'closeLight':$('#light').classList.remove('open');break;
    case 'submitVerify':el.disabled=true;try{await submitVerify();}finally{el.disabled=false;}break;
    case 'redeem':openRedeem(el.dataset.p);break;
    case 'doRedeem':{const pk=el.dataset.p;await api.update('drivers',me.id,{redeemed:[...(me.redeemed||[]),pk]});closeRedeem();toast('ההטבה מומשה. תהנה/י! ☕');break;}
    case 'closeRedeem':closeRedeem();break;
    case 'certToast':toast('בגרסה המלאה: אישור PDF חתום על ידי העמותה');break;
    case 'logout':closeDlg();await api.logout();break;
  }}catch(x){console.error(x);toast('הפעולה נכשלה. בדקו חיבור.');}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.matches('input[data-doc]'))onDocFile(t);
  else if(t.matches('input[data-docdate]')&&vDraft){const k=t.dataset.docdate;vDraft[k]={...(vDraft[k]||{}),[DOCS[k].dateKey]:t.value};}
  else if(t.id==='vDecl')vDecl=t.checked;
});
$('#needForm').addEventListener('change',e=>{if(['kind','schedule','needs'].includes(e.target.name))syncNeedForm();});
$('#needForm').addEventListener('submit',submitNeed);
document.addEventListener('submit',async e=>{
  if(e.target.id==='editForm')saveEdit(e);
  else if(e.target.id==='repForm')submitReport(e);
  else if(e.target.id==='orgForm')submitOrg(e);
  else if(e.target.id==='ctForm')submitContact(e);
  else if(e.target.id==='dLoginForm'){e.preventDefault();const ph=$('#dLoginPhone').value.trim();if(!validPhone(ph)){$('#dLoginErr').textContent='מספר הטלפון לא תקין.';return;}
    const d=await api.findDriverByPhone(ph);if(!d){$('#dLoginErr').textContent='לא מצאנו נהג/ת עם המספר הזה. אפשר להירשם בטופס למטה.';return;}
    me={id:d.id,name:d.name,phone:d.phone};lsSet(ME_KEY,me);enterBoard();toast(`ברוך/ה השב/ה, ${String(d.name).split(' ')[0]}!`);}
  else if(e.target.id==='thanksForm'){e.preventDefault();const f=e.target,fd=new FormData(f),text=String(fd.get('text')||'').trim(),from=String(fd.get('from')||'').trim();
    if(!text){$('#thanksErr').textContent='נא לכתוב כמה מילים.';return;}
    const d=commDrivers.find(x=>x.id===f.dataset.id);await api.update('drivers',d.id,{thanks:[{from:from||'מישהו מהקהילה',text,ago:'עכשיו'},...(d.thanks||[])],fun:{...(d.fun||{}),thanks:(d.fun?.thanks||0)+1}});
    notify('drv:'+d.id,`💛 קיבלת תודה${from?' מ'+from:''}: "${text.slice(0,60)}"`,'#drive');closeDlg();toast('התודה נשלחה 💛');}
  else if(e.target.id==='reasonForm'){e.preventDefault();const reason=String(new FormData(e.target).get('reason')||'').trim();if(!reason){$('#reasonErr').textContent='נא לכתוב סיבה.';return;}const p=pendingRelease;closeDlg();await doRelease(p.kind,p.id,p.date,reason);}
  else if(e.target.id==='fbForm'){e.preventDefault();const f=e.target,fd=new FormData(f),fb={score:Number(fd.get('score')),text:String(fd.get('text')||'').trim()};const r=reqById(f.dataset.ride),k=f.dataset.key;
    const fk=f.dataset.by==='driver'?'driverFeedback':'feedback';
    if(k)await api.update('requests',r.id,{covers:{...r.covers,[k]:{...r.covers[k],[fk]:fb}}});else await api.update('requests',r.id,{[fk]:fb});
    if(fb.score<0)notify('admin',`👎 משוב שלילי ${f.dataset.by==='driver'?'מנהג/ת':'ממבקש/ת'} על נסיעה ${r.fromCity} ← ${r.toCity}${fb.text?': '+fb.text:''}`,'#admin');closeDlg();toast('תודה על המשוב 💛');}
});
$('#dlgBg').addEventListener('click',e=>{if(e.target.id==='dlgBg')closeDlg();});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=button][data-act]')){e.preventDefault();e.target.click();}});
document.addEventListener('click',e=>{const pn=$('#bellPanel');if(!pn.hidden&&!e.target.closest('#bellPanel')&&!e.target.closest('.bell'))pn.hidden=true;});
document.addEventListener('change',e=>{if(e.target.closest&&e.target.closest('#editForm'))syncEdit();});
$('#editBg').addEventListener('click',e=>{if(e.target.id==='editBg')closeEdit();});
$('#regForm').addEventListener('submit',submitReg);
$('#backForm').addEventListener('submit',submitBack);
$('#profileForm').addEventListener('submit',submitProfile);
$('#reqPhoneForm').addEventListener('submit',e=>{e.preventDefault();const p=cleanPhone($('#reqPhoneIn').value);
  if(!validPhone(p)){$('#reqPhoneErr').textContent='מספר לא תקין.';return;}$('#reqPhoneErr').textContent='';reqPhone=p;lsSet(REQ_KEY,p);renderReqMine();});
$('#aSearch').addEventListener('input',e=>{aQuery=e.target.value;renderAdmin();});
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();$('#loginErr').textContent='';
  try{await api.login($('#lEmail').value.trim(),$('#lPass').value);}catch(x){console.error(x);$('#loginErr').textContent='אימייל או סיסמה שגויים.';}});

/* ===== הפעלה ===== */
document.title=APP_NAME;$('#appName').textContent=APP_NAME;
$('#nDays').innerHTML=DAYS.slice(0,6).map((d,i)=>`<label><input type="checkbox" name="days" value="${i}">${d}׳</label>`).join('')+'<span class="hint" style="align-self:center">🕯️ בשבת המערכת לא פעילה</span>';
$('#nNeeds').innerHTML=NEEDS.map(n=>`<label><input type="checkbox" name="needs" value="${n.k}">${n.i} ${n.t}</label>`).join('');
needDefaults();
window.addEventListener('hashchange',()=>{closeDlg();route();renderBell();renderAccount();});route();
if(DEMO){$('#demoBanner').hidden=false;document.querySelectorAll('[data-demo]').forEach(el=>el.hidden=false);$('#loginHint').textContent='גרסת הדגמה: לחצו "כניסה" גם בלי פרטים.';}
try{api=DEMO?demoApi():await firebaseApi();}catch(x){console.error(x);toast('החיבור לשרת נכשל');api=demoApi();}
enterBoard();renderReqMine();renderShabbat();renderBell();renderAccount();setInterval(()=>{renderShabbat();renderBell();},60000);
api.onAuth(u=>{u?startDash():stopDash();});

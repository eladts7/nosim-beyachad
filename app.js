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
let forceShabbat=false;
function isShabbat(){if(forceShabbat)return true;const w=shabbatWindow();const n=new Date();return n>=w.start&&n<w.end;}
const hhmm=d=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
/* שעת האיסוף האחרונה ביום שישי: שעתיים לפני הסגירה */
function fridayLastPickup(dateIso){const d=new Date(dateIso+'T12:00');return new Date(sunsetLocal(d).getTime()-150*6e4);}
function renderShabbat(){
  const on=isShabbat();$('#shabbat').hidden=!on;document.body.classList.toggle('is-shabbat',on);
  if(on){const w=shabbatWindow();$('#shabbatEnd').textContent=hhmm(w.end);}
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
    if(r.until&&s>r.until)break; if((r.days||[]).includes(String(d.getDay()))) out.push(s);}
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
  return out;
}

/* ===== שכבת נתונים ===== */
function demoApi(){
  const KEY='rides-v9-demo';let data=lsGet(KEY);if(!data||!data.requests)data=seed();
  const subs={drivers:[],requests:[]},authSubs=[];let user=null;
  const snap=c=>Object.entries(data[c]).map(([id,v])=>({id,...v}));
  const save=()=>{lsSet(KEY,data);for(const c in subs)subs[c].forEach(cb=>cb(snap(c)));};
  return {
    add:async(c,v)=>{const id=Math.random().toString(36).slice(2,10);data[c][id]=v;save();return id;},
    update:async(c,id,v)=>{Object.assign(data[c][id],v);save();},
    claim:async(id,check,patch)=>{const r=data.requests[id];if(!r||!check(r))throw new Error('taken');Object.assign(r,patch(r));save();},
    findDriverByPhone:async p=>{const e=Object.entries(data.drivers).find(([,d])=>cleanPhone(d.phone)===cleanPhone(p));return e?{id:e[0],...e[1]}:null;},
    listen:(c,cb)=>{subs[c].push(cb);cb(snap(c));return()=>{subs[c]=subs[c].filter(x=>x!==cb);};},
    watch:(c,id,cb)=>{const f=()=>cb(data[c][id]?{id,...data[c][id]}:null);subs[c].push(f);f();return()=>{subs[c]=subs[c].filter(x=>x!==f);};},
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
let requests=[],drivers=[],reqUnsub=null;
function ensureRequests(){
  if(reqUnsub) return;
  reqUnsub=api.listen('requests',l=>{requests=l;renderBoard();if(location.hash==='#community')renderCommunity();if(me&&driverTab==='rewards')renderRewards();renderReqMine();renderAdmin();},x=>{console.error(x);toast('בעיה בטעינת הנסיעות');});
}

/* ===== ניווט ===== */
const VIEWS=['home','need','drive','community','admin'];
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
  f.querySelectorAll('[data-once]').forEach(el=>el.hidden=sched!=='once');
  f.querySelectorAll('[data-weekly]').forEach(el=>el.hidden=sched!=='weekly');
  const needs=[...f.querySelectorAll('input[name=needs]:checked')].map(x=>x.value);
  $('#cogPanel').hidden=!NEEDS.some(n=>n.cog&&needs.includes(n.k));
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
    needs:fd.getAll('needs'),
    notes:s('notes'),status:'open',driverId:null,covers:{},createdAt:Date.now()};
  if(r.kind==='org'&&!r.orgName) return err.textContent='נא למלא את שם העמותה.';
  if(!r.contactName) return err.textContent='נא למלא שם איש קשר.';
  if(!validPhone(r.phone)) return err.textContent='מספר הטלפון לא תקין.';
  if(!r.fromCity||!r.toCity) return err.textContent='נא למלא עיר מוצא ועיר יעד.';
  if(!r.time) return err.textContent='נא לבחור שעת איסוף.';
  if(r.schedule==='once'){if(!r.date)return err.textContent='נא לבחור תאריך.';if(r.date<todayStr())return err.textContent='התאריך כבר עבר.';r.days=[];r.until='';
    const dw=new Date(r.date+'T12:00').getDay();
    if(dw===6)return err.textContent='🕯️ המערכת שומרת שבת. אי אפשר לפרסם נסיעה בשבת.';
    if(dw===5){const last=fridayLastPickup(r.date);if(r.time>hhmm(last))return err.textContent=`🕯️ ביום שישי אפשר לקבוע איסוף עד ${hhmm(last)}, כדי שהנהג/ת יספיק/תספיק לחזור לפני שבת.`;}}
  else{if(!r.days.length)return err.textContent='נא לבחור לפחות יום אחד בשבוע.';r.date='';
    if(r.days.includes('6'))return err.textContent='🕯️ המערכת שומרת שבת.';
    if(r.days.includes('5')){const nf=new Date();nf.setDate(nf.getDate()+((5-nf.getDay()+7)%7));const last=fridayLastPickup(localDateStr(nf));if(r.time>hhmm(last))return err.textContent=`🕯️ ביום שישי אפשר לקבוע איסוף עד ${hhmm(last)} בערך (משתנה לפי עונה).`;}}
  if(isCog(r)){const cTo=s('cogTo');if(!cTo)return err.textContent='בפגיעה קוגניטיבית חשוב לכתוב מי מקבל/ת את הנוסע/ת ביעד.';
    r.cog={alone:s('cogAlone')||'no',from:s('cogFrom'),to:cTo,comm:s('cogComm'),calm:s('cogCalm')};}
  const btn=f.querySelector('[type=submit]');btn.disabled=true;
  try{
    await api.add('requests',r);
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
function driverLine(d){
  if(!d) return '';
  return `<div class="driver-box">🚗 <b>${esc(d.driverName)}</b> · <span dir="ltr">${esc(d.driverPhone)}</span>${d.cover?' <span class="tag cover">חד-פעמי</span>':''}
    ${d.driverCar?`<div class="car">${esc(d.driverCar)}</div>`:''}</div>`;
}
function renderReqMine(){
  const has=!!reqPhone;
  $('#reqGate').hidden=has;$('#reqMine').hidden=!has;
  const mine=has?requests.filter(r=>cleanPhone(r.phone)===cleanPhone(reqPhone)&&r.status!=='cancelled'&&!isExpired(r)):[];
  const missing=mine.filter(r=>occDates(r,2).some(d=>!driverFor(r,d))).length;
  const cnt=$('#reqMineCnt');cnt.hidden=!missing;cnt.textContent=missing;
  if(!has) return;
  const org=mine.find(r=>r.kind==='org');
  $('#reqTitle').textContent=org?org.orgName:'הנסיעות שלנו';
  mine.sort((a,b)=>((occDates(a,1)[0]||'9')+a.time).localeCompare((occDates(b,1)[0]||'9')+b.time));
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
      <div class="actions"><button class="btn danger sm" data-act="reqCancel" data-id="${r.id}">ביטול הנסיעה</button></div>
    </article>`;}).join(''):'<div class="empty">אין נסיעות פעילות למספר הזה. אפשר לפרסם בלשונית "פרסום נסיעה".</div>';
}

/* ===== נהגים ===== */
const ME_KEY='rides-v5-me';
let me=lsGet(ME_KEY),meUnsub=null,vDraft=null,vDecl=false,driverTab='open',boardFilter='all';
const isVerified=()=>me?.verification?.status==='approved';
function enterBoard(){
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
  if(v.status==='pending'){box.innerHTML=`<div class="verify"><h2>⏳ המסמכים התקבלו ונבדקים</h2><div class="hint">בדרך כלל עד יומיים. בינתיים אפשר להסתכל על הלוח ולמלא את הפרופיל.</div></div>`;return;}
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
    languages:fd.getAll('languages'),experience:fd.getAll('experience'),firstAid:fd.get('firstAid')==='1',showInCommunity:fd.get('showInCommunity')==='1',area:s('area')||me.area,
    emergencyName:s('emergencyName'),emergencyPhone:s('emergencyPhone')};
  if(p.emergencyPhone&&!validPhone(p.emergencyPhone))return $('#profErr').textContent='טלפון החירום לא תקין.';
  try{await api.update('drivers',me.id,p);Object.assign(me,p);toast('הפרופיל נשמר ✓');renderVerify();renderBoard();}
  catch(x){console.error(x);toast('השמירה נכשלה');}
}

/* --- לוח --- */
function boardItems(){ return requests.filter(r=>!isExpired(r)&&nextOpenOcc(r)); }
function myItems(){
  const out=[];const t=todayStr();
  for(const r of requests){
    if(r.status==='taken'&&r.driverId===me.id) out.push({r,kind:r.schedule==='weekly'?'series':'once',date:occDates(r,1)[0]||r.date});
    for(const [date,c] of Object.entries(r.covers||{})) if(c.driverId===me.id&&date>=t&&!c.done&&r.status!=='cancelled') out.push({r,kind:'cover',date});
  }
  return out.sort((a,b)=>((a.date||'9')+a.r.time).localeCompare((b.date||'9')+b.r.time));
}
function needsTags(r){
  return [r.schedule==='weekly'?'<span class="tag weekly">🔁 קבוע</span>':'',r.kind==='org'?`<span class="tag org">${esc(r.orgName)}</span>`:'<span class="tag">אדם פרטי</span>',
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
  if(!isVerified()) btns=`<button class="btn ghost" disabled>🔒 אפשר לקחת אחרי אימות</button>`;
  else if(wk) btns=`<button class="btn brand" data-act="claimOnce" data-id="${r.id}" data-date="${nd}">רק ב${fmtDate(nd)}</button><button class="btn alt" data-act="claimSeries" data-id="${r.id}">כל שבוע, באופן קבוע</button>`;
  else btns=`<button class="btn brand" data-act="claimSeries" data-id="${r.id}">אני לוקח/ת</button>`;
  return `<article class="item">
    <div class="item-top"><span class="when">${wk?`${fmtDate(nd)} · ${esc(r.time)}`:whenText(r)}</span>${wk?`<span class="hint">${whenText(r)}</span>`:''}</div>
    ${routeHtml(r)}
    <div class="meta" style="gap:6px">${needsTags(r)}${wk?`<span class="tag seek">מחפשת נהג/ת קבוע/ה${covered?` · ${covered} שבועות קרובים מכוסים`:''}</span>`:''}</div>
    ${r.notes?`<div class="meta" style="margin-top:8px">💬 ${esc(r.notes)}</div>`:''}
    ${cogNotice(r,false)}
    <div class="actions">${warn}${btns}</div></article>`;
}
function mineCard({r,kind,date}){
  const label=kind==='series'?`כל שבוע · הבאה: ${fmtDate(date)} · ${esc(r.time)}`:`${fmtDate(date)} · ${esc(r.time)}`;
  const msg=`שלום ${r.contactName}, כאן ${me.name}, נהג/ת מתנדב/ת מ"${APP_NAME}". לקחתי את הנסיעה מ${r.fromCity} ל${r.toCity} ${kind==='series'?'(קבועה)':'ב'+fmtDate(date)}, בשעה ${r.time}. אשמח לתאם את הפרטים.`;
  const doneBtn=kind==='series'?'':`<button class="btn accent sm" data-act="${kind==='cover'?'coverDone':'done'}" data-id="${r.id}" data-date="${date}">✓ ביצעתי</button>`;
  const relBtn=`<button class="btn danger sm" data-act="${kind==='cover'?'coverRelease':'release'}" data-id="${r.id}" data-date="${date}">${kind==='series'?'לא יכול/ה להמשיך':'לא אוכל, להחזיר ללוח'}</button>`;
  return `<article class="item mine">
    <div class="item-top"><span class="when">${label}</span>${kind==='cover'?'<span class="tag cover">חד-פעמי</span>':kind==='series'?'<span class="tag weekly">🔁 קבוע שלי</span>':''}</div>
    ${routeHtml(r)}<div class="meta" style="gap:6px">${needsTags(r)}</div>
    ${r.notes?`<div class="meta" style="margin-top:8px">💬 ${esc(r.notes)}</div>`:''}
    ${cogNotice(r,true)}
    <div class="contact">📞 לתיאום: <b>${esc(r.contactName)}</b>${r.kind==='org'?` (${esc(r.orgName)})`:''} · <span class="num">${esc(r.phone)}</span>
      <div class="actions" style="margin-top:8px"><a class="btn wa sm" target="_blank" rel="noopener" href="${waLink(r.phone,msg)}">וואטסאפ</a><a class="btn ghost sm" href="tel:${esc(cleanPhone(r.phone))}">התקשרות</a></div></div>
    <div class="actions">${doneBtn}${relBtn}</div></article>`;
}
function renderBoard(){
  if(!me)return;
  const F={all:'הכל',area:'באזור שלי',once:'חד-פעמי',weekly:'קבוע'};
  $('#boardChips').innerHTML=Object.entries(F).map(([k,v])=>`<button class="chip ${k===boardFilter?'on':''}" data-act="bfilter" data-f="${k}">${v}</button>`).join('');
  const all=boardItems();let open=all;
  if(boardFilter==='area')open=open.filter(r=>areaMatch(me.area,r.fromCity)||areaMatch(me.area,r.toCity));
  if(boardFilter==='once'||boardFilter==='weekly')open=open.filter(r=>r.schedule===boardFilter);
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
    <div><b>${totalRides}</b><span>נסיעות עד היום</span></div>
    <div><b>${pool.length}</b><span>נהגים מאומתים</span></div>
    <div><b>${orgs}</b><span>עמותות פעילות</span></div>
  </div>
  ${star?`<div class="cm-hero"><div class="cm-hero-badge">🌟 נהג/ת השבוע</div>
    <div class="cm-hero-row"><div class="rw-avatar">${esc(star.w.name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</div>
    <div><div class="rw-name">${esc(shortName(star.w))}</div><div class="rw-sub">${esc(cityOf(star.w))} · ${star.w.type==='taxi'?'נהג/ת מונית':'מתנדב/ת עם רכב פרטי'}</div></div></div>
    <p class="cm-quote">״${esc((star.w.thanks||[])[0]?.text||'תודה שאת/ה שם בשבילנו כל שבוע.')}״</p>
    <div class="cm-why">${star.c.i} ${esc(star.c.t)}: ${esc(star.c.why(star.w))}</div></div>`:''}
  <h3>🏅 המצטיינים השבוע, כל אחד מסיבה אחרת</h3>
  <div class="cm-cats">${winners.slice(1).map(({c,w})=>`<div class="cm-cat"><div class="cm-cat-i">${c.i}</div><div><b>${esc(c.t)}</b><div class="cm-cat-n">${esc(shortName(w))} · ${esc(cityOf(w))}</div><div class="hint">${esc(c.why(w))}</div></div></div>`).join('')}
    ${newest?`<div class="cm-cat"><div class="cm-cat-i">🌱</div><div><b>הצטרפות השבוע</b><div class="cm-cat-n">${esc(shortName(newest))} · ${esc(cityOf(newest))}</div><div class="hint">ברוכים הבאים! כבר ${newest.pastRides||0} נסיעות ראשונות</div></div></div>`:''}</div>
  <h3>👋 הכירו את</h3>
  <div class="cm-spot">
    <div class="cm-spot-card"><div class="cm-spot-tag">עמותה</div><b>עמותת בית חם</b>
      <p>מפעילה דירות בקהילה לאנשים עם מוגבלות שכלית. בזכות נהגים מתנדבים, הדיירים מגיעים כל שבוע לבתי ההורים ולטיפולים.</p></div>
    <div class="cm-spot-card"><div class="cm-spot-tag">נהג</div><b>${esc(shortName(commDrivers.find(d=>d.id==='d2')||{name:'אבי פ'}))}, נהג מונית</b>
      <p>״התחלתי בנסיעה אחת ביום שקט. היום יש לי שלוש נסיעות קבועות, ואני מכיר את הנוסעים בשמם.״</p></div>
  </div>
  <h3>📰 מה חדש</h3>
  <div class="cm-news">
    <div><span class="cm-date">השבוע</span>עמותה חדשה הצטרפה ופרסמה 4 נסיעות קבועות ראשונות.</div>
    <div><span class="cm-date">השבוע</span>נוספה אפשרות לכסות שבוע אחד בנסיעה קבועה, עד שנמצא נהג קבוע.</div>
    <div><span class="cm-date">החודש</span>שותף ראשון להטבות: קפה ומאפה לנהגים אחרי 10 נסיעות (לדוגמה).</div>
  </div>
  <p class="hint" style="text-align:center;margin-top:18px">נהגים מופיעים כאן רק בהסכמתם, עם שם פרטי ועיר בלבד. בגרסת ההדגמה התוכן לדוגמה.</p>`;
}


/* ===== עריכת נסיעה (ניהול) ===== */
let adminAdding=false,editId=null;
function openEdit(id){
  const r=requests.find(x=>x.id===id);if(!r)return;editId=id;
  const c=r.cog||{};const f=(n,l,v,extra='')=>`<div class="field"><label class="lbl">${l}</label><input name="${n}" value="${esc(v||'')}" ${extra}></div>`;
  $('#editBody').innerHTML=`<div class="me" style="margin-bottom:6px"><h2 style="margin:0">עריכת נסיעה</h2><button class="btn ghost sm" type="button" data-act="closeEdit">סגירה</button></div>
  <form id="editForm" novalidate>
    <div class="seg"><label><input type="radio" name="kind" value="org" ${r.kind==='org'?'checked':''}>עמותה / מסגרת</label><label><input type="radio" name="kind" value="private" ${r.kind!=='org'?'checked':''}>אדם פרטי</label></div>
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
  f.orgName.closest('.field').hidden=f.kind.value!=='org';
}
const closeEdit=()=>{$('#editBg').classList.remove('open');editId=null;};
async function saveEdit(e){
  e.preventDefault();const f=e.target,fd=new FormData(f),err=$('#editErr');err.textContent='';
  const s=k=>String(fd.get(k)||'').trim();
  const u={kind:s('kind'),orgName:s('orgName'),contactName:s('contactName'),phone:cleanPhone(s('phone')),fromCity:s('fromCity'),fromPlace:s('fromPlace'),
    toCity:s('toCity'),toPlace:s('toPlace'),schedule:s('schedule'),date:s('date'),days:fd.getAll('days'),until:s('until'),time:s('time'),
    passengers:Math.max(1,parseInt(fd.get('passengers'),10)||1),needs:fd.getAll('needs'),notes:s('notes')};
  if(u.kind==='org'&&!u.orgName)return err.textContent='נא למלא שם עמותה.';
  if(!u.contactName||!validPhone(u.phone))return err.textContent='נא לבדוק את איש הקשר והטלפון.';
  if(!u.fromCity||!u.toCity||!u.time)return err.textContent='נא למלא עיר מוצא, עיר יעד ושעה.';
  if(u.schedule==='once'){if(!u.date)return err.textContent='נא לבחור תאריך.';if(new Date(u.date+'T12:00').getDay()===6)return err.textContent='🕯️ אי אפשר לקבוע נסיעה בשבת.';u.days=[];u.until='';}
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
  adminOn=true;$('#loginBox').hidden=true;$('#dash').hidden=false;
  if(reqUnsub){reqUnsub();reqUnsub=null;}ensureRequests();
  drvUnsub=api.listen('drivers',l=>{drivers=l;renderAdmin();},x=>{console.error(x);$('#dashErr').textContent='אין הרשאה. ודאו שהמשתמש מוגדר כמנהל.';});
}
function stopDash(){adminOn=false;if(drvUnsub){drvUnsub();drvUnsub=null;}drivers=[];$('#dash').hidden=true;$('#loginBox').hidden=false;}
function renderAdmin(){
  if(!adminOn)return;
  const live=requests.filter(r=>!isExpired(r)&&r.status!=='cancelled'&&r.status!=='done');
  const uncovered=live.filter(r=>occDates(r,1).some(d=>!driverFor(r,d))).length;
  const vs=d=>d.verification?.status||'none';
  $('#stats').innerHTML=`<div class="stat ${uncovered?'hot':''}"><div class="n">${uncovered}</div><div class="t">נסיעה קרובה בלי נהג</div></div>
    <div class="stat"><div class="n">${live.filter(r=>r.schedule==='weekly'&&r.status==='open').length}</div><div class="t">קבועות שמחפשות נהג קבוע</div></div>
    <div class="stat"><div class="n">${drivers.filter(d=>d.active&&vs(d)==='approved').length}</div><div class="t">נהגים מאומתים</div></div>
    <div class="stat ${drivers.some(d=>vs(d)==='pending')?'hot':''}"><div class="n">${drivers.filter(d=>vs(d)==='pending').length}</div><div class="t">ממתינים לאימות</div></div>`;
  const F={open:'פעילות',missing:'בלי נהג',expired:'עבר מועדן',done:'בוצעו',cancelled:'בוטלו',all:'הכל'};
  $('#aChips').innerHTML=Object.entries(F).map(([k,v])=>`<button class="chip ${k===aFilter?'on':''}" data-act="afilter" data-f="${k}">${v}</button>`).join('');
  let l=requests.filter(r=>{
    if(aFilter==='all')return true;
    if(aFilter==='expired')return isExpired(r)&&(r.status==='open'||r.status==='taken');
    if(aFilter==='open')return (r.status==='open'||r.status==='taken')&&!isExpired(r);
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
    <div class="meta" style="margin-top:6px"><span>מבקש/ת: <b>${esc(r.contactName)}</b> · ${esc(who(r))} · <span dir="ltr">${esc(r.phone)}</span></span>
      ${r.driverName&&r.status==='taken'?`<span>🚗 קבוע/ה: <b>${esc(r.driverName)}</b> · <span dir="ltr">${esc(r.driverPhone)}</span></span>`:''}</div>
    ${occ.length&&(r.status==='open'||r.status==='taken')?`<div class="occ">${occ.map(d=>{const dr=driverFor(r,d);return dr?`<div class="got"><span>${fmtDate(d)}</span><span>✓ ${esc(dr.driverName)}${dr.cover?' (חד-פעמי)':''}</span></div>`:`<div class="miss"><span>${fmtDate(d)}</span><span>⚠️ אין נהג</span></div>`;}).join('')}</div>`:''}
    ${r.notes?`<div class="meta" style="margin-top:6px">💬 ${esc(r.notes)}</div>`:''}
    <div class="actions">
      <button class="btn ghost sm" data-act="aedit" data-id="${r.id}">✏️ עריכה</button>
      ${r.status==='open'||r.status==='taken'?`<button class="btn danger sm" data-act="acancel" data-id="${r.id}">ביטול</button>`:`<button class="btn ghost sm" data-act="areopen" data-id="${r.id}">החזרה ללוח</button>`}
      ${r.status==='taken'?`<button class="btn ghost sm" data-act="release" data-id="${r.id}">שחרור הנהג הקבוע</button>`:''}
    </div></article>`;}).join(''):'<div class="empty">אין נסיעות בסינון הזה.</div>';

  const pendingN=drivers.filter(d=>vs(d)==='pending').length;
  const DF={pending:`ממתינים לאימות (${pendingN})`,approved:'מאומתים',none:'טרם הגישו',all:'הכל'};
  $('#dChips').innerHTML=Object.entries(DF).map(([k,v])=>`<button class="chip ${k===dFilter?'on':''}" data-act="dfilter" data-f="${k}">${v}</button>`).join('');
  const dl=drivers.filter(d=>dFilter==='all'||vs(d)===dFilter||(dFilter==='none'&&vs(d)==='rejected')).sort((a,b)=>(b.active-a.active)||((b.verification?.submittedAt||0)-(a.verification?.submittedAt||0)));
  const rideCount=(id,st)=>requests.filter(r=>r.driverId===id&&r.status===st).length+(st==='done'?requests.reduce((n,r)=>n+Object.values(r.covers||{}).filter(c=>c.driverId===id&&c.done).length,0):0);
  $('#aDrvList').innerHTML=dl.length?dl.map(d=>{const v=d.verification||{status:'none'};
    const expired=Object.keys(DOCS).filter(k=>docExpired(k,v.docs?.[k]));
    const thumbs=v.docs?`<div class="thumbs">${Object.entries(DOCS).map(([k,def])=>{const x=v.docs[k];if(!x)return `<div class="thumb warn"><div class="noimg">—</div>${def.title}<br>חסר</div>`;
      const isImg=x.url&&String(x.type||'').startsWith('image/'),date=x[def.dateKey],exp=docExpired(k,x);
      const inner=`${isImg?`<img src="${esc(x.url)}" alt="">`:'<div class="noimg">📄</div>'}${def.title}<br>${def.dateLabel}: <b style="color:${exp?'var(--danger)':'inherit'}">${date?esc(date.split('-').reverse().join('/')):'—'}</b>`;
      return isImg?`<button class="thumb ${exp?'warn':''}" data-act="showDoc" data-src="${esc(x.url)}">${inner}</button>`
        :(x.url&&!x.url.startsWith('data:')?`<a class="thumb ${exp?'warn':''}" href="${esc(x.url)}" target="_blank" rel="noopener" style="text-decoration:none">${inner}</a>`:`<div class="thumb ${exp?'warn':''}">${inner}</div>`);}).join('')}</div>`:'';
    const prof=[carDesc(d)&&`🚗 ${esc(carDesc(d))}`,d.trunk&&'מקום לכיסא מתקפל',(d.languages||[]).length&&`🗣️ ${esc(d.languages.join(', '))}`,(d.experience||[]).length&&`🤝 ${esc(d.experience.join(', '))}`,d.firstAid&&'⛑️ עזרה ראשונה',d.emergencyName&&`🆘 ${esc(d.emergencyName)} <span dir="ltr">${esc(d.emergencyPhone)}</span>`].filter(Boolean);
    return `<article class="item ${d.active?'':'inactive'}">
    <div class="item-top"><span class="when">${esc(d.name)} <span class="tag">${d.type==='taxi'?'נהג/ת מונית':'אזרח/ית'}</span></span><span class="badge v-${v.status}">${VSTATUS[v.status]}</span></div>
    <div class="meta" style="margin-top:6px"><span>📍 ${esc(d.area)}</span><span dir="ltr">${esc(d.phone)}</span>${d.accessible?'<span class="tag">♿ נגיש</span>':''}
      <span>נסיעות קבועות: <b>${rideCount(d.id,'taken')}</b></span><span>בוצעו: <b>${rideCount(d.id,'done')}</b></span>
      ${expired.length?`<span class="tag need">⚠️ פג תוקף: ${expired.map(k=>DOCS[k].title).join(', ')}</span>`:''}</div>
    ${prof.length?`<div class="meta" style="margin-top:6px">${prof.map(x=>`<span>${x}</span>`).join('')}</div>`:''}
    ${v.status==='rejected'&&v.note?`<div class="meta" style="margin-top:6px">סיבת דחייה: ${esc(v.note)}</div>`:''}
    ${thumbs}
    ${v.status==='pending'?`<div class="reject-row"><button class="btn accent sm" data-act="approve" data-id="${d.id}">✓ אישור הנהג/ת</button><input type="text" data-reason placeholder="סיבה לדחייה (תוצג לנהג/ת)"><button class="btn danger sm" data-act="reject" data-id="${d.id}">החזרה לתיקון</button></div>`:''}
    <div class="actions">${v.status==='approved'?`<input type="text" data-reason placeholder="סיבה" style="max-width:200px"><button class="btn ghost sm" data-act="reject" data-id="${d.id}">ביטול אימות</button>`:''}
      <button class="btn ${d.active?'ghost':'accent'} sm" data-act="toggleDriver" data-id="${d.id}">${d.active?'השהיה':'הפעלה'}</button></div></article>`;}).join(''):'<div class="empty">אין נהגים בסינון הזה.</div>';
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
      toast('הנסיעה שלך! עכשיו להתקשר לתיאום');goMine();break;}
    case 'claimOnce':{
      if(!isVerified()){toast('צריך להשלים אימות לפני שלוקחים נסיעה');return;}
      if(!armed(el,'לאשר? לחצו שוב'))return;el.disabled=true;
      try{await api.claim(id,d=>d.status==='open'&&!(d.covers||{})[date],d=>({covers:{...(d.covers||{}),[date]:{...meInfo(),at:Date.now()}}}));}
      catch(x){toast('מישהו/י כבר לקח/ה את המועד הזה 🙂');return;}
      toast(`לקחת את ${fmtDate(date)}. תודה! 💛`);goMine();break;}
    case 'done':await api.update('requests',id,{status:'done',doneAt:Date.now()});toast('תודה רבה! 🎉');break;
    case 'coverDone':{const r=reqById(id);await api.update('requests',id,{covers:{...r.covers,[date]:{...r.covers[date],done:true}}});toast('תודה רבה! 🎉');break;}
    case 'release':if(!armed(el,'בטוח/ה? לחצו שוב'))return;await api.update('requests',id,RELEASE);toast('הנסיעה חזרה ללוח');break;
    case 'coverRelease':{if(!armed(el,'בטוח/ה? לחצו שוב'))return;const r=reqById(id);const c={...r.covers};delete c[date];await api.update('requests',id,{covers:c});toast('המועד חזר ללוח');break;}
    case 'driverOut':me=null;lsSet(ME_KEY,null);enterBoard();break;
    case 'demoDriver':me={id:'d1',name:'אורית לוי',phone:'052-1234567'};enterBoard();toast('נכנסת כאורית, נהגת מאומתת (דוגמה)');break;
    case 'demoOrg':reqPhone='035551234';lsSet(REQ_KEY,reqPhone);renderReqMine();break;
    case 'reqOut':reqPhone=null;lsSet(REQ_KEY,null);renderReqMine();break;
    case 'reqCancel':if(!armed(el,'לבטל? לחצו שוב'))return;await api.update('requests',id,{status:'cancelled'});toast('הנסיעה בוטלה');break;
    case 'previewShabbat':forceShabbat=true;renderShabbat();break;
    case 'exitShabbat':forceShabbat=false;renderShabbat();break;
    case 'resetDemo':if(!armed(el,'בטוח? לחצו שוב'))return;api.reset();me=null;lsSet(ME_KEY,null);reqPhone=null;lsSet(REQ_KEY,null);enterBoard();renderReqMine();toast('נתוני ההדגמה אופסו');break;
    case 'atab':aTab=el.dataset.tab;setTabs('atab',aTab,{reqs:'#aReqPane',drvs:'#aDrvPane'});break;
    case 'afilter':aFilter=el.dataset.f;renderAdmin();break;
    case 'dfilter':dFilter=el.dataset.f;renderAdmin();break;
    case 'adminAdd':adminAdding=true;location.hash='#need';setTabs('ntab','post',{post:'#nPost',mine:'#nMine'});$('#adminAddNote').hidden=false;break;
    case 'cancelAdminAdd':adminAdding=false;$('#adminAddNote').hidden=true;break;
    case 'aedit':openEdit(id);break;
    case 'closeEdit':closeEdit();break;
    case 'acancel':if(!armed(el,'לבטל? לחצו שוב'))return;await api.update('requests',id,{status:'cancelled'});break;
    case 'areopen':await api.update('requests',id,{...RELEASE});break;
    case 'toggleDriver':{const d=drivers.find(x=>x.id===id);await api.update('drivers',id,{active:!d.active});break;}
    case 'approve':{const d=drivers.find(x=>x.id===id);await api.update('drivers',id,{verification:{...d.verification,status:'approved',approvedAt:Date.now(),note:''}});toast(`${d.name} אומת/ה ✅`);break;}
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
    case 'logout':await api.logout();break;
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
document.addEventListener('submit',e=>{if(e.target.id==='editForm')saveEdit(e);});
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
window.addEventListener('hashchange',route);route();
if(DEMO){$('#demoBanner').hidden=false;document.querySelectorAll('[data-demo]').forEach(el=>el.hidden=false);$('#loginHint').textContent='גרסת הדגמה: לחצו "כניסה" גם בלי פרטים.';}
try{api=DEMO?demoApi():await firebaseApi();}catch(x){console.error(x);toast('החיבור לשרת נכשל');api=demoApi();}
enterBoard();renderReqMine();renderShabbat();setInterval(renderShabbat,60000);
api.onAuth(u=>{u?startDash():stopDash();});

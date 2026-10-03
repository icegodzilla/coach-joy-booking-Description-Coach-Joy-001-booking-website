const CONFIG={
  supabaseUrl:"https://ocngkvafjfdnvnhzrsgj.supabase.co",
  supabaseAnonKey:"sb_publishable_YUwdBmImnimtIj5aef-84Q_wOQWusP_",
  timezone:"Africa/Lagos",
  availableDays:[1,3,5],
  slots:[{start:"16:00",end:"16:30"},{start:"16:30",end:"17:00"}],
  emailjs:{
    publicKey:"Wp3T3-MvfU-Su8HjW",
    serviceId:"service_m3erd4h",
    studentTemplateId:"template_7cfh13j",
    coachTemplateId:"template_u39k52g",
    coachEmail:"theonlycoachjoy001@gmail.com"
  }
};
const hasBackend=CONFIG.supabaseUrl.startsWith("http"),sb=hasBackend?supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseAnonKey):null;
let viewDate=new Date();viewDate.setDate(1);let selectedDate=null,booked=new Set();
const calendar=document.getElementById("calendar"),slotPanel=document.getElementById("slotPanel"),monthTitle=document.getElementById("monthTitle");
const pad=n=>String(n).padStart(2,"0");
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const prettyDate=s=>{let [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})};
const prettyTime=t=>{let [h,m]=t.split(":").map(Number);let d=new Date(2000,0,1,h,m);return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})};
const isPast=s=>s<new Intl.DateTimeFormat("en-CA",{timeZone:CONFIG.timezone}).format(new Date());
const key=(d,t)=>`${d}T${t}`;
async function loadBookings(){
booked=new Set();
if(!hasBackend){render();return}
const y=viewDate.getFullYear(),m=viewDate.getMonth()+1,last=new Date(y,m,0),from=`${y}-${pad(m)}-01`,to=`${y}-${pad(m)}-${pad(last.getDate())}`;
const {data,error}=await sb.rpc("get_booked_slots",{p_from:from,p_to:to});
if(error){console.error("Could not load booked slots",error);render();return}
const localKey=iso=>{
  const d=new Date(iso);
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:CONFIG.timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d).reduce((o,p)=>(o[p.type]=p.value,o),{});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
(data||[]).forEach(x=>booked.add(localKey(x.slot_start)));render()
}
function render(){
monthTitle.textContent=viewDate.toLocaleDateString("en-US",{month:"long",year:"numeric"});calendar.innerHTML="";
const first=new Date(viewDate.getFullYear(),viewDate.getMonth(),1).getDay(),days=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,0).getDate();
for(let i=0;i<first;i++){let e=document.createElement("div");e.className="day muted";calendar.appendChild(e)}
for(let n=1;n<=days;n++){
let d=new Date(viewDate.getFullYear(),viewDate.getMonth(),n),s=dateKey(d),ok=CONFIG.availableDays.includes(d.getDay())&&!isPast(s),full=CONFIG.slots.every(x=>booked.has(key(s,x.start)));
let e=document.createElement("div");e.className="day"+(!ok?" disabled":"")+(selectedDate===s?" selected":"");e.innerHTML=`<div class="day-number">${n}</div>${ok?`<div class="day-status ${full?"booked":""}">${full?"Booked":"Available"}</div>`:""}`;
if(ok)e.onclick=()=>{selectedDate=s;render();showSlots()};calendar.appendChild(e)
}
showSlots()
}
function showSlots(){
if(!selectedDate){slotPanel.innerHTML='<div class="slot-placeholder">Select an available date to see the time slots.</div>';return}
let wrap=document.createElement("div");wrap.className="slots";
CONFIG.slots.forEach(x=>{let k=key(selectedDate,x.start),b=booked.has(k),el=document.createElement("button");el.type="button";el.className="slot"+(b?" booked":"");el.disabled=b;el.innerHTML=`<div class="slot-time">${prettyTime(x.start)} to ${prettyTime(x.end)}</div><div class="slot-state">${b?"Booked":"Available"}</div>`;if(!b)el.onclick=()=>openBooking(selectedDate,x);wrap.appendChild(el)});
slotPanel.innerHTML="";slotPanel.appendChild(wrap)
}
function openBooking(d,x){
document.getElementById("selectedSlotTitle").textContent=`${prettyDate(d)} · ${prettyTime(x.start)} to ${prettyTime(x.end)}`;
document.getElementById("slotStart").value=key(d,x.start);document.getElementById("formError").hidden=true;document.getElementById("bookingDialog").showModal()
}
document.getElementById("prevMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()-1);loadBookings()};
document.getElementById("nextMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()+1);loadBookings()};
document.getElementById("closeBooking").onclick=()=>document.getElementById("bookingDialog").close();
document.getElementById("closeSuccess").onclick=()=>document.getElementById("successDialog").close();
document.getElementById("bookingForm").onsubmit=async e=>{
e.preventDefault();let btn=document.getElementById("confirmBooking"),err=document.getElementById("formError");btn.disabled=true;btn.textContent="Confirming…";err.hidden=true;
try{
if(!hasBackend)throw Error("The live booking backend has not been connected yet.");
let slot=document.getElementById("slotStart").value,name=document.getElementById("name").value.trim(),email=document.getElementById("email").value.trim(),whatsapp=document.getElementById("whatsapp").value.trim();
let {data,error}=await sb.rpc("create_booking",{p_name:name,p_email:email,p_whatsapp:whatsapp,p_slot_start:slot+":00+01:00"});
if(error)throw error;
if(data?.error)throw Error(data.error);
booked.add(slot);
await sendEmails({name,email,whatsapp,slotStart:slot});
document.getElementById("bookingDialog").close();e.target.reset();render();document.getElementById("successDialog").showModal()
}catch(x){err.textContent=x.message||"Something went wrong. Please try another slot.";err.hidden=false}
finally{btn.disabled=false;btn.innerHTML="Confirm booking <span>↗</span>"}
};
async function sendEmails({name,email,whatsapp,slotStart}){
  const ejs=CONFIG.emailjs;
  if(!ejs.publicKey.startsWith("YOUR_")){
    emailjs.init({publicKey:ejs.publicKey});
    const [date,time]=slotStart.split("T");
    const pretty=prettyDate(date);
    const start=time.slice(0,5);
    const end=start==="16:00"?"16:30":"17:00";
    const vars={name,email,whatsapp,date:pretty,time:`${prettyTime(start)} to ${prettyTime(end)}`,coach_email:ejs.coachEmail};
    await emailjs.send(ejs.serviceId,ejs.studentTemplateId,{...vars,to_email:email,recipient_email:email});
    await emailjs.send(ejs.serviceId,ejs.coachTemplateId,{...vars,to_email:ejs.coachEmail,recipient_email:ejs.coachEmail});
  }
}
loadBookings();
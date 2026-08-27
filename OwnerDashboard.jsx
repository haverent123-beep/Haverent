import {useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import Navbar from "../components/Navbar";
import {API_BASE,getToken,getUser} from "../auth";

export default function OwnerDashboard(){
 const navigate=useNavigate(); const user=getUser();
 const [properties,setProperties]=useState([]); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [success,setSuccess]=useState("");
 const emptyForm={title:"",type:"House",location:"",rent:"",description:"",image:"",contact:"",latitude:"",longitude:""};
 const [form,setForm]=useState(emptyForm);
 const [photos,setPhotos]=useState([]);
 const [paymentOpen,setPaymentOpen]=useState(false); const [paymentDone,setPaymentDone]=useState(false); const [paymentOrderId,setPaymentOrderId]=useState(""); const [paymentId,setPaymentId]=useState(""); const [paying,setPaying]=useState(false);
 useEffect(()=>{ if(!user || !["owner","landlord"].includes(String(user.role||user.userType||"").toLowerCase())) navigate("/login",{replace:true}); },[]);
 async function load(){
   try{
     const token=getToken();
     const headers={Accept:"application/json",...(token?{Authorization:`Bearer ${token}`}:{})};
     const r=await fetch(`${API_BASE}/api/properties`,{headers});
     const d=await r.json();
     if(!r.ok) throw new Error(d?.message||d?.error||`Could not load properties (${r.status})`);
     const arr=Array.isArray(d)?d:(d.properties||d.data||[]);
     const ownerId=user?.id || user?._id || user?.userId;
     const ownerEmail=String(user?.email||"").toLowerCase();
     const mine=arr.filter(p=>{
       const raw=p?.ownerId ?? p?.owner_id ?? p?.owner;
       const pid=raw && typeof raw === "object" ? (raw._id ?? raw.id ?? raw.userId) : raw;
       const pem=String(p?.ownerEmail || p?.owner_email || (raw && typeof raw === "object" ? raw.email : "") || "").toLowerCase();
       if(ownerId && pid && String(pid)===String(ownerId)) return true;
       if(ownerEmail && pem && pem===ownerEmail) return true;
       return !pid && !pem;
     });
     setProperties(mine);
   }catch(err){setError(err.message||"Could not load your properties.");}
 }
 useEffect(()=>{load()},[]);
 function change(e){setForm({...form,[e.target.name]:e.target.value});}
 function handlePhotos(e){
   const files=Array.from(e.target.files||[]).slice(0,8);
   Promise.all(files.map(file=>new Promise((resolve,reject)=>{
     const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file);
   }))).then(setPhotos).catch(()=>setError("Could not read selected photos."));
 }
 async function add(e){
  e.preventDefault(); setError("");setSuccess("");
  if(!paymentDone || !paymentOrderId || !paymentId){ setPaymentOpen(true); setError("Please complete the verified ₹250 property-upload payment before uploading."); return; }
  setLoading(true);
  try{
   const token=getToken();
   const r=await fetch(`${API_BASE}/api/properties`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({...form,rent:Number(form.rent),images:photos,image:photos[0]||form.image,ownerId:user?.id || user?._id || user?.userId,ownerEmail:user?.email,paymentOrderId,paymentId})});
   let d={};try{d=await r.json()}catch{}
   if(!r.ok) throw new Error(d.message||d.error||`Upload failed (${r.status})`);
   setSuccess("Property uploaded successfully!"); setForm(emptyForm); setPhotos([]); setPaymentDone(false); setPaymentOrderId(""); setPaymentId(""); setPaymentOpen(false); load();
  }catch(err){setError(err.message||"Could not upload property.");}finally{setLoading(false);}
 }
 return <><Navbar/><main className="dashboard">
  <div className="dashboard-heading"><span className="eyebrow">OWNER DASHBOARD</span><h1>Manage your properties.</h1><p>Welcome{user?.name?`, ${user.name}`:""} — add and manage your rental listings here.</p></div>
  <div className="dashboard-grid"><div className="dashboard-card"><span>Total listings</span><strong>{properties.length}</strong></div><div className="dashboard-card"><span>Property views</span><strong>0</strong></div><div className="dashboard-card"><span>Inquiries</span><strong>0</strong></div></div>
  <section className="dashboard-card" style={{marginTop:24}}><h2>Add a property</h2><form onSubmit={add} style={{display:"grid",gap:12,marginTop:16}}>
   <input name="title" value={form.title} onChange={change} placeholder="Property title" required/>
   <select name="type" value={form.type} onChange={change}><option>House</option><option>Flat</option><option>PG</option><option>Room</option></select>
   <input name="location" value={form.location} onChange={change} placeholder="Full property address / location" required/>
   <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
    <input name="latitude" value={form.latitude} onChange={change} placeholder="Latitude (optional)" inputMode="decimal"/>
    <input name="longitude" value={form.longitude} onChange={change} placeholder="Longitude (optional)" inputMode="decimal"/>
   </div>
   <input name="rent" value={form.rent} onChange={change} type="number" min="0" placeholder="Monthly rent ₹" required/>
   <input name="contact" value={form.contact} onChange={change} placeholder="Owner contact number" type="tel" required/>
   <label style={{display:"grid",gap:8}}>
    <span><strong>Property photos</strong> <small>(up to 8)</small></span>
    <input type="file" accept="image/*" multiple onChange={handlePhotos}/>
   </label>
   {photos.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{photos.map((src,i)=><img key={i} src={src} alt={`Property ${i+1}`} style={{width:"100%",height:90,objectFit:"cover",borderRadius:10}}/>)}</div>}
   <textarea name="description" value={form.description} onChange={change} placeholder="Description" rows="4"/>
   <div style={{border:"1px solid rgba(212,175,55,.35)",borderRadius:16,padding:16,background:"rgba(212,175,55,.06)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <div><strong>Property upload fee: ₹250</strong><div style={{fontSize:13,opacity:.75,marginTop:4}}>Secure payment is required before submitting this listing.</div></div>
      <button type="button" className="owner-button" disabled={paying} onClick={async()=>{
        setError(""); setPaymentOpen(true); setPaying(true);
        try {
          const token=getToken();
          const r=await fetch(`${API_BASE}/api/payments/create-order`,{method:"POST",headers:{Accept:"application/json",Authorization:`Bearer ${token}`} });
          const d=await r.json(); if(!r.ok) throw new Error(d.message||"Could not create payment order");
          if(!window.Razorpay){ const script=document.createElement("script"); script.src="https://checkout.razorpay.com/v1/checkout.js"; script.onload=()=>window.dispatchEvent(new Event("razorpay-ready")); document.body.appendChild(script); await new Promise(resolve=>window.addEventListener("razorpay-ready",resolve,{once:true})); }
          const options={key:d.keyId,amount:d.amount,currency:d.currency,name:"HavenRent",description:"Property listing upload fee",order_id:d.orderId,prefill:{name:user?.name||"",email:user?.email||"",contact:form.contact||""},theme:{color:"#111827"},handler:async(response)=>{
            try{
              const vr=await fetch(`${API_BASE}/api/payments/verify`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(response)});
              const vd=await vr.json(); if(!vr.ok) throw new Error(vd.message||"Payment verification failed");
              setPaymentOrderId(vd.orderId); setPaymentId(vd.paymentId); setPaymentDone(true); setSuccess("₹250 payment verified. You can now upload the property.");
            }catch(err){setPaymentDone(false);setError(err.message||"Payment verification failed.");}
          },modal:{ondismiss:()=>setError("Payment window closed. No property was uploaded.")}};
          const rz=new window.Razorpay(options); rz.on("payment.failed",resp=>setError(resp?.error?.description||"Payment failed")); rz.open();
        } catch(err){setError(err.message||"Could not start payment.");} finally {setPaying(false);}
      }}>{paying?"Opening payment…":paymentDone?"Payment verified ✓":"Pay ₹250 securely"}</button>
    </div>
    {paymentOpen&&<div style={{marginTop:12,fontSize:13,opacity:.78}}>{paymentDone?"Payment verified by HavenRent server. Upload is unlocked.":"Razorpay Checkout supports UPI and other enabled payment methods. Complete the ₹250 payment in the secure checkout window."}</div>}
   </div>
   {error&&<p style={{color:"#c0392b"}}>{error}</p>}{success&&<p style={{color:"#168a4a"}}>{success}</p>}
   <button className="owner-button" disabled={loading || !paymentDone}>{loading?"Uploading…":paymentDone?"Upload Property":"Complete ₹250 payment first"}</button>
  </form></section>
  {properties.length>0&&<section style={{marginTop:24}}><h2>Your listings</h2><div className="dashboard-grid" style={{marginTop:12}}>{properties.map((p,i)=><div className="dashboard-card" key={p._id||p.id||i}><strong>{p.title||p.name||"Property"}</strong><span>{p.location||"—"} · ₹{p.rent||0}</span></div>)}</div></section>}
 </main></>
}

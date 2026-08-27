import {useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {authRequest,dashboardPath,saveAuth} from "../auth";

export default function Register(){
  const navigate=useNavigate();
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [role,setRole]=useState("customer");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function submit(e){
    e.preventDefault();
    setError("");
    if(!name.trim() || !email.trim() || password.length<6){
      setError("Please enter your name, a valid email and a password of at least 6 characters.");
      return;
    }
    setLoading(true);
    try{
      const data=await authRequest("/api/auth/register",{
        name:name.trim(),
        email:email.trim(),
        password,
        role
      });
      const saved=saveAuth(data,{name:name.trim(),email:email.trim(),role});
      // Always move to the dashboard after a successful account creation.
      navigate(dashboardPath(saved.user || {role:"customer"}),{replace:true});
    }catch(err){
      setError(err.message || "Unable to create account. Please try again.");
    }finally{setLoading(false);}
  }

  return <main className="auth-page"><div className="auth-card">
    <div className="auth-logo"><span>H</span>HavenRent</div>
    <h1>Create account</h1><p>Join HavenRent today.</p>
    <form onSubmit={submit}>
      <label>Full name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoComplete="name" required/>
      <label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required/>
      <label>Account type</label><select value={role} onChange={e=>setRole(e.target.value)}><option value="customer">Customer</option><option value="owner">Owner — List properties</option></select>\n      <label>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Create password" autoComplete="new-password" required/>
      {error && <p style={{color:"#c0392b",margin:"8px 0"}}>{error}</p>}
      <button className="primary-full" disabled={loading}>{loading?"Creating account…":"Create account"}</button>
    </form>
    <div className="auth-bottom">Already have an account? <Link to="/login">Login</Link></div>
  </div></main>
}

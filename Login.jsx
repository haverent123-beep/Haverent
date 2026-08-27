import {useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {authRequest,dashboardPath,saveAuth} from "../auth";

export default function Login(){
  const navigate=useNavigate();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [role,setRole]=useState("customer");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function submit(e){
    e.preventDefault(); setError(""); setLoading(true);
    try{
      const data=await authRequest("/api/auth/login",{
        email:email.trim(),
        password
      });
      const saved=saveAuth(data,{email:email.trim(),role});
      navigate(dashboardPath(saved.user || {role:"customer"}),{replace:true});
    }catch(err){setError(err.message || "Login failed. Please check your details.");}
    finally{setLoading(false);}
  }

  return <main className="auth-page"><div className="auth-card">
    <div className="auth-logo"><span>H</span>HavenRent</div>
    <h1>Welcome back</h1><p>Login to continue to HavenRent.</p>
    <form onSubmit={submit}>
      <label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required/>
      <label>Account type</label><select value={role} onChange={e=>setRole(e.target.value)}><option value="customer">Customer</option><option value="owner">Owner</option></select>\n      <label>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••" autoComplete="current-password" required/>
      {error && <p style={{color:"#c0392b",margin:"8px 0"}}>{error}</p>}
      <button className="primary-full" disabled={loading}>{loading?"Logging in…":"Login"}</button>
    </form>
    <div className="auth-bottom">Don't have an account? <Link to="/register">Create one</Link></div>
  </div></main>
}

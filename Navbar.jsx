import {useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {Menu,X,UserRound,PlusCircle,LogOut} from "lucide-react";
import {motion,AnimatePresence} from "framer-motion";
import {getUser,dashboardPath} from "../auth";

export default function Navbar(){
 const[open,setOpen]=useState(false); const navigate=useNavigate(); const user=getUser();
 const isOwner=["owner","landlord"].includes(String(user?.role||user?.userType||"").toLowerCase());
 const dash=dashboardPath(user||{role:"customer"});
 function logout(){localStorage.removeItem("haverent_token");localStorage.removeItem("haverent_user");navigate("/login",{replace:true});}
 return <header className="navbar"><div className="nav-container">
  <Link to="/" className="logo"><span className="logo-icon">H</span><span>Haven<span>Rent</span></span></Link>
  <nav className="desktop-nav"><Link to="/">Home</Link><Link to="/properties">Properties</Link><a href="#how-it-works">How it works</a><a href="#owners">For Owners</a></nav>
  <div className="nav-actions">
   <Link to={dash} className="login-btn"><UserRound size={17}/>{isOwner?"Owner Dashboard":"Dashboard"}</Link>
   {isOwner ? <Link to="/owner/dashboard" className="post-btn"><PlusCircle size={17}/>Add Property</Link> : <Link to="/register" className="post-btn"><PlusCircle size={17}/>List Property</Link>}
   {user && <button type="button" className="login-btn" onClick={logout}><LogOut size={16}/>Logout</button>}
  </div>
  <button className="mobile-menu-btn" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
 </div>
 <AnimatePresence>{open&&<motion.div className="mobile-menu" initial={{opacity:0,y:-15}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-15}}>
  <Link onClick={()=>setOpen(false)} to="/">Home</Link><Link onClick={()=>setOpen(false)} to="/properties">Properties</Link>
  <Link onClick={()=>setOpen(false)} to={dash}>{isOwner?"Owner Dashboard":"Dashboard"}</Link>
  {isOwner&&<Link onClick={()=>setOpen(false)} to="/owner/dashboard">Add Property</Link>}
  {!user&&<Link onClick={()=>setOpen(false)} to="/login">Login</Link>}
  {user&&<button onClick={logout}>Logout</button>}
 </motion.div>}</AnimatePresence>
 </header>
}
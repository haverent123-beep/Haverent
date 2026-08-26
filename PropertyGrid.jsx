import {useEffect,useState} from "react";import PropertyCard from "./PropertyCard";import {api} from "../lib/api";
export default function PropertyGrid(){const [properties,setProperties]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
useEffect(()=>{api("/api/properties").then(d=>setProperties(d.properties||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
if(loading)return <div className="property-grid"><p>Loading homes...</p></div>;
if(error)return <div className="property-grid"><p>{error}</p></div>;
if(!properties.length)return <div className="property-grid"><p>No properties listed yet.</p></div>;
return <div className="property-grid">{properties.map(p=><PropertyCard key={p._id} property={{...p,id:p._id,price:p.rent,beds:p.beds||0,baths:p.baths||0,location:p.location||p.city||"India",image:p.image||"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80"}}/>)}</div>}

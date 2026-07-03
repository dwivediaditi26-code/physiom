// AuthScreen.jsx — Login · Register · Forgot Password
// Integrates with Supabase Auth. Matches PhysioMind purple/mauve design.

import React, { useState } from "react";
import { supabase } from "./supabase.js";
import { PrivacyPolicy, TermsOfService } from "./LegalPages.jsx";

const A="#7c3aed",BG="#faf8fc",SUR="#ffffff",BD="#d8cce8",TX="#1a1025",MU="#7e6a9a",S2="#f5f0fb",RE="#dc2626",GR="#059669";
const inp={width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${BD}`,background:S2,color:TX,fontSize:"0.88rem",fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color 0.15s"};
const btnS={width:"100%",padding:"12px",borderRadius:10,background:`linear-gradient(135deg,${A},#9333ea)`,color:"#fff",fontSize:"0.9rem",fontWeight:700,border:"none",cursor:"pointer",fontFamily:"inherit",transition:"opacity 0.15s",letterSpacing:"0.2px"};
const lbl={fontSize:"0.72rem",fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.8px",display:"block",marginBottom:5};
const link={background:"none",border:"none",color:A,fontWeight:700,cursor:"pointer",fontSize:"0.78rem"};

function FocusInput({label,type="text",value,onChange,placeholder,autoFocus,required}){
  const [f,setF]=React.useState(false);
  return(<div style={{marginBottom:16}}>
    <label style={lbl}>{label}</label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder} autoFocus={autoFocus} required={required}
      style={{...inp,borderColor:f?A:BD}} onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>
  </div>);
}

function Toast({msg,type}){
  if(!msg)return null;
  const err=type==="error";
  return(<div style={{padding:"10px 14px",borderRadius:8,fontSize:"0.8rem",marginBottom:16,
    background:err?"#fef2f2":"#f0fdf4",border:`1px solid ${err?"#fca5a5":"#86efac"}`,
    color:err?RE:GR,fontWeight:600,lineHeight:1.5}}>{err?"⚠ ":"✓ "}{msg}</div>);
}

function Login({onSwitch,onAuth}){
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const submit=async(e)=>{
    e.preventDefault();setError("");setLoading(true);
    const{error:er}=await supabase.auth.signInWithPassword({email,password:pass});
    setLoading(false);
    if(er){setError(er.message);return;}
    const{data}=await supabase.auth.getSession();
    onAuth(data.session?.user);
  };
  return(<form onSubmit={submit}>
    <Toast msg={error} type="error"/>
    <FocusInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@clinic.com" autoFocus required/>
    <FocusInput label="Password" type="password" value={pass} onChange={setPass} placeholder="••••••••" required/>
    <div style={{textAlign:"right",marginTop:-10,marginBottom:18}}>
      <button type="button" onClick={()=>onSwitch("forgot")} style={{...link,fontSize:"0.75rem"}}>Forgot password?</button>
    </div>
    <button type="submit" style={{...btnS,opacity:loading?0.7:1}} disabled={loading}>{loading?"Signing in…":"Sign in →"}</button>
    <p style={{textAlign:"center",marginTop:18,fontSize:"0.78rem",color:MU}}>
      No account?{" "}<button type="button" onClick={()=>onSwitch("register")} style={link}>Create free account</button>
    </p>
  </form>);
}

function Register({onSwitch,onAuth}){
  const [name,setName]=useState("");
  const [clinic,setClinic]=useState("");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [msg,setMsg]=useState("");
  const submit=async(e)=>{
    e.preventDefault();setError("");setMsg("");setLoading(true);
    if(pass.length<6){setError("Password must be at least 6 characters");setLoading(false);return;}
    const{data,error:er}=await supabase.auth.signUp({email,password:pass,options:{data:{full_name:name,clinic_name:clinic}}});
    setLoading(false);
    if(er){setError(er.message);return;}
    if(data.session){onAuth(data.user);}
    else{setMsg("Account created! Check your email to confirm, then sign in.");}
  };
  return(<form onSubmit={submit}>
    <Toast msg={error} type="error"/>
    <Toast msg={msg} type="success"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div><label style={lbl}>Your name</label>
        <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Dr. Aditi" autoFocus required
          style={{...inp,marginBottom:16}}/></div>
      <div><label style={lbl}>Clinic name</label>
        <input type="text" value={clinic} onChange={e=>setClinic(e.target.value)} placeholder="My Physio Clinic"
          style={{...inp,marginBottom:16}}/></div>
    </div>
    <FocusInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@clinic.com" required/>
    <FocusInput label="Password (min 6 chars)" type="password" value={pass} onChange={setPass} placeholder="Create a strong password" required/>
    <button type="submit" style={{...btnS,opacity:loading?0.7:1}} disabled={loading}>{loading?"Creating…":"Create free account →"}</button>
    <p style={{textAlign:"center",marginTop:18,fontSize:"0.78rem",color:MU}}>
      Already have an account?{" "}<button type="button" onClick={()=>onSwitch("login")} style={link}>Sign in</button>
    </p>
  </form>);
}

function Forgot({onSwitch}){
  const [email,setEmail]=useState("");
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState("");
  const [error,setError]=useState("");
  const submit=async(e)=>{
    e.preventDefault();setError("");setMsg("");setLoading(true);
    const{error:er}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/?reset=1"});
    setLoading(false);
    if(er){setError(er.message);return;}
    setMsg("Reset link sent! Check your inbox.");
  };
  return(<form onSubmit={submit}>
    <Toast msg={error} type="error"/>
    <Toast msg={msg} type="success"/>
    <FocusInput label="Your email address" type="email" value={email} onChange={setEmail} placeholder="you@clinic.com" autoFocus required/>
    <button type="submit" style={{...btnS,opacity:loading?0.7:1}} disabled={loading}>{loading?"Sending…":"Send reset link →"}</button>
    <p style={{textAlign:"center",marginTop:18,fontSize:"0.78rem",color:MU}}>
      <button type="button" onClick={()=>onSwitch("login")} style={link}>← Back to sign in</button>
    </p>
  </form>);
}

export default function AuthScreen({onAuth}){
  const [legal,setLegal]=React.useState(null); // "privacy" | "terms" | null
  const [view,setView]=useState("login");
  const T={login:{h:"Welcome back",sub:"Sign in to your PhysioMind account"},register:{h:"Start free",sub:"Create your clinical workspace"},forgot:{h:"Reset password",sub:"We'll send a reset link to your email"}};
  const {h,sub}=T[view];
  return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif"}}>
      <div style={{width:"100%",maxWidth:420}}>
        {/* Brand */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:56,height:56,borderRadius:16,margin:"0 auto 14px",background:`linear-gradient(135deg,${A},#9333ea)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",boxShadow:`0 8px 24px ${A}35`}}>🫁</div>
          <div style={{fontWeight:800,fontSize:"1.5rem",color:TX,letterSpacing:"-0.5px"}}>PhysioMind</div>
          <div style={{fontSize:"0.7rem",color:MU,marginTop:3,letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>Posture Screening & Education</div>
        </div>
        {/* Card */}
        <div style={{background:SUR,borderRadius:20,padding:"28px 28px 24px",border:`1px solid ${BD}`,boxShadow:`0 4px 32px rgba(124,58,237,0.08)`}}>
          <h1 style={{fontSize:"1.2rem",fontWeight:800,color:TX,marginBottom:4,letterSpacing:"-0.3px"}}>{h}</h1>
          <p style={{fontSize:"0.78rem",color:MU,marginBottom:22}}>{sub}</p>
          {view==="login"    && <Login    onSwitch={setView} onAuth={onAuth}/>}
          {view==="register" && <Register onSwitch={setView} onAuth={onAuth}/>}
          {view==="forgot"   && <Forgot   onSwitch={setView}/>}
        </div>
        {/* Trust badges */}
        <div style={{display:"flex",justifyContent:"center",gap:10,marginTop:20,flexWrap:"wrap"}}>
          {["🔒 Secure","🏥 HIPAA-ready","🇮🇳 Built for India","✦ Free to start"].map(t=>(
            <span key={t} style={{fontSize:"0.65rem",color:MU,background:SUR,padding:"4px 10px",borderRadius:20,border:`1px solid ${BD}`,fontWeight:600}}>{t}</span>
          ))}
        </div>
        <p style={{textAlign:"center",marginTop:14,fontSize:"0.65rem",color:MU}}>
          By signing in you agree to our{" "}
          <button type="button" onClick={()=>setLegal("terms")} style={{background:"none",border:"none",color:A,fontWeight:600,cursor:"pointer",fontSize:"0.65rem",padding:0}}>Terms</button>
          {" "}&amp;{" "}
          <button type="button" onClick={()=>setLegal("privacy")} style={{background:"none",border:"none",color:A,fontWeight:600,cursor:"pointer",fontSize:"0.65rem",padding:0}}>Privacy Policy</button>
        </p>
      </div>
      {legal==="privacy" && <PrivacyPolicy onClose={()=>setLegal(null)}/>}
      {legal==="terms"   && <TermsOfService onClose={()=>setLegal(null)}/>}
    </div>
  );
}

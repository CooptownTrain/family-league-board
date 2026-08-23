/* ===================== ACCOUNTS + CROSS-DEVICE SYNC =====================
   Email sign-in (magic link, no passwords) with per-person boards.

   DESIGN RULE: the board must never stop working. Auth and sync are additive.
   If you are signed out, offline, or the service is down, everything falls back
   to this browser's own storage and the draft continues as normal. Nothing here
   can block a pick.
   ====================================================================== */
const SUPA_URL = window.FL_SUPABASE_URL || '';
const SUPA_KEY = window.FL_SUPABASE_KEY || '';
const SYNC = { on:false, user:null, client:null, saving:false, lastPush:0, err:null };

const KEYS = ['fl_taken','fl_mine','fl_slot','fl_owner','fl_setup'];
function localSnapshot(){
  const o={}; KEYS.forEach(k=>o[k]=localStorage.getItem(k)); return o;
}
function applySnapshot(o){
  if(!o) return false;
  let changed=false;
  KEYS.forEach(k=>{ if(o[k]!==undefined && o[k]!==null && o[k]!==localStorage.getItem(k)){
    localStorage.setItem(k,o[k]); changed=true; } });
  return changed;
}

async function syncInit(){
  if(!SUPA_URL || !SUPA_KEY){ syncBadge('local only — no account set up'); return; }
  try{
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    SYNC.client = createClient(SUPA_URL, SUPA_KEY);
    const { data:{ session } } = await SYNC.client.auth.getSession();
    if(session){ await syncSignedIn(session.user); }
    else syncBadge('not signed in');
    SYNC.client.auth.onAuthStateChange((_e, s)=>{
      if(s?.user) syncSignedIn(s.user); else syncSignedOut();
    });
  }catch(e){
    SYNC.err=e.message;
    syncBadge('offline — this browser only');   // never blocks the draft
  }
}
async function syncSignedIn(user){
  SYNC.on=true; SYNC.user=user;
  syncBadge(user.email);
  try{
    const { data, error } = await SYNC.client
      .from('boards').select('state, updated_at').eq('user_id', user.id).maybeSingle();
    if(error) throw error;
    const mineTouched = !!localStorage.getItem('fl_setup');
    if(data?.state && !mineTouched){ if(applySnapshot(data.state)) location.reload(); }
    else if(data?.state && mineTouched){
      // both sides have something: newest wins, and say so rather than silently picking
      const remoteAt = data.updated_at? Date.parse(data.updated_at) : 0;
      const localAt  = +(localStorage.getItem('fl_touched')||0);
      if(remoteAt > localAt){ if(applySnapshot(data.state)) location.reload(); }
      else syncPush();
    } else syncPush();
  }catch(e){ SYNC.err=e.message; syncBadge(user.email+' · sync paused'); }
}
function syncSignedOut(){ SYNC.on=false; SYNC.user=null; syncBadge('not signed in'); }

let pushTimer=null;
function syncPush(){
  localStorage.setItem('fl_touched', Date.now());
  if(!SYNC.on || !SYNC.client) return;
  clearTimeout(pushTimer);
  pushTimer=setTimeout(async ()=>{
    try{
      await SYNC.client.from('boards').upsert({
        user_id: SYNC.user.id, email: SYNC.user.email,
        state: localSnapshot(), updated_at: new Date().toISOString()
      }, { onConflict:'user_id' });
      SYNC.lastPush=Date.now(); syncBadge(SYNC.user.email);
    }catch(e){ SYNC.err=e.message; syncBadge(SYNC.user.email+' · not saved'); }
  }, 900);
}
async function syncSignIn(email){
  if(!SYNC.client){ alert('Accounts are not set up on this copy. Your board still works — it just stays on this device.'); return; }
  const { error } = await SYNC.client.auth.signInWithOtp({
    email, options:{ emailRedirectTo: location.href.split('#')[0] } });
  return error? error.message : null;
}
async function syncSignOut(){ if(SYNC.client) await SYNC.client.auth.signOut(); }
function syncBadge(txt){
  const el=document.getElementById('acct'); if(!el) return;
  const signedIn = SYNC.on && SYNC.user;
  if(signedIn){
    // put the signed-in person's name on the board itself, not just in the strip
    const nm = (localStorage.getItem('fl_owner')||'').trim()
            || (SYNC.user.email||'').split('@')[0];
    const w=document.getElementById('whose');
    if(w) w.textContent = nm ? nm.charAt(0).toUpperCase()+nm.slice(1)+"'s Board" : 'Draft Board';
    el.innerHTML = `<span class="acctdot on"></span>
      <span class="accttxt" title="${txt}">${txt}</span>
      <button id="acctout" class="acctbtn">Sign out</button>`;
  } else {
    el.innerHTML = `<span class="acctdot"></span>
      <span class="accttxt">${txt}</span>
      <button id="acctin" class="acctbtn">Sign in</button>`;
  }
  const i=document.getElementById('acctin');
  if(i) i.onclick=()=>document.getElementById('loginwrap').classList.add('open');
  const o=document.getElementById('acctout');
  if(o) o.onclick=async()=>{
    if(!confirm('Sign out? Your board stays saved on this device.')) return;
    await syncSignOut(); location.reload(); };
}

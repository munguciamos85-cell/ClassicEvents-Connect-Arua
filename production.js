/* Classic Events Connect — Production mode
   Requires Supabase. No demo/local-browser data is used for accounts, providers,
   events, bookings, reviews, messages or notifications. */
(function(){
  const B=window.CECBackend||{};
  const sb=B.client;
  const configured=!!(B.configured&&sb);
  window.CECProduction={configured};
  const toast=m=>window.showToast?showToast(m):alert(m);
  function need(){ if(!configured){toast('Connect Classic Events Connect to Supabase first. This production version does not use demo/local-browser accounts.'); modal?.('admin'); return true;} return false; }
  async function currentUser(){ if(!configured)return null; const r=await sb.auth.getUser(); return r.data?.user||null; }
  async function profile(){ const u=await currentUser(); if(!u)return null; const r=await sb.from('profiles').select('*').eq('id',u.id).maybeSingle(); return r.data||null; }
  async function upload(file,folder){
    if(!file)return '';
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
    const u=await currentUser(); if(!u) throw new Error('Please log in first.'); const path=u.id+'/'+folder+'/'+crypto.randomUUID()+'.'+ext;
    const r=await sb.storage.from('provider-media').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
    if(r.error) throw r.error;
    return sb.storage.from('provider-media').getPublicUrl(path).data.publicUrl;
  }
  async function loadProviders(){
    if(!configured)return [];
    const r=await sb.from('providers').select('*').order('created_at',{ascending:false});
    if(r.error){toast(r.error.message);return [];} return r.data||[];
  }
  async function loadEvents(){
    if(!configured)return [];
    const r=await sb.from('events').select('*').order('date',{ascending:true,nullsFirst:false});
    if(r.error){toast(r.error.message);return [];} return r.data||[];
  }
  async function loadBookings(){
    if(!configured)return [];
    const r=await sb.from('bookings').select('*').order('created_at',{ascending:false});
    if(r.error)return []; return r.data||[];
  }
  async function loadReviews(){
    if(!configured)return [];
    const r=await sb.from('reviews').select('*').order('created_at',{ascending:false}).limit(30);
    return r.data||[];
  }
  async function loadNotifications(){
    const u=await currentUser(); if(!u)return [];
    const r=await sb.from('notifications').select('*').eq('user_id',u.id).order('created_at',{ascending:false}).limit(30);
    return r.data||[];
  }
  async function refresh(){
    if(!configured){ updateStatus(); return; }
    const [ps,es,bs,rs,ns,p]=await Promise.all([loadProviders(),loadEvents(),loadBookings(),loadReviews(),loadNotifications(),profile()]);
    window.__CEC_REMOTE={providers:ps,events:es,bookings:bs,reviews:rs,notifications:ns,profile:p};
    renderRemote();
  }
  function renderRemote(){
    const d=window.__CEC_REMOTE||{};
    const ps=d.providers||[], es=d.events||[], bs=d.bookings||[], rs=d.reviews||[], ns=d.notifications||[];
    window.getProviders=()=>ps; window.getEvents=()=>es; window.getBookings=()=>bs; window.getReviews=()=>rs; window.getNotifications=()=>ns;
    const set=(id,v)=>{const x=document.getElementById(id);if(x)x.textContent=v};
    set('dashEvents',es.length);set('dashBookings',bs.length);set('dashProviders',ps.length);set('dashFavs',(JSON.parse(localStorage.getItem('classicFavorites')||'[]').length)+' saved providers');
    const p=d.profile; set('dashUser',p?(p.name+' • '+(p.type||'Member')):'Sign in to personalize your dashboard');
    if(window.renderProviderMarketplace) window.renderProviderMarketplace();
    if(window.renderEvents) window.renderEvents();
    if(window.renderBookings) window.renderBookings();
    if(window.renderReviews) window.renderReviews();
    if(window.renderNotifications) window.renderNotifications();
    if(window.renderAdmin) window.renderAdmin();
    if(window.runSiteSearch) window.runSiteSearch();
  }
  function updateStatus(){
    const el=document.getElementById('backendStatus'); if(!el)return;
    el.innerHTML=configured?'🟢 <b>Production backend connected</b> — cloud accounts, projects, bookings and media are enabled.':'🟠 <b>Backend not connected</b> — production mode is waiting for your Supabase URL and anon key.';
  }
  async function createProviderProd(e){
    e.preventDefault(); if(need())return;
    const u=await currentUser(); if(!u){closeAll();modal('login');toast('Please log in first.');return;}
    try{
      const pf=document.getElementById('providerPhotoFile')?.files?.[0];
      const photo=pf?await upload(pf,'profiles'):document.getElementById('providerPhoto').value.trim();
      const projectFiles=[1,2,3,4].map(n=>document.getElementById('providerProjectFile'+n)?.files?.[0]).filter(Boolean);
      const images=[]; for(const f of projectFiles) images.push(await upload(f,'projects'));
      const videos=[1,2,3,4].map(n=>document.getElementById('providerVideo'+n)?.value.trim()).filter(Boolean);
      const row={owner_id:u.id,name:document.getElementById('providerName').value.trim(),type:document.getElementById('providerType').value,photo,project_videos:videos,location:document.getElementById('providerLocation').value.trim(),price:document.getElementById('providerPrice').value.trim(),contact:document.getElementById('providerContact').value.trim(),description:document.getElementById('providerDescription').value.trim(),projects:[1,2,3,4].map(n=>document.getElementById('providerProject'+n).value.trim()).filter(Boolean),project_images:images,status:'pending'};
      const r=await sb.from('providers').insert(row).select('id').single(); if(r.error)throw r.error;
      if(images.length){ const media=images.map((image_url,i)=>({provider_id:r.data.id,owner_id:u.id,image_url,sort_order:i+1})); const mr=await sb.from('project_media').insert(media); if(mr.error)throw mr.error; }
      e.target.reset();closeAll();toast('Profile submitted. It is now waiting for admin approval.');await refresh();
    }catch(err){toast(err.message||'Could not save the provider profile.');}
  }
  async function saveEventProd(e){
    e.preventDefault();if(need())return;
    try { const u=await currentUser();if(!u){closeAll();modal('login');toast('Please log in first.');return;}
      const row={owner_id:u.id,name:document.getElementById('eventName').value.trim(),date:document.getElementById('eventDate').value||null,time:document.getElementById('eventTime').value,city:document.getElementById('eventCity').value.trim(),type:document.getElementById('eventType').value,fee:document.getElementById('eventFee').value.trim(),target:document.getElementById('eventTarget').value.trim(),description:document.getElementById('eventDescription').value.trim(),status:'pending'};
      const r=await sb.from('events').insert(row);if(r.error)throw r.error;e.target.reset();closeAll();toast('Event submitted for approval.');await refresh();
    } catch(err){toast(err?.message||'Could not submit event. Please try again.');}
  }
  async function saveBookingProd(e){
    e.preventDefault();if(need())return;
    try { const u=await currentUser();if(!u){closeAll();modal('login');toast('Please log in first.');return;}
      const id=Number(document.getElementById('bookingProviderId').value),p=(window.__CEC_REMOTE?.providers||[]).find(x=>Number(x.id)===id);
      if(!p){toast('Provider not found. Refresh the page and choose an available provider.');return;}
      const row={customer_id:u.id,provider_id:id,provider_name:p.name,provider_type:p.type,customer:document.getElementById('bookingCustomer').value.trim(),contact:document.getElementById('bookingContact').value.trim(),event:document.getElementById('bookingEvent').value.trim(),date:document.getElementById('bookingDate').value||null,time:document.getElementById('bookingTime').value,location:document.getElementById('bookingLocation').value.trim(),budget:document.getElementById('bookingBudget').value.trim(),message:document.getElementById('bookingMessage').value.trim(),status:'pending'};
      const r=await sb.from('bookings').insert(row);if(r.error)throw r.error;e.target.reset();closeAll();toast('Booking request sent to '+p.name+'.');await refresh();
    } catch(err){toast(err?.message||'Could not send booking request. Please try again.');}
  }
  async function saveReviewProd(e){
    e.preventDefault();if(need())return;
    try { const u=await currentUser();if(!u){closeAll();modal('login');toast('Please log in first.');return;}
      const row={reviewer_id:u.id,provider_name:document.getElementById('reviewProvider').value.trim(),rating:Number(document.getElementById('reviewRating').value),text:document.getElementById('reviewText').value.trim()};
      const r=await sb.from('reviews').insert(row);if(r.error)throw r.error;e.target.reset();closeAll();toast('Review published.');await refresh();
    } catch(err){toast(err?.message||'Could not submit review. Please try again.');}
  }
  async function loginProd(e){e.preventDefault();if(need())return;try{const email=document.getElementById('loginEmail').value.trim(),pass=document.getElementById('loginPassword').value;if(!email.includes('@')){toast('Please enter the email address you registered with.');return;}const r=await sb.auth.signInWithPassword({email,password:pass});if(r.error)throw r.error;e.target.reset();closeAll();toast('Welcome back!');await refresh();}catch(err){toast(err?.message||'Login failed. Please try again.');}}
  async function signupProd(e){e.preventDefault();if(need())return;try{const name=document.getElementById('signupName').value.trim(),email=document.getElementById('signupContact').value.trim(),type=document.getElementById('signupType').value,pass=document.getElementById('signupPassword').value;if(!email.includes('@')){toast('Please use a valid email address. Phone numbers cannot be used for email/password registration.');return;}const r=await sb.auth.signUp({email,password:pass,options:{data:{name,type}}});if(r.error)throw r.error;if(r.data.user){const p=await sb.from('profiles').upsert({id:r.data.user.id,name,contact:email,type});if(p.error)throw p.error;}e.target.reset();closeAll();toast(r.data.session?'Account created!':'Account created. Check your email to verify it.');await refresh();}catch(err){toast(err?.message||'Could not create account. Please try again.');}}
  async function signOutProd(){if(!configured)return;await sb.auth.signOut();window.__CEC_REMOTE={providers:[],events:[],bookings:[],reviews:[],notifications:[],profile:null};toast('Signed out.');renderRemote();}
  window.getProviders=()=>window.__CEC_REMOTE?.providers||[];
  window.getEvents=()=>window.__CEC_REMOTE?.events||[];
  window.getBookings=()=>window.__CEC_REMOTE?.bookings||[];
  window.getReviews=()=>window.__CEC_REMOTE?.reviews||[];
  window.getNotifications=()=>window.__CEC_REMOTE?.notifications||[];
  window.createAccount=signupProd; window.loginLocal=loginProd; window.saveProvider=createProviderProd; window.saveEvent=saveEventProd; window.saveBooking=saveBookingProd; window.saveReview=saveReviewProd;
  window.CECProduction.refresh=refresh; window.CECProduction.signOut=signOutProd; window.CECProduction.updateStatus=updateStatus;
  document.addEventListener('DOMContentLoaded',async()=>{
    // Inline legacy declarations occur later in index.html; rebind production handlers here
    // so every form uses the authenticated cloud workflow rather than local demo handlers.
    window.createAccount=signupProd; window.loginLocal=loginProd; window.saveProvider=createProviderProd;
    window.saveEvent=saveEventProd; window.saveBooking=saveBookingProd; window.saveReview=saveReviewProd;
    updateStatus();
    if(configured){await refresh();if(sb.auth.onAuthStateChange)sb.auth.onAuthStateChange(()=>setTimeout(refresh,100));}
  });
})();

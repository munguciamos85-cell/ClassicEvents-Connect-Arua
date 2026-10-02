/* Classic Events Connect real backend bridge.
   Uses Supabase Auth + Postgres when supabase-config.js is configured.
   Production bridge. The production UI overrides local/demo fallbacks and requires Supabase. */
(function(){
  const url=window.CEC_SUPABASE_URL, key=window.CEC_SUPABASE_ANON_KEY;
  const configured=!!(url&&key&&!url.includes('YOUR_SUPABASE')&&!key.includes('YOUR_SUPABASE'));
  let client=null;
  if(configured && window.supabase) client=window.supabase.createClient(url,key);
  window.CECBackend={configured,client};
  const toast=m=>window.showToast?showToast(m):alert(m);
  async function user(){ if(!client) return null; const {data}=await client.auth.getUser(); return data?.user||null; }
  async function signup(e){
    const name=document.getElementById('signupName').value.trim(), contact=document.getElementById('signupContact').value.trim(), type=document.getElementById('signupType').value, pass=document.getElementById('signupPassword').value;
    if(!contact.includes('@')) return toast('For real accounts, please use an email address.');
    const {data,error}=await client.auth.signUp({email:contact,password:pass,options:{data:{name,type}}});
    if(error) return toast(error.message);
    if(data.user) await client.from('profiles').upsert({id:data.user.id,name,contact,type});
    e.target.reset(); closeAll(); toast(data.session?'Account created!':'Account created. Check your email to verify it.');
  }
  async function login(e){
    const email=document.getElementById('loginEmail').value.trim(), pass=document.getElementById('loginPassword').value;
    if(!email.includes('@')) return toast('Use the email address you registered with.');
    const {data,error}=await client.auth.signInWithPassword({email,password:pass});
    if(error) return toast(error.message);
    const {data:p}=await client.from('profiles').select('*').eq('id',data.user.id).single();
    if(p){localStorage.setItem('classicAccount',JSON.stringify({...p,password:undefined}));}
    localStorage.setItem('classicLoggedIn','true'); e.target.reset(); closeAll(); renderAdvanced(); toast('Welcome back!');
  }
  async function createProvider(e){
    const u=await user(); if(!u) return toast('Please login before creating a provider profile.');
    const row={owner_id:u.id,name:document.getElementById('providerName').value.trim(),type:document.getElementById('providerType').value,photo:document.getElementById('providerPhoto').value.trim(),location:document.getElementById('providerLocation').value.trim(),price:document.getElementById('providerPrice').value.trim(),contact:document.getElementById('providerContact').value.trim(),description:document.getElementById('providerDescription').value.trim(),projects:[1,2,3,4].map(n=>document.getElementById('providerProject'+n).value.trim()).filter(Boolean),status:'pending'};
    const {error}=await client.from('providers').insert(row); if(error) return toast(error.message); e.target.reset(); closeAll(); toast('Provider application submitted for approval.');
  }
  async function createBooking(e){
    const u=await user(); if(!u) return toast('Please login before booking.');
    const id=Number(document.getElementById('bookingProviderId').value), p=getProviders().find(x=>x.id===id);
    const row={customer_id:u.id,provider_id:id,provider_name:p?.name||'Provider',provider_type:p?.type||'',customer:document.getElementById('bookingCustomer').value.trim(),contact:document.getElementById('bookingContact').value.trim(),event:document.getElementById('bookingEvent').value.trim(),date:document.getElementById('bookingDate').value||null,time:document.getElementById('bookingTime').value,location:document.getElementById('bookingLocation').value.trim(),budget:document.getElementById('bookingBudget').value.trim(),message:document.getElementById('bookingMessage').value.trim(),status:'pending'};
    const {error}=await client.from('bookings').insert(row); if(error) return toast(error.message); e.target.reset(); closeAll(); toast('Booking request sent!');
  }
  async function createEvent(e){
    const u=await user(); if(!u) return toast('Please login before creating an event.');
    const row={owner_id:u.id,name:document.getElementById('eventName').value.trim(),date:document.getElementById('eventDate').value||null,time:document.getElementById('eventTime').value,city:document.getElementById('eventCity').value.trim(),type:document.getElementById('eventType').value,fee:document.getElementById('eventFee').value.trim(),target:document.getElementById('eventTarget').value.trim(),description:document.getElementById('eventDescription').value.trim(),status:'pending'};
    const {error}=await client.from('events').insert(row); if(error) return toast(error.message); e.target.reset(); closeAll(); toast('Event submitted!');
  }
  async function createReview(e){
    const u=await user(); if(!u) return toast('Please login before reviewing.');
    const row={reviewer_id:u.id,provider_name:document.getElementById('reviewProvider').value.trim(),rating:Number(document.getElementById('reviewRating').value),text:document.getElementById('reviewText').value.trim()};
    const {error}=await client.from('reviews').insert(row); if(error) return toast(error.message); e.target.reset(); closeAll(); toast('Review submitted!');
  }

  async function isAdmin(){ if(!client) return false; const u=await user(); if(!u) return false; const {data}=await client.from('user_roles').select('role').eq('user_id',u.id).in('role',['admin','moderator']).maybeSingle(); return !!data; }
  async function adminProviderAction(id,action){
    if(!(await isAdmin())) return toast('Admin access required.');
    const patch=action==='approve'?{status:'approved'}:action==='reject'?{status:'rejected'}:action==='suspend'?{status:'suspended'}:action==='restore'?{status:'approved'}:action==='verify'?{verified:true}:action==='removePhoto'?{photo:''}:{verified:false};
    const {error}=await client.from('providers').update(patch).eq('id',id); if(error) return toast(error.message); toast('Provider updated.');
  }
  async function adminLoadStats(){
    if(!(await isAdmin())) return {authorized:false};
    const [u,p,b,e]=await Promise.all([client.from('profiles').select('id',{count:'exact',head:true}),client.from('providers').select('id,status',{count:'exact'}),client.from('bookings').select('id',{count:'exact',head:true}),client.from('events').select('id',{count:'exact',head:true})]);
    return {authorized:true,users:u.count||0,providers:p.count||0,bookings:b.count||0,events:e.count||0,pending:(p.data||[]).filter(x=>x.status==='pending').length};
  }
  Object.assign(window.CECBackend,{isAdmin,adminProviderAction,adminLoadStats});

  // Website content CRUD used by the admin Banners & Products forms.
  // Database row-level security remains responsible for authorizing writes.
  async function saveSiteContent(table,item){
    if(!client) return {ok:false,message:'Supabase is not connected. Check supabase-config.js and reload the site.'};
    if(!['site_banners','site_products'].includes(table)) return {ok:false,message:'Unsupported content type.'};
    const row = table==='site_banners' ? {
      title:String(item.title||'').trim(), description:String(item.description||''),
      image:String(item.image||''), video:String(item.video||''), link:String(item.link||''), active:true
    } : {
      name:String(item.name||'').trim(), description:String(item.description||''),
      category:String(item.category||''), price:String(item.price||''), contact:String(item.contact||''),
      image:String(item.image||''), video:String(item.video||''), link:String(item.link||''), active:true
    };
    if(!row.title && !row.name) return {ok:false,message:'Please enter a title or product name.'};
    try {
      const {data,error}=await client.from(table).insert(row).select('*').single();
      if(error) return {ok:false,message:error.message};
      return {ok:true,item:data};
    } catch(err) { return {ok:false,message:err?.message||'Could not save website content.'}; }
  }
  async function deleteSiteContent(table,id){
    if(!client) return {ok:false,message:'Supabase is not connected.'};
    if(!['site_banners','site_products'].includes(table)) return {ok:false,message:'Unsupported content type.'};
    try { const {error}=await client.from(table).delete().eq('id',id); if(error)return {ok:false,message:error.message}; return {ok:true}; }
    catch(err){return {ok:false,message:err?.message||'Could not delete website content.'};}
  }
  async function loadSiteContent(){
    if(!client) return {ok:false,message:'Supabase is not connected.',banners:[],products:[]};
    try {
      const [b,p]=await Promise.all([
        client.from('site_banners').select('*').eq('active',true).order('created_at',{ascending:false}),
        client.from('site_products').select('*').eq('active',true).order('created_at',{ascending:false})
      ]);
      if(b.error) return {ok:false,message:b.error.message,banners:[],products:[]};
      if(p.error) return {ok:false,message:p.error.message,banners:[],products:[]};
      const banners=(b.data||[]).map(x=>({id:x.id,title:x.title,description:x.description,image:x.image,video:x.video,link:x.link,createdAt:x.created_at}));
      const products=(p.data||[]).map(x=>({id:x.id,name:x.name,description:x.description,category:x.category,price:x.price,contact:x.contact,image:x.image,video:x.video,link:x.link,createdAt:x.created_at}));
      return {ok:true,banners,products};
    } catch(err){return {ok:false,message:err?.message||'Could not load website content.',banners:[],products:[]};}
  }
  Object.assign(window.CECBackend,{signup,login,createProvider,createBooking,createEvent,createReview,saveSiteContent,deleteSiteContent,loadSiteContent});
})();

/* Secure admin authentication layer: admin access is granted only by user_roles in Postgres. */
(function(){
  const B=window.CECBackend; if(!B) return;
  async function adminLogin(email,password){
    if(!B.configured||!B.client) return {ok:false,message:'Supabase is not configured.'};
    const {data,error}=await B.client.auth.signInWithPassword({email,password});
    if(error) return {ok:false,message:'Invalid administrator email or password.'};
    const u=data.user;
    const {data:role,error:roleErr}=await B.client.from('user_roles').select('role').eq('user_id',u.id).in('role',['admin','moderator']).maybeSingle();
    if(roleErr || !role){ await B.client.auth.signOut(); return {ok:false,message:'This account is not authorized as an administrator.'}; }
    sessionStorage.setItem('cecAdminRole',role.role);
    return {ok:true,role:role.role,email:u.email};
  }
  async function checkAdminSession(){
    const locked=document.getElementById('adminLocked'), unlocked=document.getElementById('adminUnlocked'), identity=document.getElementById('adminIdentity');
    if(!locked||!unlocked) return false;
    if(!B.configured||!B.client){locked.style.display='block';unlocked.style.display='none';return false;}
    const {data:{user}}=await B.client.auth.getUser();
    if(!user){locked.style.display='block';unlocked.style.display='none';return false;}
    const {data:role}=await B.client.from('user_roles').select('role').eq('user_id',user.id).in('role',['admin','moderator']).maybeSingle();
    if(!role){locked.style.display='block';unlocked.style.display='none';sessionStorage.removeItem('cecAdminRole');return false;}
    sessionStorage.setItem('cecAdminRole',role.role); locked.style.display='none'; unlocked.style.display='block';
    if(identity) identity.textContent=(user.email||'Admin')+' • '+role.role.toUpperCase();
    return true;
  }
  async function adminLogout(){if(B.client) await B.client.auth.signOut();sessionStorage.removeItem('cecAdminRole');}
  async function sendAdminPasswordReset(email){
    if(!B.configured||!B.client) return {ok:false,message:'Supabase is not configured.'};
    const {error}=await B.client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname+'#admin-reset'});
    if(error) return {ok:false,message:error.message};
    return {ok:true};
  }
  async function updateAdminPassword(password){
    if(!B.configured||!B.client) return {ok:false,message:'Supabase is not configured.'};
    const {data,error}=await B.client.auth.updateUser({password});
    if(error) return {ok:false,message:error.message};
    return {ok:!!data.user};
  }
  B.sendAdminPasswordReset=sendAdminPasswordReset;
  B.updateAdminPassword=updateAdminPassword;
  B.adminLogin=adminLogin;B.checkAdminSession=checkAdminSession;B.adminLogout=adminLogout;
  document.addEventListener('DOMContentLoaded',()=>setTimeout(checkAdminSession,250));
})();

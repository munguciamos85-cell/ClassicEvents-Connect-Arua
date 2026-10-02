/* Cloud admin bridge: replaces local admin lists with Supabase-backed data when authorized. */
(function(){
  const B=()=>window.CECBackend, sb=()=>B()?.client;
  async function allowed(){return !!(B()?.configured && B()?.isAdmin && await B().isAdmin());}
  const esc=s=>window.escapeHtml?escapeHtml(String(s??'')):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  async function refreshAdmin(){
    if(!(await allowed())) return;
    const c=sb();
    const [u,p,b,e,r,m,audit]=await Promise.all([
      c.from('profiles').select('id,name,contact,type,created_at').order('created_at',{ascending:false}).limit(200),
      c.from('providers').select('*').order('created_at',{ascending:false}).limit(200),
      c.from('bookings').select('*').order('created_at',{ascending:false}).limit(200),
      c.from('events').select('*').order('created_at',{ascending:false}).limit(200),
      c.from('reviews').select('*').order('created_at',{ascending:false}).limit(200),
      c.from('messages').select('*').order('created_at',{ascending:false}).limit(100),
      c.from('audit_log').select('*').order('created_at',{ascending:false}).limit(50)
    ]);
    window.__CEC_ADMIN_CLOUD={users:u.data||[],providers:p.data||[],bookings:b.data||[],events:e.data||[],reviews:r.data||[],messages:m.data||[],audit:audit.data||[]};
    render();
  }
  function render(){
    const d=window.__CEC_ADMIN_CLOUD||{};
    const set=(id,v)=>{const x=document.getElementById(id);if(x)x.textContent=v};
    set('akUsers',(d.users||[]).length);set('akProviders',(d.providers||[]).length);set('akPending',(d.providers||[]).filter(x=>x.status==='pending').length);set('akBookings',(d.bookings||[]).length);set('akEvents',(d.events||[]).length);
    const pr=document.getElementById('adminProviderRows');
    if(pr){const q=(document.getElementById('adminProviderSearch')?.value||'').toLowerCase(),st=document.getElementById('adminProviderStatus')?.value||'all',ty=document.getElementById('adminProviderType')?.value||'all';const arr=(d.providers||[]).filter(p=>(st==='all'||p.status===st)&&(ty==='all'||p.type===ty)&&(!q||(`${p.name} ${p.location} ${p.type}`).toLowerCase().includes(q)));pr.innerHTML=arr.length?arr.map(p=>`<div class="admin-row"><div><b>${esc(p.name)}</b> ${p.verified?'<span class="status approved">Verified</span>':''}<br><small class="muted">${esc(p.type)} • ${esc(p.location)} • ${esc(p.price)}</small></div><div class="admin-actions"><span class="status ${esc(p.status)}">${esc(p.status)}</span>${p.status==='pending'?`<button class="gold" onclick="cloudProviderAction(${p.id},'approved')">Approve</button><button class="outline" onclick="cloudProviderAction(${p.id},'rejected')">Reject</button>`:''}${p.status==='approved'?`<button class="outline" onclick="cloudProviderAction(${p.id},'suspended')">Suspend</button>`:''}${p.status==='suspended'?`<button class="outline" onclick="cloudProviderAction(${p.id},'approved')">Restore</button>`:''}<button class="outline" onclick="cloudVerify(${p.id},${!p.verified})">${p.verified?'Unverify':'Verify'}</button><button class="outline" onclick="cloudRemoveProviderPhoto(${p.id})">Remove photo</button></div></div>`).join(''):'<div class="admin-empty">No providers match your filters.</div>';}
    const proj=document.getElementById('adminProjectRows'); if(proj){proj.innerHTML=(d.providers||[]).length?(d.providers||[]).map(p=>`<div class="admin-row"><div><b>${esc(p.name)}</b><br><small class="muted">${Array.isArray(p.projects)?p.projects.length:0} project names • ${(Array.isArray(p.project_images)?p.project_images.length:0)} stored image URLs</small></div><button class="outline" onclick="cloudDeleteProvider(${p.id})">Delete provider</button></div>`).join(''):'<div class="admin-empty">No projects found.</div>';}
    const br=document.getElementById('adminBookingRows');if(br)br.innerHTML=(d.bookings||[]).length?(d.bookings||[]).map(x=>`<div class="admin-row"><div><b>${esc(x.event||'Booking')}</b><br><small class="muted">${esc(x.customer||'Customer')} → ${esc(x.provider_name||'Provider')} • ${esc(x.date||'')}</small></div><div><span class="status ${esc(x.status)}">${esc(x.status)}</span><select onchange="cloudBookingStatus(${x.id},this.value)"><option value="pending">pending</option><option value="accepted">accepted</option><option value="rejected">rejected</option><option value="cancelled">cancelled</option><option value="completed">completed</option></select></div></div>`).join(''):'<div class="admin-empty">No bookings yet.</div>';
    const er=document.getElementById('adminEventRows');if(er)er.innerHTML=(d.events||[]).length?(d.events||[]).map(x=>`<div class="admin-row"><div><b>${esc(x.name)}</b><br><small class="muted">${esc(x.date||'')} • ${esc(x.city||'')} • ${esc(x.type||'')}</small></div><div><span class="status ${esc(x.status)}">${esc(x.status)}</span><select onchange="cloudEventStatus(${x.id},this.value)"><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option><option value="cancelled">cancelled</option><option value="completed">completed</option></select></div></div>`).join(''):'<div class="admin-empty">No events yet.</div>';
    const ur=document.getElementById('adminUserRows');if(ur)ur.innerHTML=(d.users||[]).length?(d.users||[]).map(x=>`<div class="admin-row"><div><b>${esc(x.name)}</b><br><small class="muted">${esc(x.contact||'')} • ${esc(x.type||'Member')}</small></div><span class="status approved">Cloud account</span></div>`).join(''):'<div class="admin-empty">No users yet.</div>';
    const rr=document.getElementById('adminReviewRows');if(rr)rr.innerHTML=(d.reviews||[]).length?(d.reviews||[]).map(x=>`<div class="admin-row"><div><b>${esc(x.provider_name)}</b><br><span class="g">${'★'.repeat(x.rating)}</span> <small class="muted">${esc(x.text||'')}</small></div><div><span class="status ${esc(x.status)}">${esc(x.status)}</span><button class="outline" onclick="cloudReviewStatus(${x.id},'removed')">Remove</button></div></div>`).join(''):'<div class="admin-empty">No reviews yet.</div>';
  }
  async function act(table,id,patch){if(!(await allowed()))return alert('Admin access required.');const c=sb();const r=await c.from(table).update(patch).eq('id',id);if(r.error)alert(r.error.message);else{window.showToast&&showToast('Cloud record updated.');refreshAdmin();}}
  window.cloudProviderAction=(id,status)=>act('providers',id,{status});
  window.cloudVerify=(id,verified)=>act('providers',id,{verified});
  window.cloudRemoveProviderPhoto=id=>{if(confirm('Remove this provider profile photo?'))act('providers',id,{photo:''});};
  window.cloudBookingStatus=(id,status)=>act('bookings',id,{status});
  window.cloudEventStatus=(id,status)=>act('events',id,{status});
  window.cloudReviewStatus=(id,status)=>act('reviews',id,{status});
  window.cloudDeleteProvider=async id=>{if(!(await allowed()))return; if(!confirm('Delete this provider and its project media?'))return;const r=await sb().from('providers').delete().eq('id',id);if(r.error)alert(r.error.message);else refreshAdmin();};
  window.CECCloudAdmin={refresh:refreshAdmin};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshAdmin,800));
})();

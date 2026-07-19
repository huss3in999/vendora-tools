import * as api from './api.js?v=20';
import { formatBD, showToast, showLoading, navigate, backHeader, screenLayout } from './app.js?v=20';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const units = ['', 'piece', 'pack', 'box', 'bag', 'kilogram', 'litre', 'bottle', 'carton'];
let data = { categories: [], products: [], suppliers: [], receipt_upload_enabled: false };
let items = [];
let editing = null;

export function renderPurchaseScreen(screen) {
  if (screen === 'new-purchase' || screen === 'edit-purchase') return '<div class="screen"><div class="spinner center"></div></div>';
  if (screen === 'owner-purchases') return '<div class="screen"><div class="spinner center"></div></div>';
  if (['manage-products','manage-purchase-categories','manage-suppliers'].includes(screen)) return '<div class="screen"><div class="spinner center"></div></div>';
  return '<div class="screen"><p>Screen not found</p></div>';
}

function options(records, selected, empty) { return `<option value="">${empty}</option>${records.map(r => `<option value="${r.id}" ${String(selected)===String(r.id)?'selected':''}>${esc(r.name)}${r.status==='hidden'?' (Hidden)':''}</option>`).join('')}`; }
function total() { return items.reduce((sum, item) => sum + Number(item.line_total || 0), 0); }

function purchaseForm() {
  const p = editing?.purchase || {};
  const mode = p.entry_mode || 'detailed';
  return screenLayout(`${backHeader(editing ? 'Edit Owner Purchase' : 'New Purchase')}
    <form id="purchase-form" class="purchase-form">
      <div class="mode-tabs"><button type="button" class="mode-tab ${mode==='detailed'?'active':''}" data-mode="detailed">Detailed Purchase</button><button type="button" class="mode-tab ${mode==='quick'?'active':''}" data-mode="quick">Quick Purchase</button></div>
      <input type="hidden" id="purchase-mode" value="${mode}">
      <div class="purchase-grid"><label>Purchase Date<input type="date" id="purchase-date" required value="${esc(p.purchase_date || new Date().toISOString().slice(0,10))}"></label><label>Supplier<select id="purchase-supplier">${options(data.suppliers,p.supplier_id,'No supplier')}</select></label></div>
      <section id="detailed-fields" class="${mode==='quick'?'hidden':''}">
        <div class="product-tools"><input type="search" id="product-search" placeholder="Search products"><select id="product-category">${options(data.categories,'','All categories')}</select></div>
        <div id="product-tiles" class="product-tiles"></div>
        <div class="section-title">Purchase Items</div><div id="purchase-items"></div>
      </section>
      <section id="quick-fields" class="${mode==='detailed'?'hidden':''}">
        <label>Total Amount (BD)<input type="number" id="quick-total" min="0.001" step="0.001" value="${mode==='quick'?esc(p.total_amount):''}"></label>
        <label>Category / Description<select id="quick-category">${options(data.categories,p.category_id,'Select category')}</select></label>
        <label>Or custom description<input type="text" id="quick-description" maxlength="120" value="${mode==='quick'&&!p.category_id?esc(p.category_name_snapshot):''}"></label>
      </section>
      <div class="purchase-total"><span>Running Total</span><strong id="purchase-total">${formatBD(mode==='quick'?p.total_amount:total())}</strong></div>
      <label>Receipt (optional) <input type="file" id="purchase-receipt" accept="image/jpeg,image/png,image/webp" ${data.receipt_upload_enabled?'':'disabled'}></label>
      ${data.receipt_upload_enabled?'':'<p class="form-hint">Receipt upload is unavailable until the optional R2 binding is configured.</p>'}
      <label>Note (optional)<textarea id="purchase-note" maxlength="1000">${esc(p.note)}</textarea></label>
      ${editing?'<label>Edit reason *<textarea id="purchase-edit-reason" required></textarea></label>':''}
      <button id="save-purchase" class="btn btn-primary btn-full btn-lg" type="submit">${editing?'Save Purchase Changes':'Save Purchase'}</button>
    </form>`);
}

function renderTiles() {
  const q=(document.getElementById('product-search')?.value||'').toLowerCase(); const category=document.getElementById('product-category')?.value;
  const products=data.products.filter(p=>(!q||p.name.toLowerCase().includes(q))&&(!category||String(p.category_id)===category));
  document.getElementById('product-tiles').innerHTML=products.map(p=>`<button type="button" class="product-tile" data-product="${p.id}">${p.is_favourite?'★ ':''}${esc(p.name)}<small>${esc(p.category_name||'')}</small></button>`).join('')||'<p class="empty-msg">No matching products.</p>';
}

function renderItems() {
  const box=document.getElementById('purchase-items'); if(!box)return;
  box.innerHTML=items.map((item,index)=>`<div class="purchase-item" data-index="${index}"><div><strong>${esc(item.product_name)}</strong><button type="button" class="item-remove" data-remove="${index}" aria-label="Remove">×</button></div><div class="item-fields"><label>Qty<input type="number" min="0.001" step="0.001" data-field="quantity" value="${esc(item.quantity)}"></label><label>Unit<select data-field="unit">${units.map(u=>`<option ${u===item.unit?'selected':''}>${u}</option>`).join('')}</select></label><label>Unit price<input type="number" min="0.001" step="0.001" data-field="unit_price" value="${esc(item.unit_price)}"></label><label>Line total<input required type="number" min="0.001" step="0.001" data-field="line_total" value="${esc(item.line_total)}"></label></div></div>`).join('')||'<p class="empty-msg">Tap a product above to add it.</p>';
  document.getElementById('purchase-total').textContent=formatBD(total());
}

async function loadForm(id) {
  showLoading(true);
  try { data=await api.getPurchaseData(true); editing=id?await api.getOwnerPurchase(id):null; items=(editing?.items||[]).map(i=>({product_id:i.product_id,product_name:i.product_name_snapshot,quantity:i.quantity||'',unit:i.unit||'',unit_price:i.unit_price||'',line_total:i.line_total})); document.getElementById('app').innerHTML=purchaseForm(); bindForm(); renderTiles(); renderItems(); }
  catch(e){showToast(e.message,'error');navigate('owner-dashboard');} finally{showLoading(false);}
}

function bindForm() {
  document.querySelector('[data-action="back"]')?.addEventListener('click',()=>navigate('owner-dashboard'));
  document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{document.getElementById('purchase-mode').value=btn.dataset.mode;document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('active',b===btn));document.getElementById('detailed-fields').classList.toggle('hidden',btn.dataset.mode==='quick');document.getElementById('quick-fields').classList.toggle('hidden',btn.dataset.mode==='detailed');}));
  document.getElementById('product-search')?.addEventListener('input',renderTiles); document.getElementById('product-category')?.addEventListener('change',renderTiles);
  document.getElementById('product-tiles')?.addEventListener('click',e=>{const id=e.target.closest('[data-product]')?.dataset.product;if(!id)return;const p=data.products.find(x=>String(x.id)===id);items.push({product_id:p.id,product_name:p.name,quantity:'',unit:p.default_unit||'',unit_price:'',line_total:''});renderItems();});
  document.getElementById('purchase-items')?.addEventListener('input',e=>{const row=e.target.closest('[data-index]');if(!row)return;const item=items[Number(row.dataset.index)];const field=e.target.dataset.field;if(!field)return;item[field]=e.target.value;if((field==='quantity'||field==='unit_price')&&item.quantity&&item.unit_price){item.line_total=(Number(item.quantity)*Number(item.unit_price)).toFixed(3);const lineInput=row.querySelector('[data-field="line_total"]');if(lineInput)lineInput.value=item.line_total;}document.getElementById('purchase-total').textContent=formatBD(total());});
  document.getElementById('purchase-items')?.addEventListener('click',e=>{if(e.target.dataset.remove==null)return;items.splice(Number(e.target.dataset.remove),1);renderItems();});
  document.getElementById('quick-total')?.addEventListener('input',e=>document.getElementById('purchase-total').textContent=formatBD(e.target.value));
  document.getElementById('purchase-form').addEventListener('submit',savePurchase);
}

async function savePurchase(e) {
  e.preventDefault(); const button=document.getElementById('save-purchase'); if(button.disabled)return; button.disabled=true;
  const mode=document.getElementById('purchase-mode').value; const payload={entry_mode:mode,purchase_date:document.getElementById('purchase-date').value,supplier_id:Number(document.getElementById('purchase-supplier').value)||null,note:document.getElementById('purchase-note').value};
  if(mode==='detailed'){if(!items.length){showToast('Add at least one product','error');button.disabled=false;return;}payload.items=items;payload.total_amount=total();}else{payload.total_amount=Number(document.getElementById('quick-total').value);payload.category_id=Number(document.getElementById('quick-category').value)||null;payload.category_description=document.getElementById('quick-description').value;}
  if(editing)payload.edit_reason=document.getElementById('purchase-edit-reason').value;
  try{showLoading(true);const result=editing?await api.updateOwnerPurchase(editing.purchase.id,payload):await api.createOwnerPurchase(payload);const id=editing?editing.purchase.id:result.id;const file=document.getElementById('purchase-receipt').files[0];if(file)await api.uploadPurchaseReceipt(id,file);showToast('Owner purchase saved','success');navigate('owner-purchases');}catch(err){showToast(err.message,'error');button.disabled=false;}finally{showLoading(false);}
}

function purchaseList(result) {
  return screenLayout(`${backHeader('Owner Purchases')}<form id="purchase-filters" class="filter-panel"><input type="search" id="pq" placeholder="Search supplier, product, category or note"><div class="filter-grid"><input type="date" id="pfrom"><input type="date" id="pto"><select id="pmode"><option value="">All modes</option><option value="detailed">Detailed</option><option value="quick">Quick</option></select><select id="pstatus"><option value="active">Active</option><option value="voided">Voided</option><option value="deleted">Deleted</option><option value="all">All statuses</option></select></div><label class="filter-check"><input type="checkbox" id="ptest"> Test only</label><button class="btn btn-primary" type="submit">Apply</button></form><div class="summary-strip"><div><span>Purchases</span><strong>${result.summary.count||0}</strong></div><div><span>Total</span><strong>${formatBD(result.summary.total)}</strong></div></div><div class="tx-list">${result.purchases.map(p=>`<article class="tx-row ${p.is_test?'test':''}"><div class="tx-main"><span class="tx-type">${p.entry_mode==='quick'?'QUICK · ':''}${esc(p.supplier_name_snapshot||p.category_name_snapshot||'Owner Purchase')}</span><span class="tx-amount negative">${formatBD(p.total_amount)}</span></div><div class="tx-meta">${esc(p.purchase_date)} · ${esc(p.category_name_snapshot||'')} · ${esc(p.status)} ${p.is_test?'<span class="badge-test">TEST</span>':''}</div>${p.product_summary?`<div class="tx-note">${esc(p.product_summary)}</div>`:''}<div class="tx-actions"><button class="btn-sm" data-detail="${p.id}">Details</button>${p.receipt_key?`<button class="btn-sm" data-receipt="${p.id}">Receipt</button>`:''}${p.status==='active'?`<button class="btn-sm" data-edit="${p.id}">Edit</button><button class="btn-sm btn-warning" data-void="${p.id}">Void</button><button class="btn-sm btn-danger" data-delete="${p.id}">Delete</button>`:''}</div></article>`).join('')||'<p class="empty-msg">No purchases found.</p>'}</div>`);
}

async function loadPurchases(params={status:'active'}) { showLoading(true);try{const result=await api.getOwnerPurchases(params);document.getElementById('app').innerHTML=purchaseList(result);bindPurchaseList();}catch(e){showToast(e.message,'error');}finally{showLoading(false);} }
function bindPurchaseList(){document.querySelector('[data-action="back"]')?.addEventListener('click',()=>navigate('owner-dashboard'));document.getElementById('purchase-filters').addEventListener('submit',e=>{e.preventDefault();const status=document.getElementById('pstatus').value;loadPurchases({q:document.getElementById('pq').value,date_from:document.getElementById('pfrom').value,date_to:document.getElementById('pto').value,entry_mode:document.getElementById('pmode').value,status:status==='all'?'':status,test_only:document.getElementById('ptest').checked?'1':''});});document.getElementById('app').addEventListener('click',async e=>{const id=e.target.dataset.detail||e.target.dataset.edit||e.target.dataset.void||e.target.dataset.delete||e.target.dataset.receipt;if(!id)return;try{if(e.target.dataset.edit)navigate('edit-purchase',{id});else if(e.target.dataset.receipt)await api.openPurchaseReceipt(id);else if(e.target.dataset.detail){const d=await api.getOwnerPurchase(id);alert(`${d.purchase.entry_mode.toUpperCase()} PURCHASE\n${d.items.map(i=>`${i.product_name_snapshot}: ${formatBD(i.line_total)}`).join('\n')}\nTotal: ${formatBD(d.purchase.total_amount)}\n${d.purchase.note||''}`);}else if(e.target.dataset.void){const reason=prompt('Void reason required:');if(reason){await api.voidOwnerPurchase(id,reason);loadPurchases();}}else if(confirm('Delete this purchase?')){await api.deleteOwnerPurchase(id);loadPurchases();}}catch(err){showToast(err.message,'error');}});}

const resources={ 'manage-products':['products','Products'], 'manage-purchase-categories':['purchase-categories','Product Categories'], 'manage-suppliers':['suppliers','Suppliers'] };
async function loadMaster(screen){const [resource,title]=resources[screen];showLoading(true);try{const result=await api.listMasterData(resource,{include_hidden:'1'});document.getElementById('app').innerHTML=screenLayout(`${backHeader(title)}<div class="form-card"><form id="master-add"><label>Name<input id="master-name" required maxlength="120"></label><button class="btn btn-primary btn-full" type="submit">Add ${title.replace(/s$/,'')}</button></form></div><div class="tx-list">${result.records.map(r=>`<div class="tx-row"><div class="tx-main"><strong>${esc(r.name)}</strong><span>${esc(r.status)}</span></div><div class="tx-actions">${resource==='products'?`<button class="btn-sm" data-favourite="${r.id}" data-value="${r.is_favourite?0:1}">${r.is_favourite?'Unfavourite':'Favourite'}</button>`:''}<button class="btn-sm" data-rename="${r.id}" data-name="${esc(r.name)}">Edit</button><button class="btn-sm" data-status="${r.id}" data-value="${r.status==='active'?'hidden':'active'}">${r.status==='active'?'Hide':'Reactivate'}</button></div></div>`).join('')}</div>`);document.querySelector('[data-action="back"]').addEventListener('click',()=>navigate('settings'));document.getElementById('master-add').addEventListener('submit',async e=>{e.preventDefault();try{await api.createMasterData(resource,{name:document.getElementById('master-name').value});loadMaster(screen);}catch(err){showToast(err.message,'error');}});document.getElementById('app').addEventListener('click',async e=>{const id=e.target.dataset.rename||e.target.dataset.status||e.target.dataset.favourite;if(!id)return;const change=e.target.dataset.rename?{name:prompt('Name:',e.target.dataset.name)}:e.target.dataset.favourite?{is_favourite:Number(e.target.dataset.value)}:{status:e.target.dataset.value};if(change.name===null)return;try{await api.updateMasterData(resource,id,change);loadMaster(screen);}catch(err){showToast(err.message,'error');}});}finally{showLoading(false);}}

export function purchaseScreens(screen, screenData={}) { if(screen==='new-purchase')loadForm();else if(screen==='edit-purchase')loadForm(screenData.id);else if(screen==='owner-purchases')loadPurchases();else if(resources[screen])loadMaster(screen); }

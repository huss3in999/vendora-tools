/* Local draft queue. WhatsApp opens only after a dispatcher clicks; never auto-sends. */
(() => {
  const KEY = 'vendora_tripadvisor_followups_v1';
  const REVIEW = 'https://www.tripadvisor.com/UserReviewEdit-d34715134';
  let available = false;
  let queue;
  try { queue = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { queue = []; }
  if (!Array.isArray(queue)) queue = [];
  queue = queue.filter(q => q.createdAt > Date.now() - 30 * 86400000);
  const button = document.createElement('button');
  button.type = 'button';
  button.style.cssText = 'position:fixed;bottom:88px;right:16px;z-index:50;padding:10px 14px;border:1px solid #34d399;border-radius:12px;background:#102b25;color:#fff;font:inherit;max-width:230px';
  button.hidden = !queue.length;
  document.body.append(button);
  const dialog = document.createElement('dialog');
  dialog.style.cssText = 'max-width:560px;width:90%;max-height:80vh;overflow:auto;padding:24px;border-radius:16px;background:#14232d;color:#fff';
  document.body.append(dialog);
  const ar = () => document.documentElement.lang === 'ar';
  function persist() { localStorage.setItem(KEY, JSON.stringify(queue)); renderButton(); }
  function renderButton() {
    const ready = queue.filter(q => !q.sent && q.dueAt <= Date.now()).length;
    button.hidden = !available || !queue.some(q => !q.sent);
    button.textContent = ar() ? `طلبات تريب أدفايزر (${ready})` : `Tripadvisor follow-ups (${ready})`;
  }
  function message(q, language) {
    return language === 'ar'
      ? `مرحباً ${q.name}، شكراً لاختيارك ڤيندورا ترانسبورت لرحلتك من ${q.origin} إلى ${q.destination}. نرحب برأيك الصادق عن تجربتك على تريب أدفايزر لمساعدة المسافرين الآخرين:\n${REVIEW}\nنتطلع لخدمتك مجدداً. إذا كنت لا ترغب برسائل متابعة، أخبرنا بذلك.`
      : `Hello ${q.name}, thank you for riding with Vendora Transport from ${q.origin} to ${q.destination}. Please share your honest experience on Tripadvisor to help other travelers:\n${REVIEW}\nWe look forward to welcoming you again. Let us know if you prefer no follow-up messages.`;
  }
  const el = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };
  function render() {
    dialog.replaceChildren();
    dialog.append(el('h2', ar() ? 'متابعة الرحلات المكتملة' : 'Completed-trip follow-ups'));
    dialog.append(el('p', ar() ? 'مسودات محفوظة على هذا المتصفح فقط. تُتاح بعد ٤٠ دقيقة. افتح واتساب وراجع الرسالة ثم أرسلها يدوياً؛ لا تُرسل تلقائياً.' : 'Drafts are stored in this browser only and become ready after 40 minutes. Open WhatsApp, check the message and send it manually. Nothing sends automatically.'));
    const close = el('button', ar() ? 'إغلاق' : 'Close'); close.onclick = () => dialog.close(); dialog.append(close);
    for (const q of queue.filter(q => !q.sent)) {
      const card = el('article', ''); card.style.cssText = 'border-top:1px solid #64748b;margin-top:16px;padding-top:16px';
      card.append(el('h3', `#${q.id} · ${q.name}`));
      card.append(el('p', new Intl.DateTimeFormat(ar() ? 'ar-BH' : 'en-GB', {timeZone:'Asia/Bahrain',dateStyle:'short',timeStyle:'short'}).format(q.dueAt)));
      const language = el('select', ''); language.setAttribute('aria-label', ar() ? 'لغة الرسالة' : 'Message language');
      for (const [value, label] of [['en','English'],['ar','العربية']]) { const option = el('option', label); option.value=value; language.append(option); }
      language.value = ar() ? 'ar' : 'en'; card.append(language);
      const open = el('a', ar() ? 'فتح المسودة في واتساب' : 'Open draft in WhatsApp');
      open.target='_blank'; open.rel='noopener noreferrer'; open.style.cssText='display:block;margin:12px 0;color:#a7f3d0';
      const update = () => { open.href=`https://wa.me/${q.phone}?text=${encodeURIComponent(message(q,language.value))}`; };
      language.onchange=update; update();
      if (q.dueAt <= Date.now() && /^\d{8,15}$/.test(q.phone)) card.append(open);
      else card.append(el('p', q.dueAt > Date.now() ? (ar() ? 'بانتظار موعد المتابعة' : 'Waiting until follow-up time') : (ar() ? 'راجع رقم العميل الدولي في الحجز' : 'Check the customer’s international phone number in the booking')));
      const done=el('button',ar()?'إزالة من قائمة المتابعة':'Remove from follow-ups');
      done.onclick=()=>{q.sent=true;persist();render();}; card.append(done); dialog.append(card);
    }
  }
  button.onclick=()=>{render();dialog.showModal();};
  window.VendoraReviewFollowups = {
    setAvailable(value) { available = Boolean(value); if (!available) dialog.close(); renderButton(); },
    completed(booking) {
      if (queue.some(q => q.id === String(booking.id))) return;
      const now=Date.now();
      queue.push({id:String(booking.id),name:String(booking.customerName || ''),origin:String(booking.pickup || ''),destination:String(booking.destination || ''),phone:String(booking.customerPhone || '').replace(/\D/g,''),createdAt:now,dueAt:now+40*60000,sent:false});
      persist();
    },
    reopened(id) { queue=queue.filter(q=>q.id!==String(id));persist(); }
  };
  renderButton(); setInterval(renderButton,30000);
})();

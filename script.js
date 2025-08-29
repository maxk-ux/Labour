
// CSV upload (existing)
document.getElementById('csvInput')?.addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  const rows = text.trim().split(/\r?\n/).map(l=>l.split(','));
  const h = rows.shift();
  const idx = Object.fromEntries(h.map((k,i)=>[k,i]));
  const outRows = [];
  for(const r of rows){
    const base = parseFloat(r[idx['BasePayHr']]);
    const s = parseFloat(r[idx['SuperPct']]);
    const wc = parseFloat(r[idx['WorkersCompPct']]);
    const pt = parseFloat(r[idx['PayrollTaxPct']]);
    const oh = parseFloat(r[idx['OverheadsPct']]);
    const mg = parseFloat(r[idx['MarginPct']]);
    const calc = calcLine(base,s,wc,pt,oh,mg);
    outRows.push({occ:r[idx['Occupation']], base, ...calc});
  }
  document.getElementById('csvResult').innerHTML = renderTable(outRows);
});
function calcLine(base, superPct, wcPct, ptPct, ohPct, mgPct){
  const superC = base*(superPct/100);
  const wc = base*(wcPct/100);
  const pt = base*(ptPct/100);
  const oh = base*(ohPct/100);
  const subtotal = base + superC + wc + pt + oh;
  const charge = subtotal*(1+mgPct/100);
  const profit = charge - subtotal;
  return {subtotal, charge, profit, superC, wc, pt, oh};
}
function renderTable(rows){
  let html = '<table class="table"><thead><tr><th>Occupation</th><th>Base $/hr</th><th>Super</th><th>WC</th><th>Payroll</th><th>Overheads</th><th>Subtotal</th><th>Charge-out</th><th>Profit/hr</th></tr></thead><tbody>';
  rows.forEach(r=>{
    html += `<tr><td>${r.occ}</td><td>$${r.base.toFixed(2)}</td><td>$${r.superC.toFixed(2)}</td><td>$${r.wc.toFixed(2)}</td><td>$${r.pt.toFixed(2)}</td><td>$${r.oh.toFixed(2)}</td><td>$${r.subtotal.toFixed(2)}</td><td>$${r.charge.toFixed(2)}</td><td>$${r.profit.toFixed(2)}</td></tr>`;
  });
  html += '</tbody></table>';
  return html;
}
document.getElementById('calcBtn')?.addEventListener('click', ()=>{
  const base = parseFloat(document.getElementById('base').value || '0');
  const s = parseFloat(document.getElementById('super').value || '12');
  const wc = parseFloat(document.getElementById('wc').value || '2');
  const pt = parseFloat(document.getElementById('pt').value || '5.5');
  const oh = parseFloat(document.getElementById('oh').value || '10');
  const mg = parseFloat(document.getElementById('mg').value || '20');
  const occ = document.getElementById('occ').value || 'Custom';
  const out = calcLine(base,s,wc,pt,oh,mg);
  document.getElementById('calcOut').innerHTML = renderTable([{occ, base, ...out}]);
});
// Excel API hook
async function uploadExcelToAPI(file){
  const endpoint = window.CALC_API_ENDPOINT || '/api/parse-xlsx';
  const fd = new FormData(); fd.append('file', file);
  try{
    const res = await fetch(endpoint, { method:'POST', body: fd });
    if(!res.ok) throw new Error('API error '+res.status);
    return await res.json();
  }catch(e){
    alert('Could not reach Excel API. Using CSV/manual instead.\n'+e.message);
    return null;
  }
}
(function(){
  const calc = document.getElementById('calculator');
  if(!calc) return;
  const csvCard = calc.querySelector('.card');
  if(!csvCard) return;
  const excelInput = document.createElement('input');
  excelInput.type='file'; excelInput.accept='.xlsx,.xlsm,.xls'; excelInput.style.marginTop='10px';
  csvCard.appendChild(excelInput);
  excelInput.addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const rows = await uploadExcelToAPI(file); if(!rows) return;
    const outRows = rows.map(r=>{
      const base = parseFloat(r.BasePayHr);
      const s = parseFloat(r.SuperPct);
      const wc = parseFloat(r.WorkersCompPct);
      const pt = parseFloat(r.PayrollTaxPct);
      const oh = parseFloat(r.OverheadsPct);
      const mg = parseFloat(r.MarginPct);
      const calc = calcLine(base,s,wc,pt,oh,mg);
      return {occ:r.Occupation, base, ...calc};
    });
    document.getElementById('csvResult').innerHTML = renderTable(outRows);
  });
  const pdfBtn = document.createElement('button');
  pdfBtn.className='btn ghost'; pdfBtn.textContent='Download PDF Quote'; pdfBtn.style.marginTop='10px';
  calc.querySelector('.container').appendChild(pdfBtn);
  pdfBtn.addEventListener('click', ()=>{
    const content = (document.getElementById('calcOut').innerHTML || document.getElementById('csvResult').innerHTML || '<em>No calculator results yet</em>');
    const win = window.open('', 'PRINT', 'height=650,width=900');
    win.document.write('<html><head><title>Quote</title><style>@page{size:auto;margin:12mm} body{font-family:Montserrat,Arial,sans-serif} table{width:100%;border-collapse:collapse} th,td{border:1px solid #e5e7eb;padding:6px}</style></head><body>');
    win.document.write('<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><img src="assets/WA_LabourHire_Logo_Mark.png" style="height:40px"><div style="font-weight:700;color:#0A2342;font-size:20px">WA Labour Hire — Quote</div></div>');
    win.document.write(content);
    win.document.write('<div style="margin-top:8px;color:#64748b;font-size:12px">Generated on '+ new Date().toLocaleString() +'</div>');
    win.document.write('</body></html>');
    win.document.close(); win.focus(); win.print(); win.close();
  });
})();
// Multi-step form logic
(function(){
  const form = document.getElementById('msForm');
  if(!form) return;
  const step1 = document.querySelectorAll('.step-1');
  const step2 = document.querySelector('.step-2');
  const prevBtn = document.getElementById('prevBtn');
  const sendBtn = document.getElementById('sendBtn');
  const firstName = form.querySelector('input[placeholder="Your name"]');
  const company = form.querySelector('input[placeholder="Company Pty Ltd"]');
  const email = form.querySelector('input[type="email"]');
  const nextBtn = document.createElement('button'); nextBtn.className='btn primary'; nextBtn.type='button'; nextBtn.textContent='Next';
  step1[step1.length-1].appendChild(nextBtn);
  function validateStep1(){
    let ok = true;
    [company, firstName, email].forEach(inp=>{
      const wrapper = inp.parentElement;
      let err = wrapper.querySelector('.error');
      if(!err){ err = document.createElement('div'); err.className='error'; wrapper.appendChild(err); }
      if(!inp.value){ ok=false; err.textContent='Required'; } else { err.textContent=''; }
    });
    return ok;
  }
  nextBtn.addEventListener('click', ()=>{
    if(!validateStep1()) return;
    step1.forEach(s=>s.style.display='none');
    step2.style.display='block';
    prevBtn.style.display='inline-block';
  });
  prevBtn.addEventListener('click', ()=>{
    step2.style.display='none';
    step1.forEach(s=>s.style.display='grid');
    prevBtn.style.display='none';
  });
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const roles = document.getElementById('rolesNeeded');
    const start = document.getElementById('startDate');
    const loc = document.getElementById('location');
    let ok = true;
    [roles, start, loc].forEach(inp=>{
      const wrapper = inp.parentElement;
      let err = wrapper.querySelector('.error');
      if(!err){ err = document.createElement('div'); err.className='error'; wrapper.appendChild(err); }
      if(!inp.value){ ok=false; err.textContent='Required'; } else { err.textContent=''; }
    });
    if(!ok) return;
    alert('Thanks! Your request has been submitted.');
    form.reset();
    step2.style.display='none';
    step1.forEach(s=>s.style.display='grid');
    prevBtn.style.display='none';
  });
})();

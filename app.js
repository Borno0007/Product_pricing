const $ = (id) => document.getElementById(id);
const inputs = ['priceInput','costInput','fixedInput','demandInput','marketingInput','discountInput','elasticityInput','competitorInput'];
const defaults = { price:149, cost:62, fixed:50000, demand:10000, marketing:25000, discount:0, elasticity:1.2, competitor:142 };
let charts = {};

function setLiveDate() {
  $('currentDate').textContent = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }).format(new Date()).toUpperCase();
}
function applyProfile(profile) {
  const projectValue = profile.project || 'Nova Herbal Shampoo';
  const project = projectValue.trim() || 'Untitled project';
  const name = profile.name.trim() || 'Your name';
  const organization = profile.organization.trim() || 'Your organization';
  $('projectInput').value = projectValue;
  $('nameInput').value = profile.name;
  $('organizationInput').value = profile.organization;
  $('displayProject').textContent = project;
  $('displayName').textContent = name;
  $('displayOrg').textContent = organization;
}
function saveProfile() {
  const profile = {project: $('projectInput').value, name: $('nameInput').value, organization: $('organizationInput').value};
  localStorage.setItem('pricepilot-profile', JSON.stringify(profile));
  applyProfile(profile);
  showToast('Workspace profile saved');
}

const money = (value, compact = false) => {
  if (compact) {
    if (Math.abs(value) >= 1000000) return `৳${(value / 1000000).toFixed(2).replace(/\.00$/, '')}M`;
    if (Math.abs(value) >= 1000) return `৳${(value / 1000).toFixed(value >= 100000 ? 0 : 1).replace(/\.0$/, '')}K`;
  }
  return `৳${Math.round(value).toLocaleString('en-US')}`;
};
const percent = (value) => `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;
const readState = () => ({price:+$('priceInput').value||0,cost:+$('costInput').value||0,fixed:+$('fixedInput').value||0,demand:+$('demandInput').value||0,marketing:+$('marketingInput').value||0,discount:+$('discountInput').value||0,elasticity:+$('elasticityInput').value||0,competitor:+$('competitorInput').value||0});

function estimateDemand(price, state) {
  const relativePrice = (price - state.price) / Math.max(state.price, 1);
  return Math.max(0, state.demand * (1 - relativePrice * state.elasticity));
}
function calculate(state, price = state.price) {
  const netPrice = price * (1 - state.discount / 100);
  const units = estimateDemand(price, state);
  const revenue = netPrice * units;
  const production = state.cost * units;
  const totalCost = production + state.fixed + state.marketing;
  const profit = revenue - totalCost;
  const contribution = netPrice - state.cost;
  const breakEven = contribution > 0 ? (state.fixed + state.marketing) / contribution : Infinity;
  return {price, netPrice, units, revenue, production, fixed:state.fixed, marketing:state.marketing, totalCost, profit, margin:revenue ? profit / revenue * 100 : 0, contribution, breakEven, roi:(state.fixed + state.marketing) ? profit / (state.fixed + state.marketing) * 100 : 0, roas:state.marketing ? revenue / state.marketing : 0};
}
function scenarioData(state) { return [{name:'Premium pricing', price:state.competitor * 1.18, color:'purple'}, {name:'Balanced pricing', price:state.price, color:'blue', featured:true}, {name:'Market penetration', price:state.competitor * .88, color:'green'}].map(item => ({...item, data:calculate(state,item.price)})); }
const prices = (state) => Array.from({length:9},(_,i) => Math.max(1, state.price * (.65 + i * .1)));

function chartDefaults() { return {responsive:true, maintainAspectRatio:false, animation:{duration:450}, plugins:{legend:{display:false},tooltip:{backgroundColor:'#172033',padding:10,titleFont:{family:'DM Sans'},bodyFont:{family:'DM Sans'},displayColors:false}}, scales:{x:{grid:{display:false},ticks:{color:'#98a4b5',font:{size:10}}},y:{grid:{color:'#edf0f5'},ticks:{color:'#98a4b5',font:{size:10},callback:(v)=>money(v,true)}}}}; }
function makeCharts(state) {
  Object.values(charts).forEach(chart => chart.destroy());
  const palette = {blue:'#3978ef', green:'#18a576', orange:'#f39a45', purple:'#8c69e8'};
  const pricePoints = prices(state), demandPoints = pricePoints.map(price => estimateDemand(price,state));
  charts.demand = new Chart($('demandChart'), {type:'line',data:{labels:pricePoints.map(p=>`৳${Math.round(p)}`),datasets:[{label:'Demand',data:demandPoints,borderColor:palette.blue,backgroundColor:'#3978ef16',fill:true,tension:.4,pointRadius:0,pointHoverRadius:5,pointHoverBackgroundColor:palette.blue},{label:'Current price',data:pricePoints.map((p)=>p===state.price?state.demand:null),borderColor:palette.orange,backgroundColor:palette.orange,pointRadius:pricePoints.map(p=>Math.abs(p-state.price)<2?5:0),showLine:false}]},options:chartDefaults()});
  const rev = pricePoints.map(p=>calculate(state,p).revenue), profit = pricePoints.map(p=>calculate(state,p).profit);
  charts.performance = new Chart($('performanceChart'), {type:'line',data:{labels:pricePoints.map(p=>`৳${Math.round(p)}`),datasets:[{label:'Revenue',data:rev,borderColor:palette.blue,backgroundColor:'#3978ef12',fill:true,tension:.4,pointRadius:0},{label:'Profit',data:profit,borderColor:palette.green,backgroundColor:'transparent',tension:.4,pointRadius:0}]},options:chartDefaults()});
  const current=calculate(state); charts.cost = new Chart($('costChart'), {type:'doughnut',data:{labels:['Production costs','Marketing','Fixed costs'],datasets:[{data:[current.production,state.marketing,state.fixed],backgroundColor:[palette.blue,palette.orange,palette.purple],borderWidth:0,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'75%',plugins:{legend:{display:false},tooltip:chartDefaults().plugins.tooltip}}});
  const beLabels = [0, current.breakEven, Math.round(current.units), Math.round(current.units*1.25)].filter((v,i,a)=>Number.isFinite(v)&&a.indexOf(v)===i).sort((a,b)=>a-b); charts.break = new Chart($('breakEvenChart'), {type:'bar',data:{labels:beLabels.map(v=>v.toLocaleString('en-IN')),datasets:[{data:beLabels.map(v=>v*current.contribution-(state.fixed+state.marketing)),backgroundColor:beLabels.map(v=>v>=current.breakEven?palette.green:palette.orange),borderRadius:5,barThickness:30}]},options:{...chartDefaults(),scales:{x:{grid:{display:false},ticks:{color:'#98a4b5',font:{size:10}}},y:{grid:{color:'#edf0f5'},ticks:{color:'#98a4b5',font:{size:10},callback:v=>money(v,true)}}}}});
}

function render(state) {
  const current=calculate(state); const position=(state.price/state.competitor-1)*100;
  $('kpiPrice').textContent=money(state.price); $('kpiRevenue').textContent=money(current.revenue,true); $('kpiProfit').textContent=money(current.profit,true); $('kpiMargin').textContent=percent(current.margin); $('kpiBreakEven').textContent=Number.isFinite(current.breakEven)?Math.ceil(current.breakEven).toLocaleString('en-IN'):'—'; $('kpiRoi').textContent=percent(current.roi); $('pricePosition').textContent=`${position>=0?'+':''}${position.toFixed(1)}%`; $('demandCallout').innerHTML=`<strong>Insight:</strong> At ${money(state.price)}, your estimated demand is ${Math.round(current.units).toLocaleString('en-IN')} units. A 10% price increase could affect volume by approximately ${percent(state.elasticity*10)}.`;
  $('costTotal').textContent=money(current.totalCost,true); $('costLegend').innerHTML=[['blue','Production costs',current.production],['orange','Marketing',state.marketing],['purple','Fixed costs',state.fixed]].map(x=>`<div><i class="swatch ${x[0]}"></i><span>${x[1]}</span><strong>${money(x[2],true)}</strong><small>${percent(x[2]/current.totalCost*100)}</small></div>`).join('');
  $('scenarioCards').innerHTML=scenarioData(state).map(item=>`<article class="scenario-card ${item.featured?'featured':''}"><div class="scenario-name"><i class="scenario-dot"></i>${item.name}</div><strong class="scenario-price">${money(item.price)} <small>/ unit</small></strong><p class="scenario-sales">${Math.round(item.data.units).toLocaleString('en-IN')} estimated monthly sales</p><div class="scenario-metrics"><div><span class="metric-label">Revenue</span><strong class="metric-value">${money(item.data.revenue,true)}</strong></div><div><span class="metric-label">Net profit</span><strong class="metric-value profit">${money(item.data.profit,true)}</strong></div><div><span class="metric-label">Margin</span><strong class="metric-value">${percent(item.data.margin)}</strong></div><div><span class="metric-label">Break-even</span><strong class="metric-value">${Math.ceil(item.data.breakEven).toLocaleString('en-IN')} units</strong></div></div><button class="button secondary scenario-action" data-price="${item.price}">Use this price</button></article>`).join('');
  const below = current.units < current.breakEven; const best = scenarioData(state).sort((a,b)=>b.data.profit-a.data.profit)[0]; $('insightsList').innerHTML=`<div class="insight-item"><span class="insight-icon ${below?'orange':'green'}">${below?'!':'✓'}</span><div><strong>${below?'Sales are below break-even':'Healthy unit economics'}</strong>${below?`You need ${Math.ceil(current.breakEven-current.units).toLocaleString('en-IN')} more units to cover monthly costs.`:'Your current sales volume is covering fixed and marketing costs.'}</div></div><div class="insight-item"><span class="insight-icon blue">✦</span><div><strong>Pricing opportunity</strong>Increasing price by 10% may improve profitability, but could reduce demand by approximately ${percent(state.elasticity*10)}.</div></div><div class="insight-item"><span class="insight-icon green">↗</span><div><strong>${best.name} leads on profit</strong>At ${money(best.price)}, estimated profit is ${money(best.data.profit,true)} with a ${percent(best.data.margin)} margin.</div></div>`;
  makeCharts(state);
}

function showToast(message) { const toast=$('toast'); toast.textContent=message; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2500); }
function syncPriceRange() { $('priceRange').value=Math.min(250,Math.max(50,+$('priceInput').value||149)); }
function update() { syncPriceRange(); render(readState()); }
inputs.forEach(id => $(id).addEventListener('input',update)); $('priceRange').addEventListener('input',()=>{ $('priceInput').value=$('priceRange').value; update(); });
$('resetBtn').addEventListener('click',()=>{Object.entries(defaults).forEach(([key,value])=>{const map={price:'priceInput',cost:'costInput',fixed:'fixedInput',demand:'demandInput',marketing:'marketingInput',discount:'discountInput',elasticity:'elasticityInput',competitor:'competitorInput'};$(map[key]).value=value});update();showToast('Simulator reset to sample data');});
$('themeBtn').addEventListener('click',()=>{document.body.classList.toggle('dark');$('themeBtn').textContent=document.body.classList.contains('dark')?'☀':'☾';localStorage.setItem('pricepilot-theme',document.body.classList.contains('dark')?'dark':'light');});
$('saveBtn').addEventListener('click',()=>{const saved=JSON.parse(localStorage.getItem('pricepilot-scenarios')||'[]');saved.push({savedAt:new Date().toLocaleString(),...readState()});localStorage.setItem('pricepilot-scenarios',JSON.stringify(saved));$('savedNote').textContent='Scenario saved';showToast('Scenario saved to your workspace');setTimeout(()=>$('savedNote').textContent='',2200);});
$('exportBtn').addEventListener('click',()=>{const s=readState(),c=calculate(s);const rows=[['Metric','Value'],['Product price',s.price],['Estimated demand',Math.round(c.units)],['Revenue',Math.round(c.revenue)],['Total cost',Math.round(c.totalCost)],['Net profit',Math.round(c.profit)],['Profit margin',percent(c.margin)],['Break-even units',Math.ceil(c.breakEven)],['ROI',percent(c.roi)],['ROAS',c.roas.toFixed(2)+'x']];const blob=new Blob([rows.map(row=>row.join(',')).join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pricepilot-report.csv';a.click();URL.revokeObjectURL(url);showToast('CSV report exported');});
$('reportBtn').addEventListener('click',()=>window.print()); $('tipsBtn').addEventListener('click',()=>showToast('Tip: Start with Balanced pricing, then compare profit and margin.')); $('menuBtn').addEventListener('click',()=> $('sidebar').classList.toggle('open')); $('performanceSelect').addEventListener('change',(e)=>{charts.performance.data.datasets[0].hidden=e.target.value==='profit';charts.performance.data.datasets[1].hidden=e.target.value==='revenue';charts.performance.update();}); $('saveProfileBtn').addEventListener('click',saveProfile);
document.addEventListener('click',(e)=>{if(e.target.matches('.scenario-action')){$('priceInput').value=Math.round(+e.target.dataset.price);update();showToast('Scenario price applied to model');}}); const storedProfile=JSON.parse(localStorage.getItem('pricepilot-profile')||'null'); applyProfile(storedProfile||{project:'Nova Herbal Shampoo',name:'Jalal Uddin Mohammad Akbar',organization:'Nova Consumer Goods'}); if(localStorage.getItem('pricepilot-theme')==='dark'){$('themeBtn').click();} setLiveDate(); update();

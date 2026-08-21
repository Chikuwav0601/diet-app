const KEY = 'diet-app-data-v1';
const defaults = { areas: [], videos: [], tasks: [], days: {} };
let data = JSON.parse(localStorage.getItem(KEY) || 'null') || defaults;
const areas = ['お腹','二の腕','脚','お尻','背中','顔まわり'];
const suggestions = ['水をこまめに飲む','野菜から食べる','よく噛んで食べる','買い食いしない','早く寝る','ストレッチをする'];
const days = ['日','月','火','水','木','金','土'];
const dateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const save = () => localStorage.setItem(KEY, JSON.stringify(data));
const current = () => data.days[dateKey()] || (data.days[dateKey()] = { tasks:{}, videos:{}, photo:false });
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}

const db = new Promise((resolve,reject)=>{const r=indexedDB.open('diet-app-photos',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function putPhoto(key, file){const d=await db;const tx=d.transaction('photos','readwrite');tx.objectStore('photos').put(file,key);return new Promise(r=>tx.oncomplete=r)}
async function getPhoto(key){const d=await db;const tx=d.transaction('photos');const r=tx.objectStore('photos').get(key);return new Promise(resolve=>{r.onsuccess=()=>resolve(r.result)})}

function renderHome(){
  const today=current(); document.querySelector('#today-label').textContent=new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'short'}).format(new Date());
  document.querySelector('#photo-message').textContent=today.photo?'今日の写真を記録しました。':'変化を、数字ではなく見た目で残そう。';
  const weekday=new Date().getDay(); const videos=data.videos.filter(v=>!v.weekdays.length||v.weekdays.includes(weekday));
  document.querySelector('#video-list').innerHTML=videos.length?videos.map(v=>`<div class="today-item"><div class="item-content">${v.url?`<a href="${v.url}" target="_blank" rel="noreferrer">${escapeHtml(v.name)}</a>`:`<strong>${escapeHtml(v.name)}</strong>`}<small>${today.videos[v.id]==='done'?'達成済み':today.videos[v.id]==='small'?'小さく達成':'まだ記録していません'}</small></div><button class="status-button ${today.videos[v.id]==='done'?'done':''}" data-video="${v.id}" data-status="done">達成</button><button class="status-button ${today.videos[v.id]==='small'?'small':''}" data-video="${v.id}" data-status="small">小さく</button></div>`).join(''):'<p class="muted">設定から、今日やる動画を追加しましょう。</p>';
  document.querySelector('#task-list').innerHTML=data.tasks.length?data.tasks.map(t=>`<label class="today-item"><input class="task-check" type="checkbox" data-task="${t.id}" ${today.tasks[t.id]?'checked':''}/><span class="item-content"><strong>${escapeHtml(t.name)}</strong></span></label>`).join(''):'<p class="muted">設定から、続けたい習慣を追加しましょう。</p>';
}
function renderSettings(){
 document.querySelector('#areas').innerHTML=areas.map(a=>`<button class="chip ${data.areas.includes(a)?'selected':''}" data-area="${a}">${a}</button>`).join('');
 document.querySelector('#suggested-tasks').innerHTML=suggestions.map(a=>`<button class="chip" data-suggest="${a}">＋ ${a}</button>`).join('');
 document.querySelector('#saved-videos').innerHTML=data.videos.map(v=>`<div class="saved-item"><div class="item-content"><strong>${escapeHtml(v.name)}</strong><small>${v.weekdays.length?v.weekdays.map(d=>days[d]).join('・'):'毎日'}</small></div><button class="delete" data-remove-video="${v.id}">削除</button></div>`).join('')||'<p class="muted">登録した動画はまだありません。</p>';
 document.querySelector('#saved-tasks').innerHTML=data.tasks.map(t=>`<div class="saved-item"><strong class="item-content">${escapeHtml(t.name)}</strong><button class="delete" data-remove-task="${t.id}">削除</button></div>`).join('')||'<p class="muted">登録した習慣はまだありません。</p>';
}
async function renderReview(){
 const dates=Object.keys(data.days).sort(); const left=document.querySelector('#compare-left'),right=document.querySelector('#compare-right'); if(!left.value&&dates.length){left.value=dates[0];right.value=dateKey()}
 const compare=document.querySelector('#comparison');compare.innerHTML=''; for(const d of [left.value,right.value]){let f=d&&await getPhoto(d);const slot=document.createElement('div');slot.className='photo-slot';slot.innerHTML=f?`<img alt="${d}の記録写真" src="${URL.createObjectURL(f)}">`:`<span>${d||'日付を選択'}<br>写真はありません</span>`;compare.append(slot)}
 const now=new Date(), first=new Date(now.getFullYear(),now.getMonth(),1), last=new Date(now.getFullYear(),now.getMonth()+1,0);let html='';for(let i=0;i<first.getDay();i++)html+='<span></span>';for(let d=1;d<=last.getDate();d++){const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,entry=data.days[key]||{},activity=Object.values(entry.tasks||{}).some(Boolean)||Object.values(entry.videos||{}).some(Boolean);html+=`<div class="day ${entry.photo?'photo':''} ${activity?'activity':''}" title="${key}">${d}</div>`}document.querySelector('#calendar').innerHTML=html;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function refresh(){save();renderHome();renderSettings();renderReview()}

document.querySelector('#photo-input').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;await putPhoto(dateKey(),f);current().photo=true;refresh();toast('写真を記録しました')});
document.querySelector('#video-form').addEventListener('submit',e=>{e.preventDefault();const name=document.querySelector('#video-name');data.videos.push({id:crypto.randomUUID(),name:name.value,url:document.querySelector('#video-url').value,weekdays:[...document.querySelectorAll('#weekday-picker input:checked')].map(x=>+x.value)});e.target.reset();refresh();toast('動画を追加しました')});
document.querySelector('#task-form').addEventListener('submit',e=>{e.preventDefault();addTask(document.querySelector('#task-name').value);e.target.reset()});
function addTask(name){if(data.tasks.some(t=>t.name===name))return toast('すでに追加されています');data.tasks.push({id:crypto.randomUUID(),name});refresh();toast('習慣を追加しました')}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.view){document.querySelectorAll('.view,.nav-button').forEach(x=>x.classList.remove('active'));document.querySelector('#'+b.dataset.view).classList.add('active');b.classList.add('active');if(b.dataset.view==='review-view')renderReview()}if(b.dataset.open){document.querySelector(`[data-view="${b.dataset.open}"]`).click()}if(b.dataset.area){data.areas=data.areas.includes(b.dataset.area)?data.areas.filter(a=>a!==b.dataset.area):[...data.areas,b.dataset.area];refresh()}if(b.dataset.suggest)addTask(b.dataset.suggest);if(b.dataset.video){current().videos[b.dataset.video]=b.dataset.status;refresh()}if(b.dataset.removeVideo){data.videos=data.videos.filter(v=>v.id!==b.dataset.removeVideo);refresh()}if(b.dataset.removeTask){data.tasks=data.tasks.filter(t=>t.id!==b.dataset.removeTask);refresh()}});
document.addEventListener('change',e=>{if(e.target.dataset.task){current().tasks[e.target.dataset.task]=e.target.checked;refresh()}if(e.target.matches('#compare-left,#compare-right'))renderReview()});
document.querySelector('#weekday-picker').innerHTML=days.map((d,i)=>`<label><input type="checkbox" value="${i}"><span>${d}</span></label>`).join('');
refresh();

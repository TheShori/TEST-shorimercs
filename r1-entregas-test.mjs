import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
const firebaseConfig = {
      apiKey: "AIzaSyA-MMvUt9IvYSHwcFbC0M3K9PdXtlf2gZU",
      authDomain: "gestionmercenarios.firebaseapp.com",
      projectId: "gestionmercenarios",
      storageBucket: "gestionmercenarios.firebasestorage.app",
      messagingSenderId: "534795985470",
      appId: "1:534795985470:web:ba5715acfbb4114806676f"
    };
const auth=getAuth(getApps().length?getApp():initializeApp(firebaseConfig));
const $=id=>document.getElementById(id),endpoint='https://najovisunas.synology.me:18443/api/r1/nas-test/delivery-status';
let busy=false,generation=0,controller=null;
const types={mission_started:'Inicio',mission_paused:'Pausa',mission_resumed:'Reanudación',checklist_step:'Avance',mission_completed:'Finalización'};
const labels={accepted:'Aceptado · entrega sin confirmar',delivered:'Entregado',read:'Leído',error:'WhatsApp informó de un error',queued:'Pendiente de envío',attempting:'Intento en curso o sin confirmar',unknown:'Resultado sin confirmar',not_sent:'No enviado',expired:'Aviso caducado',held:'Aviso retenido',disabled:'Aviso desactivado',invalid_phone:'Teléfono no válido'};
const date=ms=>Number.isFinite(ms)&&ms>0?new Date(ms).toLocaleString('es-ES'):'Sin fecha';
function render(data){
 if(data.version!=='receipt-test-v17'||!Array.isArray(data.rows))throw Error('Respuesta no reconocida.');
 $('notices').replaceChildren();$('warning').hidden=data.tracking?.available!==false;$('warning').textContent='El seguimiento ha detectado un fallo. Las confirmaciones pueden estar incompletas; los envíos conservan su funcionamiento.';
 for(const row of data.rows){
  const trace=row.trace,state=trace?.state||row.status,card=document.createElement('article'),title=document.createElement('h3'),tag=document.createElement('span'),meta=document.createElement('p'),detail=document.createElement('p');
  title.textContent=row.mission||'Aviso';tag.className='status '+(Object.hasOwn(labels,state)?state:'unknown');tag.textContent=labels[state]||'Sin seguimiento';
  meta.textContent=(types[row.type]||'Aviso')+' · '+date(row.at);
  if(trace?.readAt)detail.textContent='Confirmación de lectura recibida: '+date(trace.readAt);
  else if(trace?.deliveredAt)detail.textContent='Confirmación de entrega recibida: '+date(trace.deliveredAt);
  else if(trace)detail.textContent=state==='error'?'WhatsApp notificó un error. Este panel no reintenta el envío.':'Todavía no hay confirmación de entrega. No significa que haya fallado.';
  else if(row.status==='accepted')detail.textContent='Sin registro de seguimiento para este aviso. No se puede deducir su entrega.';
  else detail.textContent='Este panel no envía ni reintenta mensajes.';
  card.append(title,tag,meta,detail);$('notices').append(card);
 }
 $('notice').textContent=data.rows.length?'Última consulta: '+date(Date.now()):'Todavía no hay avisos para mostrar.';
}
async function refresh(){
 if(busy||auth.currentUser?.email!=='victorsoripar@gmail.com'||document.visibilityState==='hidden')return;
 const stamp=generation,user=auth.currentUser,current=new AbortController();controller=current;busy=true;$('refresh').disabled=true;
 const timeout=setTimeout(()=>current.abort(),10000);
 try{const token=await user.getIdToken();if(stamp!==generation)return;const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({mode:'receipt-test-v17'}),signal:current.signal,cache:'no-store'});let data;try{data=await response.json();}catch{throw Error('El seguimiento V17 todavía no está disponible. Completa la instalación en el NAS.');}if(stamp!==generation)return;if(!response.ok)throw Error(data.error||'No se pudo consultar el estado.');render(data);}catch(e){if(stamp===generation)$('notice').textContent=e.name==='AbortError'?'La consulta ha tardado demasiado. Se volverá a intentar.':e instanceof TypeError?'No se pudo contactar con el NAS. Los datos anteriores pueden estar desactualizados.':e.message;}finally{clearTimeout(timeout);if(controller===current){controller=null;busy=false;$('refresh').disabled=false;}}
}
onAuthStateChanged(auth,user=>{generation++;controller?.abort();controller=null;busy=false;$('boot').hidden=true;$('login').hidden=!!user;$('panel').hidden=!user||user.email!=='victorsoripar@gmail.com';$('denied').hidden=!user||user.email==='victorsoripar@gmail.com';$('password').value='';$('notices').replaceChildren();$('notice').textContent='';$('warning').hidden=true;if(user?.email==='victorsoripar@gmail.com')refresh();});
$('refresh').addEventListener('click',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});setInterval(()=>{if(auth.currentUser?.email==='victorsoripar@gmail.com')refresh();},30000);
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginButton').disabled=true;$('loginError').textContent='';try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);}catch{$('loginError').textContent='No se pudo iniciar sesión. Revisa tus datos.';}finally{$('password').value='';$('loginButton').disabled=false;}});
for(const id of ['logout','logoutDenied'])$(id).addEventListener('click',()=>signOut(auth).catch(()=>{$('notice').textContent='No se pudo cerrar sesión. Inténtalo de nuevo.';}));

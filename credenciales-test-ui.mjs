import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {getAuth,signInWithEmailAndPassword,setPersistence,inMemoryPersistence,signOut} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
const config={apiKey:'AIzaSyA-MMvUt9IvYSHwcFbC0M3K9PdXtlf2gZU',authDomain:'gestionmercenarios.firebaseapp.com',projectId:'gestionmercenarios',appId:'1:534795985470:web:ba5715acfbb4114806676f'};
const auth=getAuth(initializeApp(config,'gm-credential-test-1e1'));
const el=id=>document.getElementById(id);
const eligible=location.origin==='https://theshori.github.io'&&location.pathname.startsWith('/TEST-shorimercs/');
let user=null,busy=false,role=null,state=null,secretTimer=null,baseUrl='';
function hideSecret(){clearTimeout(secretTimer);el('samplePass').value='';el('sampleUser').value='';el('secretBox').classList.add('hidden');}
function sync(){
 el('login').classList.toggle('hidden',!!user);el('session').classList.toggle('hidden',!user);el('controls').classList.toggle('hidden',!user);
 el('base').disabled=busy||!!user;el('loginButton').disabled=busy||!eligible;
 for(const id of ['refresh','create','reveal','close','logout'])el(id).disabled=busy;
 el('create').disabled=busy||role!=='admin'||state!=='not_created';
 el('close').disabled=busy||role!=='admin'||state!=='active';el('reveal').disabled=busy||state!=='active';
}
function readBase(){const u=new URL(el('base').value.trim());if(u.protocol!=='https:'||! /^[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/.test(u.hostname)||u.username||u.password||u.port||!['','/'].includes(u.pathname)||u.search||u.hash)throw new Error('Usa solo la URL HTTPS de TU túnel, sin /send.');return u.origin;}
function show(data){const safe={...data};delete safe.credential;el('result').textContent=JSON.stringify(safe,null,2);}
async function request(action,confirmation){
 if(!eligible||!user)throw new Error('Inicia sesión desde la página TEST.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const token=await user.getIdToken();
  const r=await fetch(baseUrl+'/api/test/credential-vault',{method:'POST',mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(confirmation?{action,confirmation}:{action})});
  const data=await r.json();return {http:r.status,...data};
 }finally{clearTimeout(timeout);}
}
function applyState(data){if(data.http===200&&data.viewerRole){role=data.viewerRole;state=data.hasCredential?'active':data.status==='not_created'?'not_created':'closed';el('state').textContent=state+' · '+role;}else{role=null;state=null;el('state').textContent='No autorizado o no disponible';}sync();}
async function run(fn){if(busy)return;busy=true;hideSecret();sync();try{await fn();}catch{el('result').textContent='No se pudo confirmar la respuesta. Comprueba sesión, Node.js y túnel; consulta el estado antes de repetir. No se ha demostrado que una escritura haya fallado.';}finally{busy=false;sync();}}
async function refresh(){const data=await request('status');applyState(data);show(data);}
el('login').addEventListener('submit',e=>{e.preventDefault();run(async()=>{baseUrl=readBase();await setPersistence(auth,inMemoryPersistence);user=(await signInWithEmailAndPassword(auth,el('email').value.trim(),el('password').value)).user;el('identity').textContent='Sesión: '+user.email;await refresh();}).finally(()=>{el('password').value='';});});
el('logout').addEventListener('click',()=>run(async()=>{await signOut(auth);user=null;role=null;state=null;baseUrl='';el('identity').textContent='';el('state').textContent='Sin consultar';el('result').textContent='Sesión cerrada.';}));
el('refresh').addEventListener('click',()=>run(refresh));
el('create').addEventListener('click',()=>{if(!confirm('Crear credencial FICTICIA cifrada y registros de prueba en gm_credential_test del Firebase real. No es una misión comercial. ¿Continuar?'))return;run(async()=>{const data=await request('create','CREAR CREDENCIAL FICTICIA');applyState(data);show(data);});});
el('reveal').addEventListener('click',()=>run(async()=>{const data=await request('reveal');applyState(data);show(data);if(data.http===200&&data.status==='revealed_synthetic'&&data.credential){el('sampleUser').value=data.credential.username;el('samplePass').value=data.credential.password;data.credential=null;el('secretBox').classList.remove('hidden');secretTimer=setTimeout(hideSecret,15000);}}));
el('close').addEventListener('click',()=>{if(!confirm('Se elimina el documento con la credencial cifrada. El piloto queda cerrado y no se puede reabrir desde esta página. Conserva el historial de auditoría. ¿Retirar?'))return;run(async()=>{const data=await request('close','RETIRAR CREDENCIAL FICTICIA');applyState(data);show(data);});});
el('hide').addEventListener('click',hideSecret);document.addEventListener('visibilitychange',()=>{if(document.hidden)hideSecret();});window.addEventListener('pagehide',hideSecret);
if(!eligible)el('result').textContent='Abre esta página en GitHub TEST. No se ejecutará desde otro origen o carpeta. Este bloqueo visual no sustituye los permisos del servidor.';
sync();

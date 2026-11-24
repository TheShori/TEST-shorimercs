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
const $=id=>document.getElementById(id),endpoint='https://najovisunas.synology.me:18443/api/r1/nas-test/phone-pilot';
let busy=false,generation=0,controller=null;
function disable(){for(const b of $('targets').querySelectorAll('button'))b.disabled=true;$('refresh').disabled=true;}
const statusText={not_attempted:'Todavía no se ha enviado.',attempting:'Intento iniciado; resultado pendiente. No se repetirá.',accepted:'Aceptado por WhatsApp. Confirma que ha llegado al móvil.',unknown:'Resultado no confirmado. No se repetirá el envío.'};
function render(data){
 if(data.version!=='phone-pilot-v15'||!Array.isArray(data.targets))throw Error('Respuesta no reconocida.');
 $('targets').replaceChildren();
 $('notice').textContent=data.active?'Piloto activo. Un solo intento por número.':'Piloto cerrado o pendiente de activación en el NAS.';
 for(const target of data.targets){
  if(!['mexico','espana'].includes(target.id))continue;
  const card=document.createElement('article'),title=document.createElement('h2'),state=document.createElement('p'),button=document.createElement('button');
  title.textContent=target.label;state.textContent=statusText[target.status]||'Resultado no reconocido.';
  card.className=target.status==='accepted'?'accepted':['unknown','attempting'].includes(target.status)?'uncertain':'';
  button.textContent=target.status==='not_attempted'?'Enviar 1 prueba a '+(target.id==='mexico'?'México':'España'):'Intento ya registrado';
  button.disabled=!(data.active&&target.canSend&&target.status==='not_attempted');button.addEventListener('click',()=>request('send',target.id));
  card.append(title,state,button);$('targets').append(card);
 }
}
async function request(action,target){
 if(busy||!auth.currentUser)return;
 busy=true;disable();const stamp=generation,user=auth.currentUser,current=new AbortController();controller=current;
 const timeout=setTimeout(()=>current.abort(),30000);
 $('notice').textContent=action==='send'?'Comprobando el destinatario y realizando un único intento…':'Consultando el estado…';
 try{
  const token=await user.getIdToken();if(stamp!==generation)return;
  const body=action==='send'?{mode:'phone-pilot-v15',action,target,confirm:'ENVIAR_UNA_PRUEBA'}:{mode:'phone-pilot-v15',action};
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:current.signal,cache:'no-store'});
  let data;try{data=await response.json();}catch{throw Error('El piloto V15 no está disponible. Completa la instalación y el reinicio del NAS.');}
  if(stamp!==generation)return;
  if(!response.ok)throw Error(data.error||'Operación rechazada. Consulta el estado antes de continuar.');
  render(data);
 }catch(e){if(stamp===generation){$('notice').textContent=(e.name==='AbortError'?'La respuesta ha tardado demasiado.':e instanceof TypeError?'No se pudo contactar con el NAS.':e.message)+(action==='send'?' Pulsa Actualizar estado para comprobar el resultado; no se reenvía automáticamente.':'');}}
 finally{clearTimeout(timeout);if(controller===current){busy=false;controller=null;$('refresh').disabled=false;}}
}
onAuthStateChanged(auth,user=>{
 generation++;controller?.abort();controller=null;busy=false;
 $('boot').hidden=true;$('login').hidden=!!user;$('panel').hidden=!user||user.email!=='victorsoripar@gmail.com';$('denied').hidden=!user||user.email==='victorsoripar@gmail.com';$('password').value='';$('targets').replaceChildren();$('notice').textContent='';
 if(user?.email==='victorsoripar@gmail.com')request('status');
});
$('refresh').addEventListener('click',()=>request('status'));
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginButton').disabled=true;$('loginError').textContent='';try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);}catch{$('loginError').textContent='No se pudo iniciar sesión. Revisa tus datos.';}finally{$('password').value='';$('loginButton').disabled=false;}});
for(const id of ['logout','logoutDenied'])$(id).addEventListener('click',()=>signOut(auth).catch(()=>{$('notice').textContent='No se pudo cerrar sesión. Inténtalo de nuevo.';}));

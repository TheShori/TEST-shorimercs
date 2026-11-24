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
const $=id=>document.getElementById(id),endpoint='https://najovisunas.synology.me:18443/api/r1/nas-test/phone-check';
let pending=null,generation=0;
onAuthStateChanged(auth,user=>{
 generation++;pending?.abort();pending=null;
 $('boot').hidden=true;$('login').hidden=!!user;$('check').hidden=!user||user.email!=='victorsoripar@gmail.com';$('denied').hidden=!user||user.email==='victorsoripar@gmail.com';
 $('result').hidden=true;$('result').textContent='';$('phone').value='';$('password').value='';$('checkButton').disabled=false;
});
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginButton').disabled=true;$('loginError').textContent='';try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);}catch{$('loginError').textContent='No se pudo iniciar sesión. Revisa tus datos o inténtalo más tarde.';}finally{$('password').value='';$('loginButton').disabled=false;}});
for(const id of ['logout','logoutDenied'])$(id).addEventListener('click',()=>signOut(auth).catch(()=>{$('boot').hidden=false;$('boot').textContent='No se pudo cerrar la sesión. Inténtalo de nuevo.';}));
$('phoneForm').addEventListener('submit',async e=>{
 e.preventDefault();if(pending||!auth.currentUser)return;
 const user=auth.currentUser,stamp=generation,controller=new AbortController();pending=controller;
 $('checkButton').disabled=true;$('result').hidden=false;$('result').className='';$('result').textContent='Comprobando el destinatario…';
 const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const token=await user.getIdToken();
  if(stamp!==generation)return;
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({mode:'phone-test-v14',phone:$('phone').value}),signal:controller.signal,cache:'no-store'});
  let data;try{data=await response.json();}catch{throw Error('El comprobador todavía no está disponible. Completa la instalación V14 en el NAS.');}
  if(!response.ok)throw Error(data.error||'No se pudo comprobar. Revisa la instalación V14 o vuelve a iniciar sesión.');
  if(data.version!=='phone-test-v14'||data.sent!==false||typeof data.registered!=='boolean')throw Error('Respuesta no reconocida. No se ha confirmado el destinatario.');
  if(stamp!==generation)return;
  $('result').className=data.registered?'ok':'error';
  $('result').textContent=data.registered?'WhatsApp reconoce este número.\n'+data.formatted+(data.adjusted?'\nSe ha identificado la representación compatible del número.':'')+'\nNo se ha enviado ningún mensaje.':'WhatsApp no ha encontrado este número.\nRevisa el prefijo y comprueba el número con su titular.\nNo se ha enviado ningún mensaje.';
 }catch(error){
  if(stamp!==generation)return;
  $('result').className='error';$('result').textContent=error.name==='AbortError'?'La comprobación ha tardado demasiado. Puedes intentarlo otra vez.':error instanceof TypeError?'No se pudo contactar con el NAS. Comprueba que la instalación V14 esté activa.':error.message;
 }finally{clearTimeout(timer);if(pending===controller){pending=null;$('checkButton').disabled=false;}}
});


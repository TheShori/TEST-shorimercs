import React, {useState,useRef,useEffect,useCallback} from 'react';
import {NAS_ORIGIN,verifyBackend,isManaged,missionData,credentialData,makeCommand} from './r1-client.mjs';
const h=React.createElement;
const box='rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs';
const button='rounded-lg px-3 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40';
export function useMissionR1(authUser,enabled){
 const [url,setUrl]=useState(()=>{try{return verifyBackend(sessionStorage.getItem('gm-test-whatsapp-url')||NAS_ORIGIN);}catch{return NAS_ORIGIN;}});
 const [missions,setMissions]=useState([]),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null),[secrets,setSecrets]=useState({}),[pending,setPending]=useState(false);
 const current=useRef(authUser),generation=useRef(0),pendingRef=useRef(null),lastRef=useRef(null),lock=useRef(false),timers=useRef(new Map());current.current=authUser;
 const clearSecrets=useCallback(()=>{for(const t of timers.current.values())clearTimeout(t);timers.current.clear();setSecrets({});},[]);
 useEffect(()=>{generation.current++;setMissions([]);setConnected(false);setError('');setResult(null);pendingRef.current=null;lastRef.current=null;setPending(false);clearSecrets();},[authUser?.uid,clearSecrets]);
 useEffect(()=>{const hide=()=>clearSecrets();window.addEventListener('blur',hide);document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('blur',hide);document.removeEventListener('visibilitychange',hide);for(const t of timers.current.values())clearTimeout(t);};},[clearSecrets]);
 async function send(body){
   if(!enabled||location.hostname!=='theshori.github.io'||!location.pathname.startsWith('/TEST-shorimercs/'))throw Error('Esta versión solo se habilita en GitHub TEST.');
   const bodyText=JSON.stringify(body);
   if(new TextEncoder().encode(bodyText).length>9000)throw Error('Formulario demasiado grande para TEST. Reduce textos o subtareas antes de guardar.');
   const origin=verifyBackend(url),u=current.current,g=generation.current;if(!u?.getIdToken)throw Error('Inicia sesión con Firebase.');
   const token=await u.getIdToken();if(current.current?.uid!==u.uid||generation.current!==g)throw Error('La sesión cambió.');
   const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);let response,data;
   try{response=await fetch(origin+'/api/r1/test-missions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:bodyText,cache:'no-store',mode:'cors',redirect:'error',signal:c.signal});data=await response.json();}
   catch{const e=Error('Resultado no confirmado: usa «Repetir misma petición» y no cierres esta pestaña.');e.uncertain=true;throw e;}finally{clearTimeout(t);}
   if(!response.ok){const e=Error(data.error||'La consulta fue rechazada.');e.code=data.code;e.uncertain=response.status>=500;throw e;}
   if(current.current?.uid!==u.uid||generation.current!==g)throw Error('La sesión cambió; no se muestran datos anteriores.');
   return data;
 }
 async function refresh(){try{const g=generation.current;const data=await send({action:'list'});if(data.status!=='listed'||!Array.isArray(data.missions)||data.scope!=='gm_r1_integration/test')throw Error('Formato de respuesta inesperado.');if(g!==generation.current)return;clearSecrets();setMissions(data.missions);setConnected(true);setError('');try{sessionStorage.setItem('gm-test-whatsapp-url',verifyBackend(url));}catch{};return data;}
 catch(e){setError(e.message);setConnected(false);throw e;}}
 async function load(){if(lock.current)return;lock.current=true;setBusy(true);setResult(null);try{await refresh();}catch{}finally{setBusy(false);lock.current=false;}}
 async function execute(command){
   if(lock.current)throw Error('Hay otra operación en curso.');if(pendingRef.current&&pendingRef.current.requestId!==command.requestId)throw Error('Primero resuelve la petición pendiente.');
   lock.current=true;setBusy(true);setError('');setResult(null);const g=generation.current;
   try{const data=await send(command);pendingRef.current=null;setPending(false);lastRef.current=command;setResult(data);try{await refresh();}catch{}return data;}
   catch(e){if(g===generation.current){if(e.uncertain){pendingRef.current=command;setPending(true);}else{pendingRef.current=null;setPending(false);}setError(e.message);}throw e;}
   finally{lock.current=false;setBusy(false);}
 }
 async function mutate(action,mission,data){if(!connected)throw Error('Primero conecta el flujo R1 con el NAS.');if(mission&&!isManaged(mission))throw Error('Encargo real: solo lectura en esta versión TEST.');return execute(makeCommand(action,mission,data,crypto.randomUUID()));}
 async function retry(){const req=pendingRef.current||lastRef.current;if(!req)return;try{await execute(req);}catch{};}
 async function save(mission,form,list,mode){const res=await mutate(mission?'edit':'create',mission,{mission:missionData(form,list),credential:credentialData(mode,form)});return res;}
 async function reveal(m){if(!isManaged(m))throw Error('Credenciales comerciales fuera de esta integración.');if(lock.current)throw Error('Espera a la operación en curso.');lock.current=true;setBusy(true);setError('');const g=generation.current;
 try{const data=await send({action:'reveal',missionId:m.id});if(data.status!=='revealed'||!data.credential)throw Error('No se ha recuperado la credencial.');if(g!==generation.current)return;const old=timers.current.get(m.id);if(old)clearTimeout(old);setSecrets(s=>({...s,[m.id]:data.credential}));timers.current.set(m.id,setTimeout(()=>{setSecrets(s=>{const c={...s};delete c[m.id];return c;});timers.current.delete(m.id);},15000));return data.credential;}
 catch(e){setError(e.message);throw e;}finally{lock.current=false;setBusy(false);}}
 function hide(id){const t=timers.current.get(id);if(t)clearTimeout(t);timers.current.delete(id);setSecrets(s=>{const c={...s};delete c[id];return c;});}
 function changeUrl(value){if(busy||pendingRef.current)return;setUrl(value);setConnected(false);clearSecrets();setMissions([]);lastRef.current=null;setResult(null);}
 return {url,setUrl:changeUrl,missions,connected,busy,error,result,pending,hasLast:!!lastRef.current,load,retry,mutate,save,reveal,hide,secrets,clearSecrets,isManaged};
}
export function R1IntegrationBar({r1}){
 return h('section',{className:'max-w-7xl mx-auto px-4 pt-4'},h('div',{className:'rounded-xl border border-amber-500/40 bg-slate-900 p-4 space-y-2'},
 h('h2',{className:'text-sm font-extrabold text-amber-300'},'R1 · Integración en formularios · SOLO TEST'),
 h('p',{className:'text-xs text-slate-300'},'Encargos reales: solo lectura aquí. Las nuevas misiones del formulario se guardan en un espacio TEST separado, sin WhatsApp ni importes reales. Producción no se modifica.'),
 h('div',{className:'flex gap-2 flex-wrap'},h('input',{type:'url','aria-label':'Servidor R1 en el NAS',value:r1.url,disabled:r1.busy||r1.pending,onChange:e=>r1.setUrl(e.target.value),placeholder:NAS_ORIGIN,className:box+' min-w-[250px] flex-1'}),h('button',{type:'button',onClick:r1.load,disabled:r1.busy||!r1.url||r1.pending,className:button},r1.busy?'Procesando…':'Conectar / actualizar R1')),
 h('p',{className:'text-[11px] text-slate-400'},r1.connected?'Conectado al flujo de misiones TEST. Usa los formularios y tarjetas habituales.':'Conecta con el NAS usando tu sesión de Firebase. No necesitas introducir la clave de Make.'),
 r1.error?h('p',{role:'alert',className:'text-xs text-rose-300'},r1.error):null,
 (r1.pending||r1.hasLast)?h('button',{type:'button',disabled:r1.busy,onClick:r1.retry,className:button+' bg-amber-700'},r1.pending?'Repetir misma petición PENDIENTE':'Comprobar repetición de la última petición'):null,
 r1.pending?h('p',{className:'text-xs text-amber-300'},'No prepares otra operación, no cierres sesión ni esta pestaña hasta aclarar el resultado. La petición solo se conserva en memoria.'):null,
 r1.result?h('p',{className:'text-xs text-emerald-300','data-testid':'r1-last-result'},'Resultado: '+r1.result.status+' · revisión '+r1.result.revision+' · SIN WHATSAPP'):null,
 h(R1SavedNotice,{result:r1.result})));
}
export function checkedNotice(result){
 if(!result||!['committed_test','duplicate'].includes(result.status)||!['status','checklist'].includes(result.action)||
   !['status-events-test-v1','events-test-v2'].includes(result.apiVersion)||result.willSend!==false||result.commercialWrites!==false||
   !Number.isSafeInteger(result.revision)||result.revision<1||
   !/^mission-r1-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(result.missionId||''))return null;
 const n=result.notice;
 const states={mission_started:'En Progreso',mission_resumed:'En Progreso',mission_paused:'En Pausa',mission_completed:'Completada'};
 if(!n||
   n.notForDelivery!==true||n.dispatchStatus!=='blocked_integration_test'||
   typeof n.id!=='string'||!/^[0-9a-f]{64}$/.test(n.id)||n.id!==result.receiptId||
   typeof n.message!=='string'||!n.message.trim()||n.message.length>6000)return null;
 let progress=null;
 if(result.action==='checklist'){
   const p=n.progress;
   if(result.apiVersion!=='events-test-v2'||n.type!=='checklist_step'||n.previousStatus!==n.status||!['Pendiente','En Progreso','En Pausa'].includes(n.status)||
      !p||typeof p.itemId!=='string'||!/^chk-[A-Za-z0-9_-]{1,100}$/.test(p.itemId)||typeof p.itemText!=='string'||!p.itemText.trim()||p.itemText.length>180||
      !Number.isSafeInteger(p.done)||!Number.isSafeInteger(p.total)||p.total<1||p.total>50||p.done<1||p.done>p.total||p.percent!==Math.round(p.done/p.total*100))return null;
   progress={itemText:p.itemText,done:p.done,total:p.total,percent:p.percent};
 }else if(!Object.hasOwn(states,n.type)||n.status!==states[n.type]||!['Pendiente','En Progreso','En Pausa'].includes(n.previousStatus)||n.previousStatus===n.status)return null;
 return {message:n.message,previousStatus:n.previousStatus,status:n.status,revision:result.revision,duplicate:result.status==='duplicate',progress};
}
export function R1SavedNotice({result}){
 const n=checkedNotice(result);
 if(!n){
  if(['status','checklist'].includes(result?.action)&&['committed_test','duplicate'].includes(result.status)&&result.notice){
   return h('p',{role:'alert',className:'text-xs text-amber-300'},'El cambio tiene respuesta, pero no se ha podido validar el aviso recibido. No repitas la operación: comparte esta pantalla.');
  }
  return null;
 }
 return h('section',{'aria-label':'Aviso guardado en TEST','data-testid':'r1-saved-notice',className:'rounded-xl border border-emerald-500/30 bg-slate-950 p-4 space-y-3'},
  h('h3',{className:'font-bold text-emerald-300'},'Aviso guardado en TEST · Sin envío'),
  h('p',{className:'text-xs text-slate-300'},(n.progress?'Subtarea completada · '+n.progress.done+'/'+n.progress.total+' ('+n.progress.percent+'%) · '+n.status:n.previousStatus+' → '+n.status)+' · revisión '+n.revision),
  h('pre',{className:'whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-100'},n.message),
  n.duplicate?h('p',{className:'text-xs text-amber-300'},'Petición repetida: se muestra el aviso original guardado para esta revisión.'):null,
  h('p',{className:'text-xs text-slate-400'},'Guardado con el cambio de la misión. Envío bloqueado en TEST. Se muestra el resultado de esta petición, no un historial.'));
}
export function R1CredentialCard({r1,mission}){
 if(!isManaged(mission))return h('div',{className:'rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400'},'Encargo real · solo lectura en esta versión TEST. No se consultan sus credenciales desde R1.');
 const c=r1.secrets[mission.id];
 async function copy(value){try{await navigator.clipboard.writeText(value);}catch{alert('No se pudo copiar. Selecciona el valor visible manualmente.');}}
 return h('div',{className:'rounded-xl border border-indigo-500/30 bg-slate-950 p-3 space-y-2 text-xs'},
 h('div',{className:'flex items-center justify-between gap-2'},h('strong',null,'Credencial protegida · TEST'),h('span',{className:'text-slate-400'},mission.credentialState)),
 c?h('div',{className:'space-y-2'},h('p',{className:'font-mono break-all'},c.username),h('p',{className:'font-mono text-amber-300 break-all'},c.password),h('div',{className:'flex gap-2'},h('button',{type:'button',onClick:()=>copy(c.username),className:button},'Copiar usuario'),h('button',{type:'button',onClick:()=>copy(c.password),className:button},'Copiar contraseña'),h('button',{type:'button',onClick:()=>r1.hide(mission.id),className:button},'Ocultar')),h('p',{className:'text-slate-500 text-[11px]'},'Se oculta en 15 s o al perder el foco. Esto no borra el portapapeles ni las respuestas del navegador.')):
 h('button',{type:'button',disabled:r1.busy||mission.credentialState!=='stored'||mission.status==='Completada',onClick:()=>r1.reveal(mission).catch(()=>{}),className:button},'Revelar durante 15 s'),
 h('p',{className:'text-slate-500 text-[11px]'},'ID '+mission.id+' · revisión '+mission.r1Revision));
}

import React,{useState,useRef,useEffect,useCallback} from 'react';
import {RehearsalClient,makeTransport,isManaged,ADMIN,UUID} from './r1-formularios-client.mjs?v=1';
const h=React.createElement;
const button='rounded-lg px-3 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40';
const EMPTY={runId:'',missions:[],workers:[],tags:[],busy:false,connected:false,pending:null,last:null,result:null,error:''};
const STORAGE='gm-r1-formularios-ensayo-v1';
function stored(){try{const x=JSON.parse(sessionStorage.getItem(STORAGE)||'{}');return UUID.test(x.runId)?{runId:x.runId,seedRequestId:UUID.test(x.seedRequestId)?x.seedRequestId:''}:{};}catch{return {};}}
export function useMissionR1(authUser,enabled){
 const [state,setState]=useState(EMPTY),[secrets,setSecrets]=useState({}),[error,setError]=useState('');
 const engine=useRef(null),current=useRef(authUser),timers=useRef(new Map());current.current=authUser;
 const clearSecrets=useCallback(()=>{for(const t of timers.current.values())clearTimeout(t);timers.current.clear();setSecrets({});},[]);
 useEffect(()=>{
  clearSecrets();setError('');if(!enabled||!authUser){setState(EMPTY);return;}
  let alive=true;const uid=authUser.uid;
  const client=new RehearsalClient({...stored(),send:makeTransport({getUser:()=>current.current,isCurrent:()=>alive&&current.current?.uid===uid}),onChange:s=>{if(alive&&current.current?.uid===uid)setState({...s,owner:uid});},onRun:(runId,seedRequestId)=>{try{sessionStorage.setItem(STORAGE,JSON.stringify({runId,seedRequestId}));}catch{}}});
  engine.current=client;setState({...client.state,owner:uid});
  return()=>{alive=false;client.dispose();if(engine.current===client)engine.current=null;};
 },[authUser?.uid,enabled,clearSecrets]);
 useEffect(()=>{const hide=()=>clearSecrets();const unload=e=>{if(engine.current?.state.pending||engine.current?.state.busy){e.preventDefault();e.returnValue='';}};window.addEventListener('blur',hide);document.addEventListener('visibilitychange',hide);window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('blur',hide);document.removeEventListener('visibilitychange',hide);window.removeEventListener('beforeunload',unload);for(const t of timers.current.values())clearTimeout(t);};},[clearSecrets]);
 async function call(method,...args){setError('');clearSecrets();try{if(!engine.current)throw Error('Espera a que se confirme tu sesión.');return await engine.current[method](...args);}catch(e){setError(e.message);throw e;}}
 async function reveal(m){setError('');const client=engine.current;try{if(!client)throw Error('Inicia sesión.');const c=await client.reveal(m);if(!c||engine.current!==client||!client.active)return;setSecrets(s=>({...s,[m.id]:c}));clearTimeout(timers.current.get(m.id));timers.current.set(m.id,setTimeout(()=>hide(m.id),15000));return c;}catch(e){setError(e.message);throw e;}}
 function hide(id){clearTimeout(timers.current.get(id));timers.current.delete(id);setSecrets(s=>{const n={...s};delete n[id];return n;});}
 const view=state.owner===authUser?.uid?state:EMPTY;
 return {...view,error:error||view.error,pending:!!view.pending,hasLast:!!view.last,secrets:view===EMPTY?{}:secrets,isAdmin:authUser?.email?.toLowerCase()===ADMIN,load:()=>call('load',authUser?.email?.toLowerCase()===ADMIN),setRun:id=>call('setRun',id),retry:()=>call('retry'),save:(...a)=>call('save',...a),mutate:(...a)=>call('mutate',...a),batch:(...a)=>call('batch',...a),reveal,hide,clearSecrets,isManaged};
}
export function R1IntegrationBar({r1}){
 const [draft,setDraft]=useState('');useEffect(()=>setDraft(r1.runId),[r1.runId]);
 const safe=fn=>()=>Promise.resolve().then(fn).catch(()=>{});
 return h('section',{className:'max-w-7xl mx-auto px-4 pt-4'},h('div',{className:'rounded-xl border border-amber-500/50 bg-slate-900 p-4 space-y-3'},
  h('h2',{className:'text-lg font-extrabold text-amber-300'},'Formularios de ensayo · Sin envíos'),
  h('p',{className:'text-sm text-slate-200'},'Tus formularios habituales con misiones e importes ficticios. Las liquidaciones y los cambios de perfiles o etiquetas afectan solo a sus copias de ensayo.'),
  h('div',{className:'flex flex-wrap gap-2 items-center'},h('label',{className:'text-sm flex-1 min-w-[200px]'},'Identificador del ensayo',h('input',{className:'block w-full mt-1 rounded-lg bg-slate-950 border border-slate-600 px-3 py-2 font-mono text-sm',value:draft,disabled:r1.busy||r1.pending,onChange:e=>setDraft(e.target.value.trim()),placeholder:'Se crea al preparar el ensayo'})),
   h('button',{className:button,disabled:r1.busy||r1.pending||draft===r1.runId||!UUID.test(draft),onClick:safe(()=>r1.setRun(draft))},'Usar identificador'),
   h('button',{className:button,disabled:r1.busy||r1.pending||draft!==r1.runId||(!r1.runId&&!r1.isAdmin),onClick:safe(r1.load)},r1.busy?'Procesando…':r1.runId?'Conectar / actualizar ensayo':'Preparar ensayo')),
  h('p',{className:'text-sm text-slate-300'},r1.connected?'Conectado. Puedes usar Nueva misión, las tarjetas, Etiquetas y Mercs. Actualiza el ensayo para ver cambios de otra sesión.':'El administrador prepara el ensayo una vez. Para probar como mercenario, usa el mismo identificador con su cuenta.'),
  r1.error?h('p',{role:'alert',className:'text-sm text-rose-300'},r1.error):null,
  (r1.pending||r1.hasLast)?h('button',{className:button,disabled:r1.busy,onClick:safe(r1.retry)},r1.pending?'Reanudar la misma petición':'Comprobar repetición de la última petición'):null,
  r1.pending?h('p',{className:'text-sm text-amber-200'},'Hay un resultado pendiente. Mantén esta pestaña y sesión abiertas; no prepares otra operación.'):null,
  r1.result?h('div',{className:'rounded-lg bg-slate-950 p-3 space-y-2','data-testid':'r1-result'},h('p',{role:'status',className:'text-sm text-emerald-300'},'Confirmado: '+r1.result.status+' · '+(r1.result.action||'ensayo preparado')+' · Sin WhatsApp'),
   r1.result.settlement?h('p',{className:'font-bold'},'Liquidación ficticia: '+(r1.result.settlement.amountCentsUSD/100).toFixed(2)+' USD'):null,
   r1.result.notice?.dispatchStatus==='blocked_commercial_rehearsal'?h('pre',{className:'whitespace-pre-wrap break-words text-sm font-sans'},r1.result.notice.message):null):null,
  h('p',{className:'text-xs text-slate-400'},'Se conserva el identificador en esta pestaña. Los resultados pendientes y las credenciales no se guardan en el almacenamiento del navegador.')));
}
export function R1CredentialCard({r1,mission}){
 if(!isManaged(mission))return null;const c=r1.secrets[mission.id];
 const copy=value=>navigator.clipboard.writeText(value).catch(()=>alert('No se pudo copiar. Selecciona el valor visible.'));
 return h('div',{className:'rounded-xl border border-indigo-500/40 bg-slate-950 p-3 space-y-2 text-sm'},
  h('strong',null,'Credencial ficticia · '+mission.credentialState),
  c?h('div',{className:'space-y-2'},h('p',{className:'break-all font-mono'},c.username),h('p',{className:'break-all font-mono text-amber-200'},c.password),h('div',{className:'flex flex-wrap gap-2'},h('button',{className:button,type:'button',onClick:()=>copy(c.username)},'Copiar usuario'),h('button',{className:button,type:'button',onClick:()=>copy(c.password)},'Copiar contraseña'),h('button',{className:button,type:'button',onClick:()=>r1.hide(mission.id)},'Ocultar'))):h('button',{className:button,type:'button',disabled:r1.busy||r1.pending||!r1.connected||mission.credentialState!=='stored'||mission.status==='Completada',onClick:()=>r1.reveal(mission).catch(()=>{})},'Revelar durante 15 s'),
  h('p',{className:'text-xs text-slate-400'},'Se oculta al perder el foco o en 15 segundos. El portapapeles no se borra automáticamente.'));
}

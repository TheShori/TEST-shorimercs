import React,{useState,useRef,useEffect} from 'react';
import {PreviewClient,makeTransport,isManaged,ADMIN} from './r1-comercial-client.mjs?v=1';
const h=React.createElement,EMPTY={missions:[],workers:[],tags:[],busy:false,connected:false,error:'',role:null,observedAt:null};
export function useMissionR1(authUser,enabled){
 const [state,setState]=useState(EMPTY),current=useRef(authUser),engine=useRef(null);current.current=authUser;
 useEffect(()=>{setState(EMPTY);if(!enabled||!authUser)return;let alive=true;const uid=authUser.uid;
  const client=new PreviewClient({send:makeTransport({getUser:()=>current.current,isCurrent:()=>alive&&current.current?.uid===uid}),onChange:s=>{if(alive&&current.current?.uid===uid)setState({...s,owner:uid});}});engine.current=client;
  client.load().catch(()=>{});return()=>{alive=false;client.dispose();if(engine.current===client)engine.current=null;};
 },[authUser?.uid,enabled]);
 const v=state.owner===authUser?.uid?state:EMPTY;
 const blocked=async()=>{throw Error('Vista previa comercial: las acciones se habilitarán tras la migración.');};
 return {...v,isAdmin:v.role==='admin',isManaged,secrets:{},pending:false,hasLast:false,result:null,readOnly:true,runId:'',load:()=>engine.current?.load(),mutate:blocked,save:blocked,batch:blocked,reveal:blocked,retry:blocked,setRun:blocked,hide:()=>{},clearSecrets:()=>{}};
}
export function R1IntegrationBar({r1}){
 return h('section',{className:'max-w-7xl mx-auto px-4 pt-4'},h('div',{className:'rounded-xl border border-cyan-500/50 bg-slate-900 p-4 space-y-3'},
  h('h2',{className:'text-lg font-extrabold text-cyan-300'},'Conexión comercial · Vista previa'),
  h('p',{className:'text-sm text-slate-200'},'Misiones reales en tu panel habitual. Esta versión permite consultar y filtrar; todavía no permite modificar, liquidar, revelar credenciales ni enviar mensajes.'),
  h('button',{className:'rounded-lg px-4 py-2 font-bold bg-indigo-600 disabled:opacity-40',disabled:r1.busy,onClick:()=>r1.load()?.catch(()=>{})},r1.busy?'Consultando…':'Actualizar'),
  h('p',{role:'status',className:'text-sm text-emerald-300'},r1.connected?'Conectado · '+r1.missions.length+' misiones accesibles · '+(r1.role==='admin'?'Administrador':'Solo tus misiones'):'Esperando conexión'),
  r1.connected?h('p',{className:'text-xs text-slate-400'},'Última consulta: '+new Date(r1.observedAt).toLocaleString('es-ES')+'. Los filtros pueden mostrar menos misiones. Actualiza para ver cambios realizados desde la web habitual.'):null,
  r1.error?h('p',{role:'alert',className:'text-rose-300 text-sm'},r1.error):null));
}
export function R1CredentialCard({mission}){return h('div',{className:'rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-400'},mission.credentialState==='retired'?'Credencial retirada · Solo consulta':'Credencial oculta · Disponible tras completar la migración');}

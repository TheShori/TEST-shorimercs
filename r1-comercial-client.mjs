export const VERSION='commercial-preview-v1',SCOPE='commercial-preview';
export const ENDPOINT='https://najovisunas.synology.me:18443/api/r1/commercial-preview';
export const ADMIN='victorsoripar@gmail.com';
const fail=message=>{throw Error(message);};
export const isManaged=()=>false;
export function makeTransport({getUser,isCurrent,fetcher=fetch,locationCheck=()=>location.origin==='https://theshori.github.io'&&location.pathname==='/TEST-shorimercs/r1-comercial-panel.html'}){
 return async body=>{
  if(!locationCheck())fail('Esta página solo funciona en TEST.');
  if(!body||body.action!=='list'||Object.keys(body).length!==1)fail('Vista previa: solo consulta.');
  const user=getUser();if(!user?.getIdToken||!isCurrent())fail('Inicia sesión de nuevo.');
  const token=await user.getIdToken();if(!isCurrent()||getUser()?.uid!==user.uid)fail('La sesión cambió.');
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),30000);let response,data;
  try{response=await fetcher(ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{"action":"list"}',cache:'no-store',redirect:'error',signal:c.signal});data=await response.json();}
  catch{fail('No se pudo consultar el NAS. Pulsa Actualizar para intentarlo de nuevo.');}finally{clearTimeout(timer);}
  if(!isCurrent()||getUser()?.uid!==user.uid)fail('La sesión cambió.');
  if(!response.ok){const messages={AUTH:'Inicia sesión de nuevo.',FORBIDDEN:'No se pudo confirmar un perfil activo y único para esta cuenta.',READ_ONLY:'Esta versión solo permite consultas.',RATE_LIMIT:'Espera un minuto antes de actualizar.'};fail(messages[data?.code]||'Consulta no disponible ('+response.status+').');}
  if(data?.apiVersion!==VERSION||data.scope!==SCOPE||data.status!=='listed'||data.readOnly!==true||data.willSend!==false||data.commercialWrites!==false||!['admin','worker'].includes(data.role)||!Array.isArray(data.missions)||!Array.isArray(data.workers)||!Array.isArray(data.tags))fail('Respuesta de consulta no válida.');
  for(const m of data.missions)if(!m||typeof m.id!=='string'||m.accountUser!==''||m.accountPass!==''||m.readOnly!==true)fail('Respuesta de misión no válida.');
  return data;
 };
}
export class PreviewClient{
 constructor({send,onChange=()=>{}}){this.send=send;this.onChange=onChange;this.active=true;this.state={missions:[],workers:[],tags:[],connected:false,busy:false,error:'',role:null,observedAt:null};}
 emit(patch){if(this.active){Object.assign(this.state,patch);this.onChange({...this.state});}}
 async load(){if(!this.active||this.state.busy)return;this.emit({busy:true,error:''});try{const r=await this.send({action:'list'});this.emit({missions:r.missions,workers:r.workers,tags:r.tags,role:r.role,observedAt:r.observedAt,connected:true});return r;}catch(e){this.emit({missions:[],workers:[],tags:[],connected:false,role:null,observedAt:null,error:e.message});throw e;}finally{this.emit({busy:false});}}
 dispose(){this.active=false;this.state={missions:[],workers:[],tags:[],connected:false,busy:false,error:'',role:null,observedAt:null};}
}

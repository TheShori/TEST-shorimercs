// Funciones sin Firebase/React. Ninguna guarda tokens ni contraseñas en almacenamiento web.
export const FIXED_USER='r1-test@example.invalid';
export const TEST_PASSWORD_A='FICTICIA-R1-A';
export const TEST_PASSWORD_B='FICTICIA-R1-B';
export const NAS_ORIGIN='https://najovisunas.synology.me:18443';
export function verifyBackend(value){
 let u;
 try{u=new URL(String(value||'').trim());}catch{throw Error('Usa la dirección HTTPS del NAS: '+NAS_ORIGIN+', sin /send.');}
 if(u.origin!==NAS_ORIGIN||u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname))throw Error('Usa la dirección HTTPS del NAS: '+NAS_ORIGIN+', sin /send.');
 return u.origin;
}
export function isManaged(m){return !!m&&m.r1Managed===true&&typeof m.id==='string'&&m.id.startsWith('mission-r1-');}
export function missionData(form,list){return {clientName:form.clientName,clientPhone:form.clientPhone||'',clientContact:form.clientContact||'',missionTitle:form.missionTitle,gameCategory:form.gameCategory||'Exploración de Actos',loginMethod:form.loginMethod||'Kabam ID',instructions:form.instructions||'',priority:form.priority||'Normal',workerId:form.workerId||'unassigned',priceTotalEUR:Number(form.priceTotalEUR)||0,workerPayUSD:Number(form.workerPayUSD)||0,paymentMethod:form.paymentMethod==='PayPal'?'PayPal':'Bizum',tags:Array.isArray(form.tags)?form.tags:[],checklist:Array.isArray(list)?list:[]};}
export function credentialData(mode,form){if(mode==='keep')return {mode:'keep'};if(mode==='remove')return {mode:'remove'};if(mode!=='replace')throw Error('Selecciona conservar, sustituir o retirar.');if(form.accountUser!==FIXED_USER||![TEST_PASSWORD_A,TEST_PASSWORD_B].includes(form.accountPass))throw Error('Solo usuario y contraseña ficticios del aviso. Nunca datos de clientes en esta versión TEST.');return {mode:'replace',username:form.accountUser,password:form.accountPass};}
export function makeCommand(action,mission,data,requestId){return {action,requestId,...(mission?{missionId:mission.id,expectedRevision:mission.r1Revision}:{}),data};}

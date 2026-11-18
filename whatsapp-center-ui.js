// GestiónMercenarios 1D.7 — Centro WhatsApp en Synology NAS, GitHub TEST (18/11/2026).
// Solo consulta al backend con Firebase ID token. No envía WhatsApp ni escribe datos.
import React, { useMemo, useState } from 'react';
const h = React.createElement;
const TEST_HOST = 'theshori.github.io';
const TYPES = {
  mission_started: 'Inicio de misión',
  mission_paused: 'Pausa',
  mission_resumed: 'Reanudación',
  mission_completed: 'Misión completada',
  checklist_step: 'Subtarea completada'
};
const NAS_ORIGIN = 'https://najovisunas.synology.me:18443';
function verifyOrigin(value) {
  let url;
  try { url = new URL(String(value || '').trim()); }
  catch (_) { throw new Error('Usa la dirección HTTPS del NAS: '+NAS_ORIGIN+', sin /send.'); }
  if (url.origin !== NAS_ORIGIN || url.username || url.password ||
      (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new Error('Usa la dirección HTTPS del NAS: '+NAS_ORIGIN+', sin /send.');
  }
  return url.origin;
}
function dateLabel(value) {
  try { return new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }); }
  catch (_) { return 'Fecha no disponible'; }
}
function tone(status) {
  return status === 'ready' ? 'text-emerald-300' : status === 'unavailable' ? 'text-rose-300' : 'text-slate-400';
}
function Pill({ label, color='indigo' }) {
  const map = { emerald:'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber:'bg-amber-500/15 text-amber-300 border-amber-500/30',
    indigo:'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    rose:'bg-rose-500/15 text-rose-300 border-rose-500/30' };
  return h('span', {className:'inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-bold '+map[color]}, label);
}
function Metric({ caption, value, note, color='white' }) {
  return h('div',{className:'rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-4'},
    h('div',{className:'text-xs font-bold uppercase tracking-wide text-slate-400'},caption),
    h('div',{className:'mt-2 text-2xl font-extrabold '+(color==='green'?'text-emerald-300':'text-white')},value),
    h('div',{className:'mt-1 text-[11px] text-slate-500'},note));
}
export function WhatsAppCenter({ authUser }) {
  const onTest = location.hostname === TEST_HOST && location.pathname.startsWith('/TEST-shorimercs/');
  const [url, setUrl] = useState(() => { try { return verifyOrigin(sessionStorage.getItem('gm-test-whatsapp-url') || NAS_ORIGIN); } catch (_) {return NAS_ORIGIN;} });
  const [busy,setBusy] = useState(false);
  const [err,setErr] = useState('');
  const [snapshot,setSnapshot] = useState(null);
  const [source,setSource] = useState('audit');
  const [type,setType] = useState('ALL');
  const [missionFilter,setMissionFilter] = useState('');
  const [dateFilter,setDateFilter] = useState('ALL');
  const [lastFetch,setLastFetch] = useState('');
  async function load() {
    setBusy(true); setErr('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      if (!onTest) throw new Error('Este módulo solo se habilita en GitHub TEST.');
      if (!authUser || typeof authUser.getIdToken !== 'function') throw new Error('Inicia sesión como administrador en Firebase.');
      const origin = verifyOrigin(url);
      const token = await authUser.getIdToken();
      const res = await fetch(origin+'/api/admin/whatsapp-center', {
        method:'GET', headers:{Authorization:'Bearer '+token},
        cache:'no-store', mode:'cors', signal:controller.signal
      });
      const body = await res.json();
      if (!res.ok) throw new Error(res.status === 403 ? 'Acceso denegado: solo el UID administrador puede consultar el historial.' :
        res.status === 401 ? 'Sesión de Firebase no válida. Vuelve a iniciar sesión.' :
        (body?.error || 'No se ha podido cargar el historial. HTTP '+res.status));
      if (body.schema !== 'gestionmercenarios-whatsapp-center-v1') throw new Error('El servidor no devuelve el formato esperado.');
      setSnapshot(body);
      setLastFetch(new Date().toISOString());
      try { sessionStorage.setItem('gm-test-whatsapp-url',origin); } catch (_) {}
    } catch (e) {
      setSnapshot(null);
      setErr(e.name === 'AbortError' ? 'El servidor no responde. Comprueba la conexión y el contenedor whatsapp-local en el NAS.' : (e.message || 'Error de conexión'));
    } finally { clearTimeout(timer); setBusy(false); }
  }
  const entries = useMemo(() => {
    const original = source === 'audit' ? (snapshot?.observations?.items || []) : (snapshot?.acceptedSends?.items || []);
    const from = dateFilter === '1' ? Date.now()-86400000 : dateFilter === '7' ? Date.now()-7*86400000 : null;
    return original.filter(item => {
      if (source === 'audit' && type !== 'ALL' && item.type !== type) return false;
      if (source === 'audit' && missionFilter.trim() && !item.missionRef.includes(missionFilter.trim().toLowerCase())) return false;
      if (from && new Date(item.at).getTime() < from) return false;
      return true;
    });
  }, [snapshot,source,type,missionFilter,dateFilter]);
  const entrySource = source === 'audit' ? snapshot?.observations : snapshot?.acceptedSends;
  return h('section',{className:'space-y-4'},
    h('div',{className:'rounded-2xl border border-indigo-500/35 bg-slate-900 p-5 space-y-2'},
      h('div',{className:'flex flex-wrap items-center justify-between gap-2'},
        h('h2',{className:'text-lg font-extrabold'},'📨 Centro de Control de WhatsApp'),
        h(Pill,{label:'SOLO LECTURA · TEST',color:'indigo'})),
      h('p',{className:'text-xs leading-relaxed text-slate-300'},'Los cambios de misión observados y los envíos aceptados por Baileys son historiales distintos. No confirman entregas al cliente, ni permiten atribuir un cambio a un mercenario.'),
      h('div',{className:'grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 pt-2'},
        h('label',{className:'text-xs font-semibold text-slate-400 space-y-1'},
          h('span',null,'URL del servidor WhatsApp en el NAS (sin /send)'),
          h('input',{type:'url',value:url,autoComplete:'off',placeholder:NAS_ORIGIN,
            onChange:e=>setUrl(e.target.value),className:'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white outline-none focus:border-indigo-400'})),
        h('button',{type:'button',disabled:busy||!url.trim()||!onTest,onClick:load,
          className:'rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-4 py-2.5 text-xs font-extrabold self-end'},
          busy?'Consultando...':'↻ Actualizar historial')),
      h('p',{className:'text-[11px] text-amber-300'},'Servidor configurado: Synology NAS. La consulta utiliza tu sesión de Firebase; no necesitas introducir la clave de Make.'),
      lastFetch ? h('p',{className:'text-[11px] text-slate-500'},'Última consulta: '+dateLabel(lastFetch)) : null,
      err ? h('div',{role:'alert',className:'rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3'},err) : null),
    snapshot ? h(React.Fragment,null,
      h('div',{className:'grid grid-cols-1 sm:grid-cols-3 gap-3'},
        h(Metric,{caption:'Eventos observados',value:snapshot.observations.total ?? 'N/D',note:'Solo cambios detectados; no envíos',color:'green'}),
        h(Metric,{caption:'Aceptados por Baileys',value:snapshot.acceptedSends.total ?? 'N/D',note:'Solo /send con ID persistido; no entrega confirmada'}),
        h(Metric,{caption:'Conexión WhatsApp',value:snapshot.connection === 'connected'?'Conectado':'Desconectado',note:'Estado al consultar'})),
      h('div',{className:'rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3'},
        h('div',{className:'flex flex-wrap gap-2'},
          h('button',{type:'button',onClick:()=>setSource('audit'),className:'rounded-lg px-3 py-2 text-xs font-bold '+(source==='audit'?'bg-indigo-600 text-white':'bg-slate-800 text-slate-300')},'🔎 Cambios observados'),
          h('button',{type:'button',onClick:()=>setSource('sent'),className:'rounded-lg px-3 py-2 text-xs font-bold '+(source==='sent'?'bg-indigo-600 text-white':'bg-slate-800 text-slate-300')},'💬 Aceptados por Baileys')),
        h('div',{className:'flex flex-wrap items-center gap-2'},
          h('select',{value:dateFilter,onChange:e=>setDateFilter(e.target.value),className:'bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs'},
            h('option',{value:'ALL'},'Todas las fechas'),h('option',{value:'1'},'Últimas 24 h'),h('option',{value:'7'},'Últimos 7 días')),
          source==='audit' ? h('select',{value:type,onChange:e=>setType(e.target.value),className:'bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs'},
            h('option',{value:'ALL'},'Todos los eventos'),...Object.entries(TYPES).map(([id,name])=>h('option',{key:id,value:id},name))) : null,
          source==='audit' ? h('input',{type:'search',value:missionFilter,onChange:e=>setMissionFilter(e.target.value),placeholder:'Filtrar referencia de misión',
            className:'bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs min-w-[190px]'}) : null),
        h('p',{className:'text-xs '+tone(entrySource?.status)},entrySource?.status==='unavailable' ? 'Registro no disponible. Comprueba el archivo de datos en el NAS.' : entrySource?.status==='empty' ? 'Sin eventos registrados todavía.' :
          'Mostrando '+entries.length+' registros recientes. Identificadores anonimizados.'),
        entries.length ? h('div',{className:'space-y-2 max-h-[560px] overflow-y-auto'},...entries.map((record,i)=>
          h('div',{key:record.ref+'-'+i,className:'flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3'},
            h('div',{className:'space-y-1'},
              h('div',{className:'text-sm font-bold text-slate-100'},source==='audit'?(TYPES[record.type]||'Evento observado'):'Aceptado por Baileys'),
              h('div',{className:'text-[11px] text-slate-400'},dateLabel(record.at)+' · ID '+record.ref),
              source==='audit'?h('div',{className:'text-[11px] text-indigo-300'},'Misión ref.: '+record.missionRef):null),
            h(Pill,{label:source==='audit'?'Observado · NO enviado':'Aceptado · entrega no confirmada',color:source==='audit'?'amber':'emerald'})))) :
          h('div',{className:'rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400 text-center'},
            entrySource?.status==='unavailable'?'No se puede mostrar el historial.':'No hay registros que coincidan con los filtros.')),
      h('div',{className:'rounded-xl bg-slate-900 border border-slate-800 p-4 text-xs text-slate-400 leading-relaxed'},
        'Pendientes, fallos y reintentos: todavía no existe un historial fiable para esos estados. ',
        'El registro de envíos solo incluye operaciones con ID guardado durante la retención del servidor. ',
        'Ninguna acción de este panel envía WhatsApp ni modifica Firestore.')) :
      !err ? h('div',{className:'rounded-xl border border-dashed border-slate-700 p-8 text-sm text-slate-400 text-center'},
        'Pulsa “Actualizar historial” para consultar el servidor del NAS. Si aún no existe audit-events.jsonl, aparecerá un historial vacío.') : null
  );
}
export { verifyOrigin };

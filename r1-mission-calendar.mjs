import React,{useEffect,useState} from 'react';
import {dayKey,shiftMonth,monthDays,calendarRows,onDay} from './r1-calendar-model.mjs?v=20';
const h=React.createElement,ADMIN='victorsoripar@gmail.com';
const colors={indigo:'#818cf8',rose:'#fb7185',emerald:'#34d399',amber:'#fbbf24',cyan:'#22d3ee',fuchsia:'#e879f9',blue:'#60a5fa',orange:'#fb923c'};
const labelDate=day=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
const monthLabel=month=>new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));
const css=`.mc-cal{color:#e2e8f0}.mc-cal button,.mc-cal select,.mc-cal input{font:inherit}.mc-cal button:focus-visible,.mc-cal select:focus-visible,.mc-cal input:focus-visible{outline:2px solid #a5b4fc;outline-offset:2px}.mc-cal-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.mc-cal-control{background:#020617;border:1px solid #334155;border-radius:10px;padding:9px 12px;color:#e2e8f0;min-width:0}.mc-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.mc-cal-day{min-height:125px;background:#020617;border:1px solid #1e293b;border-radius:10px;padding:8px;text-align:left;overflow:hidden;color:#cbd5e1;cursor:pointer}.mc-cal-day[data-out=true]{opacity:.4}.mc-cal-day[aria-pressed=true]{border:2px solid #818cf8;background:#1e1b4b}.mc-cal-day[data-today=true] .mc-cal-number{background:#4f46e5;color:white;border-radius:7px;padding:2px 5px}.mc-cal-chip{font-size:11px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:4px 5px;margin-top:5px;border-left:3px solid var(--merc-color);background:#0f172a;border-radius:4px}.mc-cal-merc{display:block;opacity:.8;font-size:10px}.mc-cal-count{display:none}.mc-cal-card{background:#020617;border:1px solid #1e293b;border-left:4px solid var(--merc-color);border-radius:12px;padding:16px;min-width:0}.mc-cal-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px}.mc-cal-muted{color:#94a3b8;font-size:13px}.mc-cal-badge{display:inline-block;border:1px solid #334155;border-radius:7px;padding:3px 7px;font-size:12px;margin:5px 6px 0 0}.mc-cal-title{overflow-wrap:anywhere;font-weight:800}.mc-cal-filters{display:flex;flex-wrap:wrap;gap:12px}.mc-cal-filters label{display:grid;gap:5px;font-size:12px;flex:1;min-width:150px}.mc-cal-footer{display:block;font-size:11px;margin-top:5px;color:#a5b4fc}@media(max-width:640px){.mc-cal-grid{gap:3px}.mc-cal-day{min-height:64px;padding:5px}.mc-cal-chip,.mc-cal-footer{display:none}.mc-cal-count{display:block;font-size:10px;margin-top:8px;color:#a5b4fc}.mc-cal-filters label{min-width:120px}}`;
export function R1MissionCalendar({authUser,missions=[],workers=[]}){
 const [today,setToday]=useState(()=>dayKey(Date.now()));
 const [month,setMonth]=useState(()=>dayKey(Date.now()).slice(0,7));
 const [selected,setSelected]=useState(()=>dayKey(Date.now()));
 const [workerId,setWorkerId]=useState('all'),[status,setStatus]=useState('all');
 useEffect(()=>{const timer=setInterval(()=>setToday(dayKey(Date.now())),60000);return()=>clearInterval(timer);},[]);
 if(authUser?.email?.toLowerCase()!==ADMIN)return null;
 const rows=calendarRows(missions,workers,today).filter(r=>(workerId==='all'||(r.mission.workerId||'unassigned')===workerId)&&(status==='all'||(status==='open'?r.mission.status!=='Completada':r.mission.status===status)));
 const selectedRows=onDay(rows,selected),missing=rows.filter(r=>r.range.error);
 const choices=[...new Map(calendarRows(missions,workers,today).map(r=>[r.mission.workerId||'unassigned',r.workerName])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'es'));
 const navigate=value=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return;setMonth(value);setSelected(value===today.slice(0,7)?today:value+'-01');};
 const color=r=>colors[r.worker?.color]||'#94a3b8';
 return h('section',{className:'mc-cal bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5','aria-label':'Calendario de misiones'},
  h('style',null,css),
  h('header',null,h('h2',{className:'text-xl font-extrabold text-white'},'Calendario de misiones'),h('p',{className:'mc-cal-muted mt-1'},'Desde su creación hasta su finalización. Las misiones abiertas aparecen hasta hoy. Días según la hora de Madrid.')),
  h('div',{className:'mc-cal-toolbar'},
   h('button',{type:'button',className:'mc-cal-control','aria-label':'Mes anterior',onClick:()=>navigate(shiftMonth(month,-1))},'‹'),
   h('h3',{className:'font-bold capitalize',style:{flex:'1'}},monthLabel(month)),
   h('button',{type:'button',className:'mc-cal-control','aria-label':'Mes siguiente',onClick:()=>navigate(shiftMonth(month,1))},'›'),
   h('button',{type:'button',className:'mc-cal-control',onClick:()=>navigate(today.slice(0,7))},'Hoy'),
   h('input',{type:'month',value:month,className:'mc-cal-control','aria-label':'Elegir mes',onChange:e=>navigate(e.target.value)})),
  h('div',{className:'mc-cal-filters'},
   h('label',null,'Mercenario asignado',h('select',{className:'mc-cal-control',value:workerId,onChange:e=>setWorkerId(e.target.value)},h('option',{value:'all'},'Todos los mercenarios'),...choices.map(([id,name])=>h('option',{key:id,value:id},name)))),
   h('label',null,'Estado actual',h('select',{className:'mc-cal-control',value:status,onChange:e=>setStatus(e.target.value)},...[['all','Todos los estados'],['open','Todas las abiertas'],['Pendiente','Pendiente'],['En Progreso','En curso'],['En Pausa','En pausa'],['Completada','Completada']].map(([id,name])=>h('option',{key:id,value:id},name))))),
  h('div',{className:'mc-cal-grid'},...['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>h('div',{key:d,className:'text-center text-xs text-slate-400 py-1'},d))),
  h('div',{className:'mc-cal-grid'},...monthDays(month).map(day=>{const items=onDay(rows,day);return h('button',{key:day,type:'button',className:'mc-cal-day','data-out':day.slice(0,7)!==month,'data-today':day===today,'aria-pressed':day===selected,'aria-label':`${labelDate(day)}: ${items.length} misiones`,onClick:()=>{setSelected(day);if(day.slice(0,7)!==month)setMonth(day.slice(0,7));}},
    h('span',{className:'mc-cal-number'},Number(day.slice(-2))),
    items.length>0&&h('span',{className:'mc-cal-count'},items.length+' mis.'),
    ...items.slice(0,3).map(r=>h('span',{key:r.mission.id,className:'mc-cal-chip',style:{'--merc-color':color(r)},title:r.mission.missionTitle+' · '+r.workerName},r.mission.missionTitle,h('span',{className:'mc-cal-merc'},r.workerName))),
    items.length>3&&h('span',{className:'mc-cal-footer'},'+'+(items.length-3)+' más'));})),
  h('div',{className:'space-y-3','aria-live':'polite'},
   h('h3',{className:'font-extrabold text-white'},labelDate(selected)+' · '+selectedRows.length+' misiones'),
   h('p',{className:'mc-cal-muted'},'Se muestran el estado y el mercenario asignado actuales; no un historial de reasignaciones o pausas.'),
   !selectedRows.length&&h('p',{className:'text-slate-400 py-4'},'No hay misiones para este día con estos filtros.'),
   h('div',{className:'mc-cal-results'},...selectedRows.map(r=>h('article',{key:r.mission.id,className:'mc-cal-card',style:{'--merc-color':color(r)}},
    h('h4',{className:'mc-cal-title'},r.mission.missionTitle),h('p',{className:'text-sm mt-1'},r.workerName+' · '+(r.mission.clientName||'Sin cliente')),
    h('span',{className:'mc-cal-badge'},'Estado actual: '+(r.mission.status==='En Progreso'?'En curso':r.mission.status)),
    r.range.start===selected&&h('span',{className:'mc-cal-badge'},'Creada este día'),
    r.range.completed&&r.range.end===selected&&h('span',{className:'mc-cal-badge'},'Finalizada este día'),
    h('p',{className:'mc-cal-muted mt-3'},'Creada: '+labelDate(r.range.start)),
    h('p',{className:'mc-cal-muted'},r.range.completed?'Finalizada: '+labelDate(r.range.end):'Sigue abierta'))))),
  missing.length>0&&h('details',{className:'text-sm text-amber-300'},h('summary',{className:'cursor-pointer'},missing.length+' misiones sin fechas suficientes para situarlas'),...missing.map(r=>h('p',{key:r.mission.id,className:'mt-2'},r.mission.missionTitle+' · '+r.range.error)))
 );
}

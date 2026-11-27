const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
export function dayKey(value){
 if(typeof value!=='number'||!Number.isFinite(value)||value<=0)return null;
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;
 const parts=Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
export function shiftMonth(month,amount){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+amount,1)).toISOString().slice(0,7);}
export function monthDays(month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return [];
 const [y,m]=month.split('-').map(Number),start=new Date(Date.UTC(y,m-1,1));
 const offset=(start.getUTCDay()+6)%7;
 return Array.from({length:42},(_,i)=>new Date(Date.UTC(y,m-1,1-offset+i)).toISOString().slice(0,10));
}
export function missionRange(m,today){
 const start=dayKey(m.createdAt);
 if(!start)return {error:'Sin fecha de creación'};
 const completed=m.status==='Completada';
 const finish=completed?dayKey(m.completedAt):null;
 if(completed&&!finish)return {error:'Sin fecha de finalización'};
 if(completed&&m.completedAt<m.createdAt)return {error:'Fechas incoherentes'};
 const end=completed?finish:today;
 if(start>today)return {error:'Fecha de creación futura'};
 if(completed&&finish>today)return {error:'Fecha de finalización futura'};
 return {start,end,completed};
}
export function calendarRows(missions,workers,today){
 const names=new Map(workers.map(w=>[w.id,w]));
 return missions.map(m=>({mission:m,worker:names.get(m.workerId)||null,workerName:names.get(m.workerId)?.name||(m.workerId&&m.workerId!=='unassigned'?'Mercenario no disponible':'Sin asignar'),range:missionRange(m,today)}));
}
export function onDay(rows,day){return rows.filter(r=>!r.range.error&&r.range.start<=day&&r.range.end>=day).sort((a,b)=>a.mission.missionTitle.localeCompare(b.mission.missionTitle,'es'));}

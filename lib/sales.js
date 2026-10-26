import {isTestOrder} from './test-orders.js';
import {legacyCardIdentity} from './card-profiles.js';
export const stockholmDay=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function salesRecord(order){const d=order.details,card=order.card||legacyCardIdentity();return{version:4,lines:order.kind==='purchase'?order.slots.map(s=>({product:s.card?.product||'4-pack · motiv väntar',sport:s.card?.sport||'Ej valt',club:s.details?(['Egen klubb','Egen hockeyklubb'].includes(s.details.club)?s.details.clubName:s.details.club):'Ej valt',packs:1,quantity:4,amountSEK:100})):undefined,day:stockholmDay(order.createdAt),quantity:d.quantity,club:['Egen klubb','Egen hockeyklubb'].includes(d.club)?d.clubName:d.club,status:order.status,testOrder:isTestOrder(order),profileId:card.profileId,productId:card.productId,product:card.product,sportId:card.sportId,sport:card.sport,packs:d.packs||0,amountSEK:d.amountSEK||0,paid:order.paid===true,paidDay:order.paidAt?stockholmDay(order.paidAt):null};}
const validDay=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export const validRange=(from,to)=>(!from||validDay(from))&&(!to||validDay(to))&&(!from||!to||from<=to);
export function aggregateSales(records,from='',to=''){
  const data={orders:0,cards:0,done:0,clubs:Object.create(null),paidOrders:0,paidCards:0,paidPacks:0,paidSEK:0,unpaidOrders:0,unpaidSEK:0,unpricedOrders:0,excludedTests:0,from,to};
  const products=new Map(),clubs=new Map(),days=new Map();
  const add=(map,name,r,countOrder=true)=>{const row=map.get(name)||{name,orders:0,packs:0,cards:0,amountSEK:0};row.orders+=countOrder?1:0;row.packs+=r.packs||0;row.cards+=r.quantity||0;row.amountSEK+=r.amountSEK||0;map.set(name,row)};
  for(const r of records){if(isTestOrder(r)){data.excludedTests++;continue}const day=r.paid?(r.paidDay||r.day):r.day;if((from&&day<from)||(to&&day>to))continue;
    data.orders++;data.cards+=r.quantity||0;if(r.status==='done')data.done++;data.clubs[r.club]=(data.clubs[r.club]||0)+(r.quantity||0);
    if(!r.amountSEK)data.unpricedOrders++;
    if(r.paid){data.paidOrders++;data.paidCards+=r.quantity||0;data.paidPacks+=r.packs||0;data.paidSEK+=r.amountSEK||0;const seenProducts=new Set(),seenClubs=new Set();for(const line of r.lines||[r]){const product=(line.product||'Äldre kort')+' · '+(line.sport||'Fotboll');add(products,product,line,!seenProducts.has(product));add(clubs,line.club,line,!seenClubs.has(line.club));seenProducts.add(product);seenClubs.add(line.club);}add(days,day,r)}else{data.unpaidOrders++;data.unpaidSEK+=r.amountSEK||0;}
  }
  const ranked=map=>[...map.values()].sort((a,b)=>b.amountSEK-a.amountSEK||a.name.localeCompare(b.name,'sv'));
  return{...data,clubs:{...data.clubs},products:ranked(products),salesByClub:ranked(clubs),days:[...days.values()].sort((a,b)=>b.name.localeCompare(a.name))};
}

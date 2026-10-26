// Server-owned catalogue. New sports must pass rendering/order checks before being enabled.
export const FOOTBALL_PROFILE='future-star-football';
export const HOCKEY_PROFILE='future-star-hockey';
const football=Object.freeze({
 id:FOOTBALL_PROFILE,productId:'future-star-four-pack',product:'Future Star · 4-pack',
 sportId:'football',sport:'Fotboll',title:'FOOTBALL CARDS',
 stats:Object.freeze(['FART','SKOTT','PASS','TEKNIK','FÖRSVAR','LAGANDA']),
 clubs:Object.freeze(['FBK Karlstad','Norrstrands IF','Råtorps IK','Fiskeviks IF','Hertzöga BK','Egen klubb']),
 positions:Object.freeze(['ANFALLARE','MITTFÄLTARE','BACK','MÅLVAKT'])
});
const hockey=Object.freeze({
 id:HOCKEY_PROFILE,productId:'future-star-four-pack',product:'Future Star · 4-pack',
 sportId:'hockey',sport:'Hockey',title:'HOCKEY CARDS',
 clubs:Object.freeze(['Egen hockeyklubb']),positions:Object.freeze(['YTTERFORWARD','CENTER','BACK','MÅLVAKT']),
 stats:Object.freeze(['SKRIDSKOR','SKOTT','PASSNING','TEKNIK','FYSIK','LAGANDA']),
 goalieStats:Object.freeze(['REFLEXER','PLOCK','PLACERING','RÖRLIGHET','PUCKSPEL','LAGANDA'])
});
export const cardProfiles=Object.freeze([football,hockey]);
export function cardProfile(id=FOOTBALL_PROFILE){return cardProfiles.find(p=>p.id===id)||null;}
export function cardIdentity(profile,position){return{profileId:profile.id,productId:profile.productId,product:profile.product,sportId:profile.sportId,sport:profile.sport,...(position?{statLabels:[...(position==='MÅLVAKT'&&profile.goalieStats?profile.goalieStats:profile.stats)]}:{})};}
export const legacyCardIdentity=()=>cardIdentity(football);

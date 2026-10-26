// Server-owned catalogue. New sports must pass rendering/order checks before being enabled.
export const FOOTBALL_PROFILE='future-star-football';
const football=Object.freeze({
 id:FOOTBALL_PROFILE,productId:'future-star-four-pack',product:'Future Star � 4-pack',
 sportId:'football',sport:'Fotboll',
 clubs:Object.freeze(['FBK Karlstad','Norrstrands IF','R�torps IK','Fiskeviks IF','Hertz�ga BK','Egen klubb']),
 positions:Object.freeze(['ANFALLARE','MITTF�LTARE','BACK','M�LVAKT'])
});
export function cardProfile(id=FOOTBALL_PROFILE){return id===FOOTBALL_PROFILE?football:null;}
export function cardIdentity(profile){return{profileId:profile.id,productId:profile.productId,product:profile.product,sportId:profile.sportId,sport:profile.sport};}
export const legacyCardIdentity=()=>cardIdentity(football);

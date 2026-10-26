# Sportprofiler – första förberedelsen

Future Star-fotboll och hockey är öppna för beställning. Fotboll behåller sina fem föreningar och Egen klubb. Hockey börjar med Egen hockeyklubb, där kunden anger klubbnamn, färger och egen logotyp. Båda sporterna använder originalets ram, PNG-mått 1488 × 2079 och fyrpack för 100 kr utan frakt. Pokémon är ännu inte öppet.

`lib/card-profiles.js` är serverns katalog för tillåtna sportprofiler. Den håller sportidentitet, produktidentitet, föreningar och positioner åtskilda. Kunden kan ange `profileId`; utelämnat värde betyder den befintliga fotbollsprofilen. Okända eller ännu oförberedda profiler avvisas. Produkt- och sportnamn samt pris bestäms av servern.

Nya order sparar en ögonblicksbild i `order.card` med profil, produkt och sport. Statistiken läser dessa sparade värden, så att en framtida namnändring i katalogen inte skriver om vad som såldes. Äldre order utan metadata räknas som den ursprungliga fotbollsprodukten och behåller sina sparade priser. Gamla kvittoförsök kan återupptas med den tidigare kontrollsumman; en ändrad beställning eller en annan kund kan inte återanvända kvittot.

Editorn skickar vald profileId. Serverkatalogen genererar även webbläsarens profilunderlag vid bygget, så positioner och egenskaper hämtas från samma källa. Hockey har YTTERFORWARD, CENTER, BACK och MÅLVAKT, med separata målvaktsegenskaper. Klubbval, färger och värden sparas per sport under den öppna sessionen. Ett sportbyte kräver nytt godkännande av kortet. FBK Karlstad förblir en fotbollsförening. Hockeyns AI-panel är stängd tills ett separat motivflöde finns; fotbolls-AI kan varken startas eller appliceras när hockey är valt.

Nya order sparar även egenskapsetiketterna i sin serverbestämda kortidentitet. Egna klubbmallar grupperas efter sparat klubbnamn i statistiken. Admin visar sport vid varje beställning. Innan fler namngivna hockeyföreningar läggs till behövs rätt klubbunderlag; ingen ny förening eller logotyp har hittats på.

34 tester passerar. Hockeyprov täcker tillåtna klubbar/positioner, sparade målvaktsetiketter, pris/Swish, idempotens, separata sportgrupper, egna klubbnamn och AI-spärr vid sportbyte. Ett isolerat webbläsarprov körde faktisk editor → PNG → orderkärna → kvitto/Swish → admin → betald statistik. PNG var 1488 × 2079 med rätt pHYs för 63 × 88 mm, och den renderade filen granskades. Sportbyte tillbaka återställde Råtorps IK. Alla prov använder syntetiska filer och minneslagring; inga produktionsorder, betalningar eller AI-anrop skapades.

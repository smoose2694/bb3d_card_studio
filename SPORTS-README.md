# Sportprofiler – första förberedelsen

Endast Future Star-fotboll är öppet för beställning. Befintliga fem föreningar och Egen klubb har samma färger, mall, positioner, PNG-mått, fyrpack och pris som tidigare. Inga hockey- eller Pokémon-klubbar läggs till i denna etapp.

`lib/card-profiles.js` är serverns katalog för tillåtna sportprofiler. Den håller sportidentitet, produktidentitet, föreningar och positioner åtskilda. Kunden kan ange `profileId`; utelämnat värde betyder den befintliga fotbollsprofilen. Okända eller ännu oförberedda profiler avvisas. Produkt- och sportnamn samt pris bestäms av servern.

Nya order sparar en ögonblicksbild i `order.card` med profil, produkt och sport. Statistiken läser dessa sparade värden, så att en framtida namnändring i katalogen inte skriver om vad som såldes. Äldre order utan metadata räknas som den ursprungliga fotbollsprodukten och behåller sina sparade priser. Gamla kvittoförsök kan återupptas med den tidigare kontrollsumman; en ändrad beställning eller en annan kund kan inte återanvända kvittot.

Innan ytterligare en profil aktiveras behöver editorn, servervalideringen, idempotens för den nya profilen, statistik, motivval, klubbrättigheter och tryckfilen kontrolleras tillsammans. Idag skickar editorn ingen profil eftersom bara standardprofilen finns. Nästa sport bör först byggas som en separat testbar förhandsvisning. FBK Karlstad är en fotbollsförening och ska inte automatiskt kopplas till ett hockeylag.

28 tester passerar: tidigare 24 samt fyra profilprov för validering, serverbestämd metadata/pris, äldre kvittoretry och separata sportgrupper i statistiken. Proven använder syntetiska filer och minneslagring. Inga riktiga order, betalningar eller AI-anrop skapades.

# Sportprofiler - f�rsta f�rberedelsen

Endast Future Star-fotboll �r �ppet f�r best�llning. Befintliga fem f�reningar och Egen klubb har samma f�rger, mall, positioner, PNG-m�tt, fyrpack och pris som tidigare. Inga hockey- eller Pok�mon-klubbar l�ggs till i denna etapp.

`lib/card-profiles.js` �r serverns katalog f�r till�tna sportprofiler. Den h�ller sportidentitet, produktidentitet, f�reningar och positioner �tskilda. Kunden kan ange `profileId`; utel�mnat v�rde betyder den befintliga fotbollsprofilen. Ok�nda eller �nnu of�rberedda profiler avvisas. Produkt- och sportnamn samt pris best�ms av servern.

Nya order sparar en �gonblicksbild i `order.card` med profil, produkt och sport. Statistiken l�ser dessa sparade v�rden, s� att en framtida namn�ndring i katalogen inte skriver om vad som s�ldes. �ldre order utan metadata r�knas som den ursprungliga fotbollsprodukten och beh�ller sina sparade priser. Gamla kvittof�rs�k kan �terupptas med den tidigare kontrollsumman; en �ndrad best�llning eller en annan kund kan inte �teranv�nda kvittot.

Innan ytterligare en profil aktiveras beh�ver editorn, servervalideringen, idempotens f�r den nya profilen, statistik, motivval, klubbr�ttigheter och tryckfilen kontrolleras tillsammans. Idag skickar editorn ingen profil eftersom bara standardprofilen finns. N�sta sport b�r f�rst byggas som en separat testbar f�rhandsvisning. FBK Karlstad �r en fotbollsf�rening och ska inte automatiskt kopplas till ett hockeylag.

28 tester passerar: tidigare 24 samt fyra profilprov f�r validering, serverbest�md metadata/pris, �ldre kvittoretry och separata sportgrupper i statistiken. Proven anv�nder syntetiska filer och minneslagring. Inga riktiga order, betalningar eller AI-anrop skapades.

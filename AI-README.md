# AI-fotofl�de f�r BB3D

AI �r avst�ngt som standard. Ingen bild skickas automatiskt n�r kunden laddar upp sitt foto. OpenAI-nyckeln ska bara finnas som `OPENAI_API_KEY` p� servern i Vercel, f�r Production och Preview.

## Aktivering och f�rsta prov

1. L�gg till nyckeln i Vercel och bygg om milj�n. Dela inte nyckeln i chatten eller GitHub.
2. �ppna `/bestallningar`, logga in och kontrollera avsnittet AI-foton p� m�ssan.
3. S�tt ett l�gt tak f�r det f�rsta provet, exempelvis 2 API-f�rs�k per dygn, och sl� p� AI.
4. Skapa en personlig m�sskod och �ppna kundstudion. Ladda upp en l�mplig bild, v�lj klubb, aktivera koden och godk�nn �verf�ringen till OpenAI.
5. Kontrollera den riktiga AI-bildens identitet, klubbtr�ja, milj�, besk�rning och tryckkvalitet innan koder delas till kunder. Modelltillg�ng, API-organisation och betalning m�ste fungera p� �garens OpenAI-konto.

M�sskoden g�ller i tv� timmar och binds till den f�rsta kundsessionen. En kod ger h�gst tv� f�rdiga bilder och fyra API-f�rs�k. Minst 30 sekunder kr�vs mellan nya f�rs�k. Samma jobb-ID kan inte starta ett andra betalt anrop. Globalt till�ts ett aktivt bildjobb och ett operat�rsvalt dygnstak, r�knat i svensk tid. Tekniska fel tar inte en lyckad bildplats, men API-f�rs�ket r�knas alltid mot f�rs�ks- och dygnstaket. Os�kra n�tverksutfall h�ller en sexminuters sp�rr; inga automatiska betalda �terf�rs�k g�rs.

Takets enhet �r API-f�rs�k, inte kronor. Faktisk kostnad beror p� OpenAI-priset och input/output-token. Modellen �r l�st till `gpt-image-2.5-sunburst-2026-09-08`, medium, 1536 � 1024, en bild per f�rs�k. Kunden kan inte �ndra modell, kvalitet, storlek eller prompt. Klubbnamn och loggor kommer fr�n serverns fem f�rberedda fotbollsklubbar. Egna klubbmallar och andra motivkategorier st�ds inte i den h�r f�rsta AI-etappen.

## Bildhantering

Originalfotot skalas till h�gst 768 pixlar p� l�ngsta sidan i webbl�saren. Servern kontrollerar PNG-signatur, dimensioner, CRC och dekomprimerad bilddata f�re API-anropet. En stabil anonym sessionshash skickas som safety_identifier; inget kundnamn eller kontaktf�lt ing�r i prompten.

Originalfotot lagras inte av BB3D:s AI-server. Det skickas tillsammans med klubbloggan till OpenAI n�r kunden uttryckligen v�ljer generering. OpenAI behandlar API-data enligt sin egen datapolicy.

AI-resultatet lagras i privat Blob, �r �tkomligt f�r r�tt kundsession med samma m�sskod i 24 timmar och rensas d�refter av det dagliga jobbet. Fysisk borttagning kan ske upp till ett dygn efter �tkomstgr�nsen. Endast ett senare godk�nt f�rdigt kort f�ljer orderns 30-dagarslagring.

Vid omladdning kan senaste jobb-ID �terupptas. M�sskoden sparas inte i sessionStorage: kunden m�ste ange samma kod igen. Tv� versioner kan j�mf�ras i den �ppna sidan. N�r en version anv�nds �terst�lls besk�rningen och kundens godk�nnande av kortet kr�vs igen. Originalfotot �teranv�nds vid omgenerering s� l�nge det finns kvar i den �ppna sidan.

## Verifiering

24 lokala tester passerar, inklusive HTTP-integrationsprov f�r autentisering, ursprung, samtycke, idempotens och privata bildresultat. Providerkontraktet testades med syntetiska PNG-svar och en injicerad fetch-funktion; inga betalda anrop gjordes.

Ett isolerat webbl�sarprov med samma kund- och adminskript samt en syntetisk provider verifierade: operat�rens inst�llningar och kodutdelning, krav p� samtycke, l�sning av editor och best�llning under bildjobbet, applicering med �terst�llt kortgodk�nnande, �terh�mtning efter omladdning utan extra API-f�rs�k, 30 sekunders sp�rr, val mellan tv� versioner och stopp vid tv� f�rdiga bilder. Dygnsr�knaren visade exakt tv� f�rs�k. Testmilj�n anv�nde enbart minneslagring och syntetiska f�rgf�lt; inga kundfoton eller riktiga best�llningar skapades. Den lokala testservern ing�r inte i produktionen.

Ett riktigt OpenAI-prov kr�vs fortfarande f�r att verifiera modelltillg�ng, personlikhet, klubbtr�ja, milj� och bildkvalitet. AI ska vara avst�ngt tills anslutningen och detta prov �r klara.

Officiella API-k�llor kontrollerade 2026-10-26:
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/reference/resources/images/methods/edit

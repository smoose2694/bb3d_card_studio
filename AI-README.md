# AI-fotoflöde för BB3D

AI är avstängt som standard. Ingen bild skickas automatiskt när kunden laddar upp sitt foto. OpenAI-nyckeln ska bara finnas som `OPENAI_API_KEY` på servern i Vercel, för Production och Preview.

## Aktivering och första prov

1. Lägg till nyckeln i Vercel och bygg om miljön. Dela inte nyckeln i chatten eller GitHub.
2. Öppna `/bestallningar`, logga in och kontrollera avsnittet AI-foton på mässan.
3. Sätt ett lågt tak för det första provet, exempelvis 2 API-försök per dygn, och slå på AI.
4. Skapa en personlig mässkod och öppna kundstudion. Ladda upp en lämplig bild, välj klubb, aktivera koden och godkänn överföringen till OpenAI.
5. Kontrollera den riktiga AI-bildens identitet, klubbtröja, miljö, beskärning och tryckkvalitet innan koder delas till kunder. Modelltillgång, API-organisation och betalning måste fungera på ägarens OpenAI-konto.

Mässkoden gäller i två timmar och binds till den första kundsessionen. En kod ger högst två färdiga bilder och fyra API-försök. Minst 30 sekunder krävs mellan nya försök. Samma jobb-ID kan inte starta ett andra betalt anrop. Globalt tillåts ett aktivt bildjobb och ett operatörsvalt dygnstak, räknat i svensk tid. Tekniska fel tar inte en lyckad bildplats, men API-försöket räknas alltid mot försöks- och dygnstaket. Osäkra nätverksutfall håller en sexminuters spärr; inga automatiska betalda återförsök görs.

Takets enhet är API-försök, inte kronor. Faktisk kostnad beror på OpenAI-priset och input/output-token. Modellen är låst till `gpt-image-2.5-sunburst-2026-09-08`, medium, 1536 × 1024, en bild per försök. Kunden kan inte ändra modell, kvalitet, storlek eller prompt. Klubbnamn och loggor kommer från serverns fem förberedda fotbollsklubbar. Egna klubbmallar och andra motivkategorier stöds inte i den här första AI-etappen.

## Bildhantering

Originalfotot skalas till högst 768 pixlar på längsta sidan i webbläsaren. Servern kontrollerar PNG-signatur, dimensioner, CRC och dekomprimerad bilddata före API-anropet. En stabil anonym sessionshash skickas som safety_identifier; inget kundnamn eller kontaktfält ingår i prompten.

Originalfotot lagras inte av BB3D:s AI-server. Det skickas tillsammans med klubbloggan till OpenAI när kunden uttryckligen väljer generering. OpenAI behandlar API-data enligt sin egen datapolicy.

AI-resultatet lagras i privat Blob, är åtkomligt för rätt kundsession med samma mässkod i 24 timmar och rensas därefter av det dagliga jobbet. Fysisk borttagning kan ske upp till ett dygn efter åtkomstgränsen. Endast ett senare godkänt färdigt kort följer orderns 30-dagarslagring.

Vid omladdning kan senaste jobb-ID återupptas. Mässkoden sparas inte i sessionStorage: kunden måste ange samma kod igen. Två versioner kan jämföras i den öppna sidan. När en version används återställs beskärningen och kundens godkännande av kortet krävs igen. Originalfotot återanvänds vid omgenerering så länge det finns kvar i den öppna sidan.

## Verifiering

24 lokala tester passerar, inklusive HTTP-integrationsprov för autentisering, ursprung, samtycke, idempotens och privata bildresultat. Providerkontraktet testades med syntetiska PNG-svar och en injicerad fetch-funktion; inga betalda anrop gjordes.

Ett isolerat webbläsarprov med samma kund- och adminskript samt en syntetisk provider verifierade: operatörens inställningar och kodutdelning, krav på samtycke, låsning av editor och beställning under bildjobbet, applicering med återställt kortgodkännande, återhämtning efter omladdning utan extra API-försök, 30 sekunders spärr, val mellan två versioner och stopp vid två färdiga bilder. Dygnsräknaren visade exakt två försök. Testmiljön använde enbart minneslagring och syntetiska färgfält; inga kundfoton eller riktiga beställningar skapades. Den lokala testservern ingår inte i produktionen.

Ett riktigt OpenAI-prov krävs fortfarande för att verifiera modelltillgång, personlikhet, klubbtröja, miljö och bildkvalitet. AI ska vara avstängt tills anslutningen och detta prov är klara.

Den samlade testsviten omfattar nu 31 tester. `tests/ai-client.test.js` kör det riktiga kundskriptet med ett isolerat DOM- och nätverksunderlag. Det provar samtyckesspärren, ett förlorat genereringssvar med återhämtning utan nytt bildanrop, återanvändning av hämtat resultat, utgånget jobb, versionsval och bildtak. Endast jobb-ID sparas i sessionStorage; mässkoden ingår inte. Dessa klientprov ersätter inte ett riktigt bildprov eller fysisk mobiltestning.

Officiella API-källor kontrollerade 2026-10-26:
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/reference/resources/images/methods/edit

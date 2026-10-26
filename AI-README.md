## Kundnamn
Korttypen visas som Pokémonkort i kundgränssnittet och beskrivs som Pokémonliknande kort med BB3D:s egen design. Kortets rubrik, navigering, bekräftelse, produktnamn och adminetiketter använder samma namn. Befintliga profil-ID:n och den interna klubbnyckeln behålls för kompatibilitet med sparade köp.

## Kläder och miljö per motiv
Bildinstruktionerna kräver att källfotots kläder och bakgrund ersätts helt. Fotboll använder matchtröja och gräsplan; förberedda klubbar behåller sina godkända emblem och tröjfärger, inklusive röd/vit FBK Karlstad. Hockey använder långärmad hockeytröja över skydd, is och sarg i ishall. Ansiktet hålls synligt. Egna sportklubbar använder valda huvud- och accentfärger.

Fantasytränare får praktiska, åldersanpassade äventyrskläder: eld i rött/kolsvart vid en vulkanisk stig, vatten i blått/turkost vid sjö och vattenfall, skog i grönt/jordtoner på skogsstig och blixt i gult/mörkblått vid en klippig utsiktsplats. Monster använder samma elementmiljöer men egen varelsanatomi utan människokläder; hela varelsen får plats i bilden. Människoporträtt ska bevara ansikte och ålder, med utrymme för stående beskärning. Ljus, skuggor och perspektiv ska passa den nya scenen.

`tests/ai-scenes.test.js` kontrollerar det faktiska utgående bildanropet för alla 15 motivkombinationer med simulerad tjänst. Dessa kontroller verifierar instruktioner och anropsformat, inte bildmodellens visuella resultat. Riktig bildgenerering och visuell granskning återstår tills ett kontrollerat operatörsprov kan genomföras.

## Operatörshjälp: extra försök och aktivitet
Admin kan ge +2 försök per betald, ej godkänd motivplats. Tilldelningen har UUID och CAS; dubbelklick, nätverksretry och parallella replay med samma UUID ger inte dubbla bonusförsök. Högst 100 tilldelade försök per plats. Max lyckade bilder ökar samtidigt, förbrukning återställs aldrig och gemensamt dygnstak påverkas inte. UI varnar om dygnstaket är nått. Kundens kvot hämtas utan kostnadsanrop var cirka15 sekund. Bonusknappen är adminskyddad och same-origin-kontrollerad.
Påbörjade köp rapporterar senaste aktivitet och vald motivplats när sidan är synlig, cirka en gång per minut; inga råa IP-adresser eller tangenttryckningar sparas. Admin visar ungefärlig aktivitet senaste3min och filter för aktiva kunder. Närvaro är bara en indikator och kan släpa efter. Presence lagras separat från order så orderversion, godkännande och försäljningssiffror inte påverkas. Rensas med dygnsrensningen. Kund får info om indikatorn på köpsidan. Anonyma besökare utan påbörjat köp listas inte.

## Motivvarianter och operatörsprov
AI för fotboll (inklusive egen klubb), hockey och fantasy/tränare/monster använder samma betalda motivplats. Val av korttyp eller element ger inga extra försök. Interna motivinstruktioner valideras på servern; kunden kan inte välja dyrare modell eller antal bilder. Kunden får sina sparade köp i samma signerade webbläsarsession (förnyas upp till 30 dagar).
Operatören kan markera Testorder i admin. Sådana order utesluts från all försäljningsstatistik. För ett kontrollerat bildprov kan operatören också markera betalkontrollen på testordern; AI-försöken räknas fortfarande mot det verkliga globala dygnstaket och kan kosta hos OpenAI. Inga sådana produktionsprov har gjorts av agenten. Dygnstaket i produktion ligger kvar på 2 för första manuella bildprovet.

## Aktuellt: betalda 4-pack ersätter mässkoder
Kunden köper 1–25 4-pack före motivarbetet. Serverpris 100 kr/pack, Swish 1233661089. Operatörens befintliga betalningsmarkering öppnar en stabil grant per motivplats med 2 API-försök totalt, även tekniska fel. Två lyckade bilder är övre gräns. Betalningsrättning, omstart och nya flikar återställer inte försök. Dygnstak och cooldown består. API-voucher svarar 410. Äldre interna kodtester behålls för kontrollmotorns regressioner. Inga kundkoder i gränssnittet. Produktion kräver betalt och alla motiv godkända. Ett köp räknas en gång i försäljningsstatistiken; varje pack bidrar med sin sport/förening efter godkännande. Gamla beställningar förblir läsbara.

### Historisk implementation (ersatt där ovan anges)
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

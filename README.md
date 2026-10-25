# BB3D Card Studio – Future Star 1.0

En ny, fungerande korteditor byggd från den uppladdade **Future_Star_Originalmall_App(1).zip**. Återbyggd utgåva daterad 2026-10-25. Detta är inte en återfunnen v0.3/v0.4.

För publicering med Vercel, se [VERCEL.md](VERCEL.md). Projektet innehåller `vercel.json` för statisk publicering utan byggsteg.

## Starta direkt

1. Packa upp ZIP-filen helt.
2. Öppna **index.html** i Chrome eller Edge.
3. Redigera namn, klubb, klubbnamn, position, totalrating och sex stats.
4. Ladda upp ett foto. Anpassa zoom och placering med reglagen.
5. Ladda ner framsida och baksida som varsin PNG.

Ingen installation, inloggning, API-nyckel eller internetanslutning behövs. Om din webbläsare begränsar lokala filer kan du använda Node.js: öppna en terminal i den uppackade mappen, kör `npm start` och besök adressen som visas. Ingen `npm install` behövs.

## Det som fungerar

- Originalets Future Star-SVG, korrigerad fotobeskärning och oförändrat koordinatsystem `30 30 630 880`.
- Redigerbart spelarnamn med automatisk storleksanpassning, separat klubbnamn och fyra positioner.
- Manuell totalrating och sex stats: FART, SKOTT, PASS, TEKNIK, FÖRSVAR och LAGANDA, heltal 1–99.
- Slumpning med exakt poängsumma `totalrating × 6`. Två spelare med samma totalrating får samma sammanlagda antal poäng. Manuella värden ändras först när du själv redigerar eller klickar på slumpning. Totalrating räknas inte automatiskt om från manuella stats.
- Fyra medföljande klubbloggor i sina originalfärger. FBK Karlstad och Norrstrands IF är röd/vita, Råtorps IK ljusblå/vit, Hertzöga BK gul/grön.
- Eget klubbnamn, egna mallfärger och egen logotyp. Valet Egen klubb visar ingen logotyp förrän du laddar upp en.
- Foto/logotyp i PNG, JPG eller WebP, upp till 15 MB och 50 megapixlar. Bilder normaliseras till PNG och högst 3000 pixlar på längsta sidan; använd ett skarpt originalfoto.
- Fotot fyller originalets mask med cover-beskärning. Zoom 100–300 % och flyttreglage håller fotot inom ramen. Logotyp och totalbadge ligger ovanpå fotot.
- Förhandsvisning och separat PNG-export av fram- och baksida.
- Redigerbart projekt som JSON, inklusive foto, egen logotyp och beskärning. Använd **Spara redigerbart projekt** före omladdning eller stängning; ändringar sparas inte automatiskt.
- All bildbehandling sker i webbläsaren. Uppladdade bilder skickas inte till GitHub eller någon server.

## Tryckformat

PNG-exporten är **1488 × 2079 px**, i RGB, med pHYs-metadata för **63 × 88 mm** (cirka 600 dpi). Pixeltätheten avrundas per axel till 23619 respektive 23625 pixlar/meter. Det ger 63,0001 × 88,0000 mm. Ange ändå exakt **63 × 88 mm** i tryckprogrammet, utan automatisk sidpassning.

Detta är en högupplöst färgfil för arbetsflöden som accepterar RGB-PNG utan utfall. Ingen CMYK-konvertering, tryckspecifik ICC-profil, utfall, skärmärken, vitfärg eller lackkanal ingår i appens export. Något fysiskt provtryck har inte gjorts. Bildens detaljskärpa beror på det uppladdade fotot; de ursprungliga klubbloggornas upplösning är också en begränsning.

## Ladda upp till GitHub och starta GitHub Pages

**Packa upp ZIP-filen först. Att bara lägga ZIP-filen i ett repository startar inte appen.**

1. Skapa ett nytt repository, exempelvis `bb3d-card-studio`. GitHub Free kräver ett publikt repository för Pages.
2. Välj **Add file → Upload files**. Dra in den uppackade mappens **innehåll**: `index.html`, `styles.css`, `app.js`, `assets.js`, övriga filer och mappen `originalmall`. Behåll mappstrukturen.
3. Kontrollera att `index.html` ligger direkt i repositoryts rot, inte i en extra `BB3D-Card-Studio`-mapp. Inga personliga foton eller sparade spelarprojekt behöver laddas upp.
4. Spara uppladdningen med **Commit changes** (eller följ GitHubs flöde för föreslagna ändringar om det visas).
5. Öppna **Settings → Pages**. Under **Build and deployment**, välj **Deploy from a branch**, sedan **main** och **/ (root)**. Klicka **Save**.
6. Vänta på publiceringen och klicka **Visit site**. Adressen blir normalt `https://DITT-ANVANDARNAMN.github.io/bb3d-card-studio/`.
7. Kontrollera att en klubb kan väljas och att båda PNG-knapparna ger nedladdningar på den publicerade sidan.

Ingen byggprocess eller serverdel krävs på GitHub Pages. Alla appreferenser är relativa så även publicering under ett repositorynamn fungerar. `.nojekyll` medföljer; om Utforskaren döljer den fungerar de vanliga appfilerna också med Pages standardhantering.

Om appen hamnar i en undermapp, flytta dess innehåll till roten eller anpassa Pages-källan. Om en gammal version visas efter uppdatering, gör en hård omladdning. GitHub kan behöva upp till cirka tio minuter för publiceringen.

Officiella instruktioner, kontrollerade 2026-10-25:
- [Ladda upp filer](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [Skapa en GitHub Pages-sida](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Välja publiceringskälla](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Det som inte har implementerats

- Automatisk friläggning, borttagning av andra personer eller generering av fotbollsbakgrund. Förbered sådana bilder före uppladdning.
- Uppdaterade, spelaranpassade eller klubbbytande lackmasker. Originalets rödvita maskfiler finns endast som referens i `originalmall/`. De passar inte automatiskt ett ändrat namn, nya stats eller en annan klubblogotyp och ska inte behandlas som färdiga masker för det redigerade kortet.
- CMYK/ICC, utfall, skärmärken, vitfärgsseparation eller PDF-export.
- Batchproduktion av flera spelare, spelarregister, molnsparning, användarkonton, beställningar eller WooCommerce-koppling.
- Import av eventuella äldre v0.3/v0.4-projektformat. Endast det nya dokumenterade JSON-formatet stöds.
- Verifiering i Safari, Firefox, iOS eller Android på fysisk enhet. Dator- och mobilstor layout har testats i Chrome; ett separat Edge-test redovisas om det finns i VERIFIERING.md.
- Uppladdning eller driftsättning till ett faktiskt GitHub-repository. Paketet levereras för din uppladdning.

## Projektets underlag

Originalets SVG, PNG, loggor, typsnitt och licenstext ligger oförändrade i `originalmall/`. `assets.js` innehåller inbäddade kopior för att även lokal öppning utan server ska fungera. `app.js` ändrar textfält, klubbpalett och bilder i kopior av originalets SVG. Endast klubbnamnstext har lagts till som ett nytt fält. Typsnittet DejaVu Sans medföljer under licensen i `originalmall/fonts/LICENS.txt`. Rättigheter till originalgrafik och föreningsloggor följer originalmaterialet; ingen ny rättighetsbedömning har gjorts.

Sökning gjordes i den refererade chatten, chatten **Skapa fotbollskortmallar**, tillgängliga bilagor, Documents/Codex, Documents, Downloads, Desktop och tillgängliga temporära bilagefiler. Originalpaketet återfanns som en lokal bilaga. En ytterligare kopia av originalpaketet och äldre färdiga tryckpaket fanns också. Ingen åtkomlig Card Studio-källkod eller ZIP för v0.3/v0.4 hittades. Äldre, otillgängliga molnprojekt eller utgångna sandbox-länkar kunde inte återställas. Enstaka systemskyddade temporära mappar kunde inte sökas.

`VERIFIERING.md` beskriver genomförda tester. `SHA256SUMS.txt` listar alla övriga filer i paketet. För syntaxkontroll, kör `npm run check` med Node.js installerat.

# BB3D Card Studio för WordPress/Loopia – testversion 0.1.0

En fristående WordPress-version av den godkända kortappen. Vercel och Vercel Blob används inte av denna version. Kortdesigner, klubbfärger, godkända logotyper och de nio illustrationerna återanvänds från samma källor som den befintliga appen.

## Ingår

- Fotboll, hockey, Pokémonliknande tränar- och monsterkort.
- Serverbestämda priser: 100 kr per 4-pack, fyra identiska kort per motiv.
- Manuell Swish-kontroll innan motivplats och två AI-försök öppnas.
- Samma fasta AI-recept för kläder/miljö, samma modell och medium-kvalitet; inga automatiska betalda omförsök.
- Databaslagrade AI-kvoter med villkorliga versionskontroller, dygnstak, cooldown och lås för en aktiv bild.
- Privat utskriftskö, PNG-kontroll av bilddata, CRC, pixelmått och utskriftsdensitet.
- Kundsessioner med signerad HttpOnly-cookie, CSRF-kontroll och ägarkontroller.
- Administration via befintliga WordPress-behörigheter (administratör eller WooCommerce-butiksansvarig). Ingen separat admininloggning.
- Kunduppgifter/tryckbilder otillgängliga efter 30 dagar, AI-resultat efter 24 timmar. Schemalagd rensning och anonymiserad försäljningsstatistik. Testorder räknas bort.

WooCommerce används för befintlig inloggning och behörighet. Kortköpen ligger i en separat kortkö och ändrar inte befintliga WooCommerce-order, lager eller betalningsinställningar. Automatisk WooCommerce-kassa och import av Vercels historik ingår inte i denna testversion.

## Installation på en testplats

1. Säkerhetskopiera webbplats och databas via Loopia. Använd helst en separat WordPress-testinstallation.
2. Ladda upp `bb3d-card-studio-wordpress-0.1.0.zip` via **Tillägg → Lägg till nytt → Ladda upp tillägg** och aktivera.
3. Öppna **BB3D kort** i WordPress. Tillägget börjar i testläge: endast behöriga inloggade WordPress-användare har tillgång.
4. Kontrollera att privat bildlagring är tillgänglig. Standardplatsen är en egen katalog bredvid webbplatsens publika dokumentrot. Den skapas med privata rättigheter. Om webbhotellet inte tillåter detta måste en skrivbar privat katalog utanför webbroot anges med `BB3D_CARD_PRIVATE_DIR` i `wp-config.php`. Publika kataloger avvisas; ingen fallback till mediabiblioteket finns.
5. Lägg serverns OpenAI API-nyckel i `wp-config.php` som `BB3D_OPENAI_API_KEY`. Nyckeln ingår aldrig i ZIP-filen, JavaScript eller API-svar. Klistra inte in nyckeln i en chatt. AI är avstängd från början med ett initialt dygnstak på två försök.
6. Undanta URL-parametern `bb3d_cards` och `/wp-json/bb3d-cards/v1/` (eller motsvarande `rest_route`) från sidcache/CDN. Kontrollera att olika besökare får separata sessioner. Appen svarar med privata no-store-headers.
7. Ställ in Loopias schemaläggare att anropa webbplatsens `wp-cron.php` regelbundet så att rensning inte beror på besökartrafik. Lägg inte till `DISABLE_WP_CRON` förrän den externa schemaläggaren verifierats.
8. Öppna kortstudion via knapparna i **BB3D kort**. Länkarna fungerar även om WordPress är installerat i en underkatalog eller använder enkla permalänkar.

Loopia kan behöva justera lokal PHP-körtid för AI-anrop. Tillägget begär 300 sekunder för ett påbörjat AI-jobb och begränsar leverantörsanropet till 240 sekunder. Om värden avbryter ett anrop bevaras försöket och blir osäkert i stället för att anropas igen automatiskt. Test på det verkliga kontot krävs; en ändrad PHP-inställning bevisar inte att alla proxygränser tillåter långa anrop.

## Godkännandetest före öppning

- Starta ett köp som testorder och markera **Testorder** innan **Swish kontrollerad**.
- Kontrollera köp med flera 4-pack samt att obetalda köp och andra kundsessioner saknar bild-/AI-åtkomst.
- Kör ett riktigt AI-test med ett eget godkänt testfoto: rätt miljö/kläder, igenkännbar identitet, två försök, inget dubbelt API-anrop vid avbrott. Kontrollera modellens faktiska tillgänglighet i OpenAI-kontot.
- Godkänn ett sportkort och ett Pokémonliknande kort och hämta de privata tryckfilerna. Kontrollera 1488 × 2079 px, 63 × 88 mm och utskrift.
- Kontrollera WordPress-inloggning, kundisolering i två separata webbläsarsessioner och att bildfiler inte nås via publika URL:er.
- Kontrollera statistik inklusive testundantag, betalningsrättelse och bonusförsök utan höjt dygnstak.
- Verifiera schemalagd rensning och privat lagrings backup/återställning. Återställda gamla filer ska fortfarande spärras av utgångna metadata.

Först därefter: **Öppna för kunder efter godkänt test**. Befintlig Vercel-app och data lämnas tillgängliga tills flytten är verifierad och eventuell historik har hanterats. Tillägget tar inte bort några data vid avaktivering eller avinstallation.

## Bygga och testa källkoden

```sh
npm run build
node scripts/build-wordpress.mjs
node scripts/package-wordpress.mjs /absolute/path/bb3d-card-studio-wordpress-0.1.0.zip
node --test wordpress/tests/runtime.test.mjs
node wordpress/tests/create-fixtures.mjs
BB3D_WP_TEST_ROOT=/path/to/disposable/wordpress php wordpress/tests/integration.php
```

PHP 8.2+, WordPress 6.5+, mbstring och zlib krävs. Det lokala integrationstestet kördes med PHP 8.3 och WordPress 7.1.3 med WordPress officiella SQLite-integration för isolerad testlagring. Loopia/MariaDB och riktiga OpenAI-anrop är inte verifierade av det testet. PHP-filerna har syntaxkontrollerats. JavaScript-tester täcker adressöversättning, säkerhetsheaders, privata utskriftslänkar och oförändrade bildresurser. ZIP-filen innehåller inga testdatabaser, inloggningsuppgifter eller testbibliotek.

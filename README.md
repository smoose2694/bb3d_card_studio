# BB3D Card Studio 1.1

Future Star-korteditor med kundbeställning och privat produktionskö på Vercel.

Kunden laddar upp ett foto, redigerar kortet, fyller i namn/antal och godkänner förhandsvisningen. **Bekräfta för utskrift** skapar originalets PNG-framsida (1488 × 2079 px, 63 × 88 mm, utan tillagd gloss), laddar upp den till privat Vercel Blob och sparar en beställning. Kvitto visas först när kortfil, order och statistik har sparats. Återförsök för samma godkända kort använder samma order-ID och skapar ingen dubblett.

## Produktion

Öppna `/admin` och logga in med ditt administratörslösenord. Du ser beställningar i ankomstordning med bild, kunduppgifter och antal. Hämta tryckfilen där. Välj Ny, Under produktion eller Klar; klara beställningar visas i arkivvyn. Total statistik sparas separat utan namn, kontaktuppgifter eller bilder.

Kundfiler blir oåtkomliga efter 30 dagar. Ett dagligt Vercel Cron-jobb rensar utgångna order och bilder; det innebär att fysisk borttagning kan ske upp till ett dygn efter 30-dagarsgränsen. Produktionskön rensar också utgångna poster när den öppnas. Ofullständiga uppladdningar rensas efter ett dygn.

## Drift

- Node.js 24; `npm install`, `npm run check`, `npm test`, `npm run build`.
- Vercel Functions under `api/`; serverkod under `lib/`. Bara godkända gränssnittsfiler kopieras till `public/`.
- Privat Vercel Blob kopplad till projektet, region Stockholm (`arn1`).
- `ADMIN_PASSWORD`: minst 16 tecken, väljs av ägaren direkt i Vercel.
- `ADMIN_SESSION_SECRET`: minst 32 tecken, slumpad serverhemlighet.
- `CRON_SECRET`: slumpad serverhemlighet för schemalagd rensning.
- `BLOB_READ_WRITE_TOKEN`: tillhandahålls automatiskt av Vercel Blob-anslutningen.

Alla hemligheter är servervariabler; inga hemligheter ska läggas i GitHub eller klistras in i chatten. Inloggning ger en signerad, HttpOnly/Secure/SameSite-session som gäller i 12 timmar. Byte av lösenord ogiltigförklarar gamla sessioner. Produktionskön och alla kortfiler kontrollerar sessionen på servern. Uppladdningar har kortlivade, sökvägsbegränsade token för den aktuella kundsessionen. Inloggnings- och beställningsförsök begränsas serverbaserat. Kundens originalfoto sparas inte separat; endast den godkända PNG-framsidan skickas.

Mässpris: 100 kr per 4-pack med likadana kort, utan frakt. Servern beräknar och sparar priset. Efter sparad beställning visas Swish-länk till 1233661089 med belopp och orderreferens. Kunden visar genomförd betalning för BB3D, som kontrollerar den innan status ändras till Under produktion. Ingen automatisk betalningskontroll, e-post eller WooCommerce ingår. Swish-format: https://developer.swish.nu/documentation/guides/generate-qr-codes . Automatisk AI-bearbetning, fler sporter och egna monsterkort är nästa etapp. Future Star-original och befintliga redigeringsfunktioner är bevarade. Originalmasker och baksidor i `originalmall/` ändras inte. De ligger kvar i källprojektet och följer inte med som separata publika filer i den nya byggmappen.

## Teknikval

Detta bygger vidare på den statiska GitHub/Vercel-editorn. Vercel Blob används för privat lagring av bilder, order och anonym statistik; ingen Supabase-anslutning behövs för denna etapp. Direktuppladdning till Blob gör att stora tryckfiler inte behöver skickas genom Vercel Functions gräns för request-body. PNG-signatur, CRC, dimensioner, upplösningsmetadata och dekomprimerad bilddata kontrolleras före mottagningskvittot.

Verifiering och slutlig publiceringsstatus dokumenteras i leveransrapporten. Ett fysiskt UV-tryckprov behövs för att bedöma färg och material på skrivaren.

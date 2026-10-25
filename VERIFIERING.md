# Verifiering – BB3D Card Studio 1.0

Datum: 2026-10-25. Återbyggd från den åtkomliga originalbilagan. Ingen v0.3/v0.4-källkod återfanns.

## Webbläsartester

Genomförda med automatiserad verklig webbläsare, inte enbart syntaxkontroll:

- Google Chrome 154.0.8037.59 på Windows: lokal HTTP och direkt öppning av index.html från filsystemet.
- Microsoft Edge 156.0.4314.42 på Windows: direkt öppning från filsystemet och PNG-nedladdningar.
- Ursprunglig viewBox 30 30 630 880 bevarad; det korrigerade fotoklippet används.
- Namn, svenska Å/Ä/Ö, specialtecken, långa namn och positioner. Specialtecken infogas som text.
- Alla fyra klubbval, fram-/baksida och inbäddade loggor; röd/vit FBK, röd/vit NIF, ljusblå/vit Råtorp och gul/grön Hertzöga.
- Egen logotyp, återställning av logotyp/färger, och tom logotyp för Egen klubb före uppladdning.
- 120 slumpningar fördelade på totalrating 1, 50, 87 och 99. Samtliga värden inom 1–99, samtliga summor exakt 6 × totalrating.
- Manuell ändring av stats utan att totalrating skrivs över.
- Foto med en neutral testillustration: uppladdning, originalets cover-klipp, zoom och flytt i båda axlarna. Foto, emblem och totalrating återges i export.
- Nedladdning av PNG för fram-/baksida, även utan server.
- Sparat JSON-projekt återöppnat med samma namn, foto, stats och beskärningsreglage.
- Ogiltigt projekt och fel bildfiltyp avvisas utan att det befintliga kortet raderas.
- Mobilstor layout vid 390 × 844 px och skrivbordslayout vid 1440 × 1100 px. Ingen horisontell överströmning på mobilbredden.
- Inga JavaScript-undantag eller konsolfel i Chrome-testserien; inga JavaScript-undantag i Edge-testet.

PNG-filer och gränssnitt har även granskats visuellt. Ett teckenkodningsfel och ett ID-namn som krockade med originalets bildmask rättades före slutkontrollen.

## Fil- och exportkontroll

- JavaScript-filerna och den valfria lokala servern har godkänd syntaxkontroll.
- PNG-filerna öppnas som 1488 × 2079 px, RGBA.
- pHYs: 23619 × 23625 pixlar/meter, enhet meter. Cirka 599,92 × 600,07 dpi; motsvarar 63,0001 × 88,0000 mm.
- PNG-chunkarnas CRC-kontrollsummor verifierade, inklusive den insatta upplösningsinformationen.
- Originalfilerna i originalmall har jämförts byte för byte med den uppladdade ZIP-filen.
- Distributionsarkivet har packats upp, dess ZIP-integritet kontrollerats och filerna jämförts med SHA256SUMS.txt.
- Den uppackade distributionskopian har öppnats och dess PNG-export provats i Edge.

## Verifieringens gräns

Inget faktiskt tryckprov eller publicering på GitHub genomfördes. Pages-inställningarna är instruktioner för din publicering. Safari, Firefox och fysiska mobiltelefoner har inte testats. Den exporterade filen är RGB utan utfall, CMYK/ICC, vitfärg eller lackkanal. Originalets referensmasker är inte dynamiskt uppdaterade för det redigerade kortet.

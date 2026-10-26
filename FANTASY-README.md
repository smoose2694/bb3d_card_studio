# BB3D Fantasy – första mallen

`/fantasy` är en separat Pokémon-inspirerad förhandsvisning med en egen BB3D-design. Den öppnar inte någon ny produkt för beställning och ändrar inte de publicerade fotbolls- eller hockeyflödena.

Två motivlägen finns: tränare och monster. Fyra element styr färgpaletten: eld, vatten, skog och blixt. Namn, HP, attackstyrka, attack, förmåga och berättelse kan ändras. Värden kan slumpas. Standardmotiven är enkla SVG-illustrationer som visar plats och färgsättning; de föreställer inte kundens foto och är inte AI-genererade.

En egen PNG/JPG/WebP kan visas lokalt, skalas ned till högst 2500 pixlar på längsta sidan och beskäras med zoom. Ingen bild skickas till server eller AI. Klienten gör inga API-anrop. En utbytt eller borttagen bild kan inte ersättas av en äldre inläsning som blir klar senare. Motivbyte behåller ett eget ifyllt namn.

SVG-mallen använder 630 × 880 koordinater och deklarerar samma PNG-dimensioner som sportsystemet, 1488 × 2079. Den är byggd med SVG-text och geometri, utan foreignObject, för att underlätta kommande tryckintegration. Text XML-kodas, tillåtna bildkällor begränsas till normaliserad PNG-data och numeriska värden hålls inom sina intervall. Inga externa bilder, kända karaktärer eller logotyper ingår.

37 tester passerar: tidigare 34 plus tre rendererprov för motiv/paletter/format, text/bildinjektion och värdegränser/avsaknad av beställningsanrop. Webbläsarprov verifierade båda motivlägena, elementbyte, redigering och slumpning, bevarat eget namn och inga konsolfel. Skärmbilder granskades. Egen bilduppladdning och fysisk mobil är inte separat provade i denna etapp.

Nästa steg: koppla personens foto till serverstyrda AI-prompter för tränare respektive eget monster, med samma kod-/kostnadsspärrar som tidigare. OPENAI_API_KEY tas tillsammans med användaren senare. Därefter krävs tryckexport med pHYs, produktprofil, sparat motivläge/element, kvitto/Swish och separat försäljningsgrupp. Bestäm även vilken baksida som faktiskt ska tillverkas innan förhandsvisningen görs beställbar.

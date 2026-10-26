## Godkänd illustrationsstil
De förenklade vektorfigurerna är ersatta av nio genererade exempelillustrationer: fyra stående monstermotiv, fyra breda varianter för den klassiska bildrutan och en stående tränare. Originalen följer det godkända Pokémonliknande stilförslaget med detaljrika miljöer, uttrycksfulla figurer och genomarbetad animeillustration. `sample-art.js` hämtar de offentliga WebP-filerna och bäddar in dem som bilddata i SVG:n. Kundens foto har alltid företräde; exempelbilderna räknas aldrig som ett uppladdat kundfoto och kan inte godkännas för utskrift.

Serverns motivinstruktioner använder samma kvalitetsbeskrivning för riktiga AI-bilder. Fotboll och hockey behåller fotorealistiska porträtt. Modell, pris och försökstak är oförändrade.

## Ny kortdesign
Monster har två stilar: klassisk gul ram med separat illustration och Full art med metallisk ram. Element, HP, energiikoner, förmåga och attack delar samma redigerbara data. Tränare har egen Full art-layout med silverrubrik, namn, stor illustration, tränarinsats och förmåga; HP och attackstyrka visas inte. Kortens BB3D-rubrik är borttagen. Kundinformationen om gloss och förtryckta baksidor är borttagen. Båda layouttyperna använder befintlig PNG-export och 63 × 88 mm-validering.

Filvalet återställs vid byte av motivplats, så samma foto kan väljas igen. Lagringsadaptern kontrollerar att SDK-felklasser finns innan instanceof används; konflikter behåller sin ursprungliga feltyp och återförsökbarhet.

Ett verkligt bildförsök reserverades under operatörsprovet, men servern svarade med TypeError och ingen färdig AI-bild kunde granskas. Visuell kvalitet från bildtjänsten och ett fysiskt provtryck är därför ännu inte verifierade.

## Publicerad integration
Fantasy delar nu köp, Swish, betalkontroll och två API-försök per 4-pack med sportkorten. Tränare/monster, eld/vatten/skog/blixt. PNG-framsida 1488x2079 med pHYs 23619/23625 för 63x88mm, inget gloss. Kunden väljer foto, godkänner OpenAI-bearbetning, väljer AI-version och godkänner kortet. Resultatet skickas automatiskt privat till admin; inga mejl eller manuell kundexport behövs. Adminvyn Redo att printa visar betalda kompletta köp. Tränare/monster särredovisas i statistiken. Baksidan använder befintligt förtryckt underlag; egen fantasybaksida återstår.

AI använder serverstyrda motivinstruktioner och befintligt modellval enligt https://developers.openai.com/api/reference/resources/images/methods/edit (kontrollerad 2026-10-26). Sportpromptar omfattar också hockey och egen fotbollsklubb med valda färger. Ingen verklig OpenAI-bild eller fysisk utskrift har ännu kvalitetsgranskats. Alla automatiska prov använder syntetiska data och mockad bildtjänst.

### Tidigare förhandsvisning
# BB3D Fantasy – första mallen

`/fantasy` är en separat Pokémon-inspirerad förhandsvisning med en egen BB3D-design. Den öppnar inte någon ny produkt för beställning och ändrar inte de publicerade fotbolls- eller hockeyflödena.

Två motivlägen finns: tränare och monster. Fyra element styr färgpaletten: eld, vatten, skog och blixt. Namn, HP, attackstyrka, attack, förmåga och berättelse kan ändras. Värden kan slumpas. Standardmotiven är enkla SVG-illustrationer som visar plats och färgsättning; de föreställer inte kundens foto och är inte AI-genererade.

En egen PNG/JPG/WebP kan visas lokalt, skalas ned till högst 2500 pixlar på längsta sidan och beskäras med zoom. Ingen bild skickas till server eller AI. Klienten gör inga API-anrop. En utbytt eller borttagen bild kan inte ersättas av en äldre inläsning som blir klar senare. Motivbyte behåller ett eget ifyllt namn.

SVG-mallen använder 630 × 880 koordinater och deklarerar samma PNG-dimensioner som sportsystemet, 1488 × 2079. Den är byggd med SVG-text och geometri, utan foreignObject, för att underlätta kommande tryckintegration. Text XML-kodas, tillåtna bildkällor begränsas till normaliserad PNG-data och numeriska värden hålls inom sina intervall. Inga externa bilder, kända karaktärer eller logotyper ingår.

37 tester passerar: tidigare 34 plus tre rendererprov för motiv/paletter/format, text/bildinjektion och värdegränser/avsaknad av beställningsanrop. Webbläsarprov verifierade båda motivlägena, elementbyte, redigering och slumpning, bevarat eget namn och inga konsolfel. Skärmbilder granskades. Egen bilduppladdning och fysisk mobil är inte separat provade i denna etapp.

Nästa steg: koppla personens foto till serverstyrda AI-prompter för tränare respektive eget monster, med samma kod-/kostnadsspärrar som tidigare. OPENAI_API_KEY tas tillsammans med användaren senare. Därefter krävs tryckexport med pHYs, produktprofil, sparat motivläge/element, kvitto/Swish och separat försäljningsgrupp. Bestäm även vilken baksida som faktiskt ska tillverkas innan förhandsvisningen görs beställbar.

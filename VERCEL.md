# Publicera BB3D Card Studio med Vercel

Appen är en statisk HTML/JavaScript-app. Den behöver ingen databas, serverdel, API-nyckel eller miljövariabel.

## Koppla projektet en gång

1. Logga in på Vercel med det konto eller team som ska äga appen.
2. Välj **Add New → Project** och importera GitHub-projektet **smoose2694/bb3d_card_studio**. Om projektet inte visas behöver Vercels GitHub-app få tillgång till just det repositoryt.
3. Välj ett projektnamn, exempelvis **bb3d-card-studio**. Vercels projektnamn använder bindestreck i stället för understreck.
4. Använd **Other** som Framework Preset och repositoryts rot (`./`) som Root Directory.
5. `vercel.json` anger redan tomma bygg- och installationskommandon samt `.` som Output Directory. Inga miljövariabler behövs.
6. Klicka **Deploy**. Öppna den adress Vercel faktiskt tilldelar projektet när publiceringen visar **Ready**.
7. Kontrollera klubbval, fotouppladdning och PNG-export på den publicerade adressen.

## Kommande uppdateringar

När Vercel-projektet är kopplat till GitHub publiceras nya ändringar i produktionsgrenen (normalt **main**) automatiskt. Ändringar i andra grenar kan ge separata förhandsvisningar. Kontrollera att Production Branch är **main**.

Om sidan bara visar README eller ger 404: kontrollera att `index.html`, `app.js`, `assets.js` och `styles.css` ligger i rotmappen i samma version som Vercel använder. Om Vercel letar efter `dist`: ta bort den gamla inställningen eller använd den medföljande `vercel.json` som anger `.`.

Vercel-publiceringen är klar först när en riktig deployment visar **Ready** och appens funktioner har kontrollerats på dess adress. Att konfigurationsfilen finns på GitHub är förberedelsen, inte bevis på genomförd publicering.

Officiella källor kontrollerade 2026-10-25:
- [Vercels bygginställningar](https://vercel.com/docs/builds/configure-a-build)
- [Konfiguration med vercel.json](https://vercel.com/docs/project-configuration/vercel-json)
- [GitHub-integration](https://vercel.com/docs/git/vercel-for-github)

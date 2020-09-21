Browser Chance Music (BCM) 
---

Browser Chance Music (BCM) lets the audience experience the high-frequency, invisible software activity that occurs in our mobile devices when we browse the web. Billions of citizens browse the web every day, everywhere. This activity is powered by billions of software operations that take care of connecting devices to the web and transporting the information from one side of the world to another. Yet, this amazing software activity is invisible, intangible and unknown by most users.
Browser Chance Music explores interactive, spatialized sonification to let users experience this software activity. Through sound, we embody the rich software execution, which is usually disembodied and invisible on a regular interaction with software applications. One challenge we face in this project relates to the significant gap of temporality between the two phenomena: the visible act of browsing is performed at the speed of humans clicking buttons or swiping screens; meanwhile, software that runs in the browser to let humans access the world wide web, operates at a radically different speed, up to thousands of operations per second.

BCM explores interactive sonification in order to design and perform software art. It focuses on web browsing because (i) it is performed daily by millions of citizens, worldwide; (ii) this task can be performed anywhere, anytime on many different devices; (iii) web browsers are fascinating software objects that have inspired several iconic pieces of software art, such as the web stalker.

Populärvetenskaplig beskrivning
---

Browser Chance Music låter publiken uppleva den högfrekventa och osynliga mjukvaruaktiviteten som äger rum i våra mobila enheter när vi surfar på nätet. Varje dag använder miljarder människor internet, en aktivitet som styrs och drivs av miljarder och åter miljarder mjukvaruoperationer. Dessas uppgift är att koppla ihop enheter och transportera information från en del av världen till en annan över internet. Trots att de är allt viktigare för vår vardag är dessa aktiviteter osynliga, ogripbara och till och med okända för de allra flesta användare.

Browser Chance Music utforskar möjligheterna med att använda interaktiv och spatialiserad sonifiering för att låta användaren uppleva den dolda mjukvaruaktiviteten. Den i vanliga fall flyktiga och osynliga väven av mjukvaruoperationer som är konsekvensen av och drivkraften i vårt surfande blir genom ljudet förkroppsligad och påtaglig. En utmaning i projektet rör den temporala skillnaden mellan interaktion, process och effekt: den synliga processen i att surfa på nätet äger rum som ett resultat av att vi relativt långsamt klickar eller sveper på en skärm. Mjukvaran i webläsaren som möjliggör detta, å andra sidan, är aktiv i en radikalt högre hastighet som ofta är långt över människans uppfattningsförmåga.

Genom att låta deltagare uppleva de dataströmmar som flödar från deras egna enheter hoppas vi att skapa en personlig anknytning och förståelse för det virtuella ogripbara som hela tiden pågår i bakgrunden. Att använda ljud för detta ändamål drar fördel av människans fenomenala hörselsinne som kan bearbeta oerhörda mängder detaljerad information, men ljud har också vissa likheter med den dataström vi vill konkretisera. Liksom virtuella mjukvaruhändelser uppstår ljud i ett material för att sedan snabbt försvinna och lämna plats för nya ljudvågor i ett system av ständig och snabb förändring. Men till skillnad från mjukvaruoperationerna tar sig ljudet fram till öronen och får oss att tänka och känna.


## Setting up a test environment

Prerequisites: node.js, npm, SuperCollider, wireshark, tshark.
Depending on your OS you may need to configure tshark to run without being the super user.

Go to `code/BCM/server` and run
```
npm i
```
to install all dependencies.

Download the sound files required separately and place them in `code/BCM/supercollider_src/sounds/`.

## Starting

Find the name of your network interface, e.g. on modern Linux systems using `ip addr`. To start a local instance of the server, run:
```
node station.js -i NETWORK_INTERFACE
```
substituting NETWORK_INTERFACE for the name of your network interface, e.g.
```
node station.js -i wlp2s0
```

To see the dashboard, go to http://localhost:8000/, from where you can start the packet sniffing, play back recorded samples of data and open the visualizations.

To start the sonification, open the file `code/BCM/supercollider_src/main/main.scd` and run the main block.
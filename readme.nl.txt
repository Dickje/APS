Met deze app kunt u het opgewekte vermogen en de energie uitlezen, zowel via de ECU als via de web-API.

Gebruik van de ECU:
- Download en installeer de EMA Manager-app op uw mobiele apparaat vanuit de juiste app store.
- Zet de ECU-R in Access Point-modus: Zoek de fysieke knop op uw ECU-R.
  Houd de knop een paar seconden ingedrukt totdat de ECU Wi-Fi is ingeschakeld.
  U zou deze moeten zien in de lijst met beschikbare wifi-netwerken op uw apparaat. Dit geeft aan dat de ECU in Access Point-modus staat.
- Maak verbinding met de wifi van de ECU-R: Gebruik uw mobiele apparaat om verbinding te maken met het zojuist aangemaakte wifi-netwerk van uw ECU-R.
  Het standaard wifi-wachtwoord is 88888888.
- Start EMA Manager: Open de EMA Manager-app op uw apparaat. Kies de optie "Lokaal".
  De app zou uw ECU-R automatisch moeten detecteren en er verbinding mee moeten maken.
- Zodra de verbinding tot stand is gebracht, kunt u de netwerkinstellingen van de ECU-R configureren met de EMA Manager-app.
  Verbind de ECU-R met hetzelfde (Wi-Fi) netwerk als uw Homey.

U kunt de verbinding testen met behulp van ping, of via de terminal met het commando Netcat. Volg het onderstaande voorbeeld, maar gebruik het juiste (vaste) IP-adres van uw ECU.
Als de verbinding tot stand is gebracht, ziet u regel 2. Typ vervolgens het commando APS1100160001END. Als u een reactie krijgt (regel 4), kunt u de integratie installeren.
Zo niet, schakel uw ECU dan uit en weer in, wacht tot deze is opgestart en probeer het opnieuw. Het wordt sterk aanbevolen om een ​​vast IP-adres aan de ECU toe te wijzen.

[core-ssh .storage]$ nc -v 172.16.0.4 8899 <┘
172.16.0.4 (172.16.0.4:8899) open
APS1100160001END <┘
APS11009400012160000xxxxxxxz%10012ECU_R_1.2.22009Etc/GMT-8

De ECU rapporteert slechts elke 5 minuten. Een korter pollinginterval levert niet meer informatie op, maar lijkt ervoor te zorgen dat de ECU vastloopt.

Voor het WEB-apparaat kunt u een API-sleutel aanvragen bij AP Systems. U mag 1000 API-aanroepen per maand gratis uitvoeren, dus wees voorzichtig met de pollinginstellingen.
In de app moet u de API-sleutel, het API-geheim en de systeem-ID invoeren. Die laatste informatie is te vinden op de webpagina waar u de prestaties van uw systeem kunt bekijken.
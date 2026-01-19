Diese App ermöglicht es Ihnen, die erzeugte Leistung und Energie entweder vom Steuergerät (ECU) und/oder über die Web-API auszulesen.

So verwenden Sie das Steuergerät:
- Laden Sie die EMA Manager App aus dem entsprechenden App Store auf Ihr Mobilgerät herunter und installieren Sie sie.
- Versetzen Sie das Steuergerät in den Access-Point-Modus: Suchen Sie die physische Taste an Ihrem Steuergerät.
  Halten Sie die Taste einige Sekunden lang gedrückt, bis das WLAN des Steuergeräts aktiviert ist.
  Das Steuergerät sollte nun in den verfügbaren WLAN-Netzwerken Ihres Geräts angezeigt werden. Dies zeigt an, dass sich das Steuergerät im Access-Point-Modus befindet.
- Verbinden Sie sich mit dem WLAN des Steuergeräts: Verbinden Sie Ihr Mobilgerät mit dem neu erstellten WLAN-Netzwerk Ihres Steuergeräts.
  Das Standard-WLAN-Passwort lautet 88888888.
- Starten Sie den EMA Manager: Öffnen Sie die EMA Manager App auf Ihrem Gerät. Wählen Sie die Verbindungsoption „Lokal“.
  Die App sollte Ihr Steuergerät automatisch erkennen und sich verbinden.
- Nach der Verbindung können Sie die Netzwerkeinstellungen des Steuergeräts mit der EMA Manager App konfigurieren.
  Verbinden Sie das ECU-R mit demselben WLAN-Netzwerk wie Ihr Homey.

Die Verbindung kann per Ping oder über das Terminal mit dem Befehl `netcat` getestet werden. Folgen Sie dem unten stehenden Beispiel, verwenden Sie jedoch die korrekte (feste) IP-Adresse Ihres Steuergeräts.
Bei erfolgreicher Verbindung sehen Sie Zeile 2. Geben Sie anschließend den Befehl `APS1100160001END` ein. Erhalten Sie eine Antwort (Zeile 4), können Sie die Integration installieren.
Andernfalls schalten Sie Ihr Steuergerät aus und wieder ein, warten Sie, bis es hochgefahren ist, und versuchen Sie es erneut. Es wird dringend empfohlen, dem Steuergerät eine feste IP-Adresse zuzuweisen.

[core-ssh .storage]$ nc -v 172.16.0.4 8899 <┘
172.16.0.4 (172.16.0.4:8899) open
APS1100160001END <┘
APS11009400012160000xxxxxxxz%10012ECU_R_1.2.22009Etc/GMT-8

Das Steuergerät meldet sich nur alle 5 Minuten. Ein kürzeres Abfrageintervall liefert keine zusätzlichen Informationen, sondern scheint dazu zu führen, dass sich das Steuergerät aufhängt.

Fordern Sie für das Webgerät einen API-Schlüssel bei AP Systems an. Sie können monatlich 1000 API-Aufrufe kostenlos durchführen. Achten Sie daher auf die korrekten Abfrageeinstellungen.
In der App müssen Sie den API-Schlüssel, das API-Geheimnis und die System-ID eingeben. Letzteres finden Sie auf der Webseite, auf der Sie die Leistung Ihres Systems einsehen können.
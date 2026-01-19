Cette application vous permet de lire la puissance et l'énergie générées par le calculateur (ECU) et/ou via l'API web.

Pour utiliser le calculateur :
- Téléchargez et installez l'application EMA Manager sur votre appareil mobile depuis la boutique d'applications appropriée.
- Mettez le calculateur en mode point d'accès : repérez le bouton physique sur votre calculateur.
  Appuyez sur le bouton et maintenez-le enfoncé pendant quelques secondes jusqu'à ce que le Wi-Fi du calculateur s'active.
  Il devrait apparaître dans la liste des réseaux Wi-Fi disponibles sur votre appareil. Cela indique que le calculateur est en mode point d'accès.
- Connectez-vous au Wi-Fi du calculateur : utilisez votre appareil mobile pour vous connecter au réseau Wi-Fi créé par votre calculateur.
  Le mot de passe Wi-Fi par défaut est 88888888.
- Lancez EMA Manager : ouvrez l'application EMA Manager sur votre appareil. Choisissez l'option de connexion « Locale ».
  L'application devrait détecter et se connecter automatiquement à votre calculateur.
- Une fois connecté, utilisez l'application EMA Manager pour configurer les paramètres réseau du calculateur.
  Connectez l'ECU-R au même réseau Wi-Fi que votre Homey.

Pour tester la connexion, utilisez la commande ping ou, depuis le terminal, la commande Netcat. Suivez l'exemple ci-dessous en utilisant l'adresse IP fixe de votre ECU.
Si la connexion est établie, la ligne 2 s'affiche. Saisissez ensuite la commande APS1100160001END. Si vous obtenez une réponse (ligne 4), vous pouvez procéder à l'installation de l'intégration.
Sinon, redémarrez votre ECU, attendez son redémarrage et réessayez. Il est fortement recommandé d'attribuer une adresse IP fixe à l'ECU.

[core-ssh .storage]$ nc -v 172.16.0.4 8899 <┘
172.16.0.4 (172.16.0.4:8899) ouvert
APS1100160001END <┘
APS11009400012160000xxxxxxxz%10012ECU_R_1.2.22009Etc/GMT-8

L'ECU ne transmet ses données que toutes les 5 minutes. Un intervalle d'interrogation plus court ne fournira pas plus d'informations, mais semble provoquer le blocage de l'ECU.

Pour le périphérique web, demandez une clé API auprès d'AP Systems. Vous disposez de 1 000 appels API gratuits par mois ; soyez donc vigilant avec les paramètres d'interrogation.
Dans l'application, vous devez saisir la clé API, le secret API et l'identifiant système. Cette dernière information se trouve sur la page web où vous pouvez consulter les performances de votre système.
const Discord = require('discord.js');
const Database = require("better-sqlite3");
const fs = require('fs');
const db = new Database('fiche.db', { verbose: console.log });
const pdfFiller = require('pdffiller');
const bot = new Discord.Client();
const config = require('./config.json');
//const Enmap = require("enmap");

var destinationPDF;

var nameRegex = null;
var shouldFlatten = false;
var fiche;

bot.on('error', console.error);

bot.on('ready', () => {
	bot.user.setActivity('Je suis là pour aider mon maiiiiitree.');
	const tableFiche = db.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'fiche';").get();
	if (tableFiche['count(*)']) { db.prepare("DROP TABLE IF EXISTS `fiche`;").run(); } //TO DELETE WHEN STABLE
	if (!tableFiche['count(*)']) {
		// If the table isn't there, create it and setup the database correctly.
		db.prepare(`CREATE TABLE fiche (id_fiche INTEGER PRIMARY KEY, nom VARCHAR, prenom VARCHAR, 
	race VARCHAR, sexe VARCHAR, age VARCHAR, ambition VARCHAR, pdm INTEGER, affinite VARCHAR, jobs VARCHAR, langues VARCHAR, folies VARCHAR,
	niveau INTEGER, pdc INTEGER, vieMax INTEGER, vie INTEGER, armureMax INTEGER, armure INTEGER, pdd INTEGER, pdf INTEGER,
	force INTEGER, agilite INTEGER, intelligence INTEGER, charisme INTEGER, endurance INTEGER, competences TEXT, sorts TEXT,
	arme_gauche VARCHAR, type_gauche VARCHAR, lance_gauche INTEGER, degats_gauche VARCHAR, notes_gauche VARCHAR,
	arme_droite VARCHAR, type_droite VARCHAR, lance_droite INTEGER, degats_droite VARCHAR, notes_droite VARCHAR,
	arme_bonus VARCHAR, type_bonus VARCHAR, lance_bonus INTEGER, degats_bonus VARCHAR, notes_bonus VARCHAR,
	nom_bouclier VARCHAR, protection VARCHAR, notes_bouclier VARCHAR, armures TEXT, munitions VARCHAR, decoctions VARCHAR,
	gold INTEGER, argent INTEGER, cuivre INTEGER, bijoux TEXT, torches VARCHAR, divers TEXT, bio TEXT, factions TEXT, fk_id_roliste INTEGER, FOREIGN KEY (fk_id_roliste) REFERENCES roliste(id_roliste));`).run();
		// Ensure that the "id" row is always unique and indexed.
		db.prepare("CREATE UNIQUE INDEX id_fiche ON fiche (id_fiche);").run();
		db.pragma('encoding="UTF-8"');
		db.pragma("synchronous = 1");
		db.pragma("journal_mode = wal");
		db.pragma("foreign_keys = ON");
	}
	const tableRoliste = db.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'roliste';").get();
	if (tableRoliste['count(*)']) { db.prepare("DROP TABLE IF EXISTS `roliste`;").run(); }
	if (!tableRoliste['count(*)']) {
		db.prepare("CREATE TABLE roliste (id_roliste INTEGER PRIMARY KEY, id_fiche_choisie INTEGER DEFAULT 0);").run();
		db.prepare("CREATE UNIQUE INDEX id_roliste ON roliste (id_roliste);").run();
	}

	const tableItem = db.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'item';").get();
	if (tableItem['count(*)']) { db.prepare("DROP TABLE IF EXISTS `item`;").run(); }
	if (!tableItem['count(*)']) {
		db.prepare("CREATE TABLE item (id_item INTEGER PRIMARY KEY, nom VARCHAR, poids INTEGER, id_divers INTEGER, id_bijoux, id_decoctions)").run();
		db.prepare("CREATE UNIQUE INDEX id_item ON item (id_item);").run();
	}
	bot.getFiche = db.prepare("SELECT * FROM fiche WHERE fk_id_roliste = ?");
	bot.getFicheActuelle = db.prepare("SELECT * FROM fiche INNER JOIN roliste ON fiche.fk_id_roliste=roliste.id_roliste WHERE id_roliste = ? ");
	bot.setFiche = db.prepare(`INSERT OR REPLACE INTO fiche 
  (nom, prenom, race, sexe, age, ambition, pdm, affinite, jobs, langues, folies, niveau, pdc, vieMax, vie, 
  armureMax, armure, pdd, pdf, force, agilite, intelligence, charisme, endurance, competences, sorts, 
  arme_gauche, type_gauche, lance_gauche, degats_gauche, notes_gauche, arme_droite, type_droite, lance_droite, degats_droite, notes_droite, 
  arme_bonus, type_bonus, lance_bonus, degats_bonus, notes_bonus, nom_bouclier, protection, notes_bouclier, armures, munitions, decoctions, 
  gold, argent, cuivre, bijoux, torches, divers, bio, factions, fk_id_roliste) 
  VALUES (@nom, @prenom, @race, @sexe, @age, @ambition, @pdm, @affinite, @jobs, @langues, @folies, @niveau, @pdc, @vieMax, @vie, 
  @armureMax, @armure, @pdd, @pdf, @force, @agilite, @intelligence, @charisme, @endurance, @competences, @sorts,
  @arme_gauche, @type_gauche, @lance_gauche, @degats_gauche, @notes_gauche, @arme_droite, @type_droite, @lance_droite, @degats_droite, @notes_droite, 
  @arme_bonus, @type_bonus, @lance_bonus, @degats_bonus, @notes_bonus, @nom_bouclier, @protection, @notes_bouclier, @armures, @munitions, @decoctions,
  @gold, @argent, @cuivre, @bijoux, @torches, @divers, @bio, @factions, @fk_id_roliste);`);
});

bot.on('message', message => {
	if (message.author.bot) return;
	let user = message.author;
	let args = message.content.slice(config.prefix.length).trim().split(/ +/g);
	let command = args.shift().toLowerCase();
	let msg = args.join(' ');
	let msge = message.content.toLowerCase();

	//https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/first-bot/a-basic-command-handler.md
	function setFiche(user_id, nom, prenom, race, sexe, age, ambition, pdm, affinite, jobs, langues, folies, niveau, pdc, vieMax, vie, armureMax, armure,
		pdd, pdf, force, agilite, intelligence, charisme, endurance, competences, sorts,
		arme_gauche, type_gauche, degats_gauche, lance_gauche, notes_gauche,
		arme_droite, type_droite, degats_droite, lance_droite, notes_droite,
		arme_bonus, type_bonus, degats_bonus, lance_bonus, notes_bonus,
		nom_bouclier, protection, notes_bouclier, armures, munitions, decoctions,
		gold, argent, cuivre, bijoux, torches, divers, bio, factions) {
		fiche = {
			fk_id_roliste: user_id,
			nom: nom,
			prenom: prenom,
			race: race,
			sexe: sexe,
			age: age,
			ambition: ambition,
			pdm: pdm,
			affinite: affinite,
			jobs: jobs,
			langues: langues,
			folies: folies,
			niveau: niveau,
			pdc: pdc,
			vieMax: vieMax,
			vie: vie,
			armureMax: armureMax,
			armure: armure,
			pdd: pdd,
			pdf: pdf,
			force: force,
			agilite: agilite,
			intelligence: intelligence,
			charisme: charisme,
			endurance: endurance,
			competences: competences,
			sorts: sorts,
			arme_gauche: arme_gauche,
			type_gauche: type_gauche,
			degats_gauche: degats_gauche,
			lance_gauche: lance_gauche,
			notes_gauche: notes_gauche,
			arme_droite: arme_droite,
			type_droite: type_droite,
			degats_droite: degats_droite,
			lance_droite: lance_droite,
			notes_droite: notes_droite,
			arme_bonus: arme_bonus,
			type_bonus: type_bonus,
			degats_bonus: degats_bonus,
			lance_bonus: lance_bonus,
			notes_bonus: notes_bonus,
			nom_bouclier: nom_bouclier,
			protection: protection,
			notes_bouclier: notes_bouclier,
			armures: armures,
			munitions: munitions,
			decoctions: decoctions,
			gold: gold,
			argent: argent,
			cuivre: cuivre,
			bijoux: bijoux,
			torches: torches,
			divers: divers,
			bio: bio,
			factions: factions
		}
		db.prepare(`INSERT INTO roliste (id_roliste, id_fiche_choisie) VALUES (?, ?);`).run(message.author.id, 0);
		var id_fiche = bot.setFiche.run(fiche);
		db.prepare('UPDATE roliste SET id_fiche_choisie = ? where id_roliste =?').run(parseInt(id_fiche.lastInsertRowid, 10), message.author.id);
		return fiche;
	}

	if ((message.author.bot) || (!msge.startsWith(config.prefix)) || (message.channel.id !== config.servtest && message.channel.id !== config.channelCommandes)) return;
	var fiche = bot.getFiche.get(message.author.id);
	switch (message.author.id) {
		case config.joueur2:
			if (!fiche) {
				setFiche(message.author.id, 'Lafie', 'Giselle', 'Humain', 'Femme', '26', '', 0, '', 'Danseuse', 'ReikSpiel', '', 1, 0, 20, 20, 0, 0, 3, 0, 45, 60, 45, 60, 50,
					'Acrobatie\n Chant\nDanse\nHumour (contextuel)\nSens de la répartie (contextuel)', '', '', '', '', '', '', 'Dague', '', 1, 4, '', '', '', '', '', '', '', '', '',
					'Vêtement de bonne qualité', '', '', 2, 5, 0, 'Bague jaune (mais pas en or)',
					'Vol pour la guide des récolteurs dans l\'auberge du ragondin à la broche.\nSuite à des ordres de missions : Obrick (les rejoindre) faire attention au groupe (Comptes Rendus)',
					'Le squelette rieur - Recrue');
			}
			var ficheActuelle = bot.getFicheActuelle.get(message.author.id);
			break;

		case config.joueur1:
			if (!fiche) {
				setFiche(message.author.id, 'Alith', 'Balan', 'Elfe', 'M', 23, '', 5, '', 'Barde', 'ReikSpiel(parler)', '', 4, 0, 20, 20, 0, 0, 0, 0, 40, 50, 60, 70, 45,
					"",
					"Entrain Estival (3PM) :​ ​ La température de leur corps augmente .Cible un groupe d'1D4 personnes à portée​ ​ Le Barde peut viser 1D4 Cibles supplémentaires à portéepar tranche de 2 Points de Magie supplémentaires dépensés au lancement du sort(en plus du coût initial de 3 Points de Magie). (2H)\
					\nMélodie de la danse(4PM) :​ Ce sort cible un individu ou un groupe composé dequatre individus max, ce dernier devra constamment se déplacer en jouant samélodie. Le sort dure jusqu'à ce que le barde cesse la mélodie, ou cesse de bougeren jouant.",
					'Epée elfique', '', 1, 'D6', "", '', '', 0, 0, '', '', '', 0, 0, '',
					'', "", '', 'gilet de couleur violet en cuir ouvert sur la poitrine, chapeau en paille teint en bleu et botte en  cuir', '', '', 0, 0, 0,
					"",
					'',
					"Luth sonnant\n3 parchemins vierge\n2 plume\nun encrier\n3lettres de réponse négative au déclarations d’amour provenant de jeunesdemoiselles\nGourde de vin",
					"Cousin d’athnar, fils de vigneron, Balan passa sa jeunesse au château de son cousin et a joué de la musique. véritable prodige, un maître barde qui était présent au château leremarqua et le prit sous son aile.\
					\nAprès lui avoir montré ses talents , Balan fut formé et devint son disciple. C'est ainsi queBalan apprit la magie sur les routes et quand il arriva en ville , il profita de la renommé deson maître pour jouer de la musique dans les plus beaux châteaux.\
					\nDes années après , Balan passa le Récital et devint barde de deuxième rang, il accrochaune fleur de lys à son luth et passa la soirée dans un château ducal pour l'occasion. Hélasson maître mourut de mort naturelle pour un barde ( planté avec un couteau par un marijaloux ).\
					\nDésormais solitaire, il tente désormais de se faire sa propre renommée à travers les routeset les tavernes. Mais en manque d’inspiration , il ne sait où la trouver.\nC'est alors qu'il entendit parler d'une guerre civile dans l'empire...",
					'');
			}
			var ficheActuelle = bot.getFicheActuelle.get(message.author.id);
			break;

		case config.joueur3:
			if (!fiche) {
				setFiche(message.author.id, '', 'Edelwin', 'Humain', 'F', 22, '', 0, '', 'Espionne', 'ReikSpiel - Parler et écrire', '', 1, 0, 20, 20, 0, 0, 3, 0, 40, 60, 55, 60, 40,
					'Position de combat\nConduire une calèche', 'Messager\nAction secrète', 'Rapière', '', 1, 6, '', 'Arc court', '', 1, '3+1', '', '', '', '', '', '', '', '', '',
					'Tenue en cuir\nCape\nBottes', '30 flèches', '', 0, 10, 0, '', '', "Mirroir\nCoffre de toilette avec double fond\nKit de crochettage\nPoison de paralysie 3\nCorde 10 mètres\nclé d\'une ferme\npotion d'obeissance à moitie utilisée\n1 doses : Poison Humanicide\nFausse monnaie",
					"Enfant unique du duc Harmon de Minor et de la Duchesse Sofia de Minor, morte quelques jours après ma naissance. J’ ai était élevé par mon père sans jamais manquer de rien. Mon enfance était divisée en deux activités très distinctes. L'apprentissage des bonnes manières avec ma nourrice “ Orsenna”  et les rudiments du combat avec le maître d’armes de la famille “ Maître Zor”. Mon père n'appréciait pas trop ce dernier point, mais me laissait faire, car il savait que tôt ou tard, je serais livré à moi-même.\n\nLors d’ un bal organisé par la famille Zerk, famille qui nous jalousait. Mon père fut empoisonné, mais les coupables ne furent jamais incriminés. Et je devais ma survie, qu’ au fait que pour eux, j'étais qu’une simple fille qui ne pouvait poser aucun tort à quiconque.\n\nJ’ ai alors passé deux années à m'entraîner sans relâche et développées une maîtrise non-négligeable de la rapière…    Fine et Délicate, mais aussi Précise et Rapide. Une sorte d’alchimie était née entre l’arme et mon bras.\n\nUn soir, je me suis infiltré dans le manoir de la famille Zerk et j’ ai assassiné tous les membres présent le soir de la mort de mon père. Je me rappelais encore les sourires qui illuminaient leurs visages quand mon père s'est écroulé et je n’ avais aucune pitié pour eux.\n\nLe lendemain, j'ai été arrêté par la garde et j’ai été condamné à mort. Cependant juste avant ma condamnation des personnes sont venue me chercher m’expliquant qu’il voulait me recruter et que ma mort officielle pouvait leur servir.\n\nJ’ ai alors travaillé pour eux en temps qu’espionne, ayant pour nouveau nom Edelwin. Ils m’ont formé à l’art de l’illusion où j’ ai pu développer des compétences très utiles pour mes activités. Ma spécialité, infiltrer des réseaux afin de surveiller leurs actions.",
					"Noblesse de sylvannie - Espionne\n Service de renseignement de l'empire - Agent double");
			}
			var ficheActuelle = bot.getFicheActuelle.get(message.author.id);
			break;

		case config.joueur4:
			if (!fiche) {
				setFiche(message.author.id, '', 'Teron', 'Humain', 'M', '', '', 0, '', 'Chasseur de primes', 'ReikSpiel', '', 3, 0, 20, 20, 4, 4, 2, 1, 50, 70, 50, 45, 50,
					'Combat rapproché\nPsychologie\nFilature\nDéplacement Silencieux\nAdresse au tir\nDiscrétion', '', 'Epée', '', 1, '6+2', '', 'Arbalète', '', 1, 6
					, '', '', '', '', '', '', '', '', '', '', '10 carreaux', '', 37, 16, 81, '', '', 'Filet\nCordes\n4 menottes\nArmures de gardes diverses en mauvais état.', '', '');
			}
			var ficheActuelle = bot.getFicheActuelle.get(message.author.id);
			break;

		case config.joueur5:
			if (!fiche) {
				setFiche(message.author.id, '', 'Ray', 'Humain', 'M', 25, "Maitre d'arme", 0, 'Magie de la bête', 'Guerrier mercenaire', 'ReikSpiel', '', 3, 0, 20, 20, 6, 6, 2, 3, 55, 60, 40, 50, 50,
					"Désarmement\nEsquive\nEquitation\nCoup puissant et assomant\nSoin des animaux (50%)\nJargon de bataille",
					"Transformation en ours : 10 points de magies par sort, si le minimum n'est pas éteint le sort fonctionnera avec plusieurs répercussions inattendues.",
					'Epée', '', 1, 6, '', '', '', '', '', '', '', '', '', '', '', 'Bouclier en bois', '+2pts en armure', '', 'Chemise de mailles (4 de protecion)', '', '',
					35, 0, 0, '', '', "Kit alchimie\n2 fioles vides\n2 lance en bois de jets (1D3)\nImitation de l'armure du roi Phénix", '', '');
			}
			var ficheActuelle = bot.getFicheActuelle.get(message.author.id);
			break;

		case config.joueur6:
			if (!fiche) {
				setFiche(message.author.id,'Altmann','Eike','Humain','Homme','25','Templier de Sigmar',5,'','Initié de Sigmar','Relkspiel','',4,0,20,20,3,3,0,0,60,40,40,60,50,
				'Théologie\nAlphabetisation\nLangage Secret : classique\nMaitrise du marteau','Bouclier du livre\nGuerison\nSceau du livre','marteau de guerre','',1,6,'','','','','','','','','','','',
				'','','','Cotte de maille','','',0,5,0,'','','Emblème de sigmar\nTome de sigmar enchanté','','Temple de sigmar initié');
				/*
				setFiche(message.author.id, 'Wiedermann', 'Ilenor', 'Humain', 'Femme', '19', 'Démon majeur de Tzeentch', 10, '', 'Apprenti sorcier des taillis askip', 'Lire parler écrire - RelkSpiel', ''
					, 2, 0, 20, 20, 0, 0, 2, 1, 40, 60, 60, 55, 40, 'Déplacement silencieux (rural)\nEscamotage\nFuite\nIdentification des plantes\nCréation de drogues\nSoins des animaux',
					"FLamme verte de Tzeentch : sur 30M max blesse 1D3+1 de dégats ne pouvant être régnéré que par soin magique.\nSoin mineur 1D3\nIncantion magie Mineure\nInvocation de gui lvl 1 : 15 pv attaque 1D3+1, provoque peur sur cible",
					'Arc de chasse', 'Distance', 1, 'D3', 'Portée de 260m', 'Arbalète', 'Distance', 1, 'D4', 'Portée de 100m max', '', '', '', '', '', 'Bouclier en bois', '+2 pts armure', '', 'Chemise de mailles (4 PV)',
					'20 Flèches en bois et 10 carreaux', '', 27, 0, 0, '', '', '', '', '');*/
			}
			var ficheActuelle = bot.getFicheActuelle.get(message.author.id);
			break;

		default:
			if (!fiche) {
				setFiche(message.author.id, 'Lafie', 'Giselle', 'Humain', 'Femme', '26', '', 0, '', 'Danseuse', 'ReikSpiel', '', 1, 0, 20, 20, 0, 0, 3, 0, 45, 60, 45, 60, 50,
					'Acrobatie\n Chant\nDanse\nHumour (contextuel)\nSens de la répartie (contextuel)\nChant', '', '', '', '', '', '', 'Dague', '', 1, 4, '', '', '', '', '', '', '', '', '',
					'Vêtement de bonne qualité', '', '', 2, 5, 0, 'Bague jaune (mais pas en or)',
					'Vol pour la guide des récolteurs dans l\'auberge du ragondin à la broche.\nSuite à des ordres de missions : Obrick (les rejoindre) faire attention au groupe (Comptes Rendus)',
					'Le squelette rieur - Recrue');
			}
			var ficheActuelle = bot.getFicheActuelle.get(message.author.id);
			break;

	}

	switch (command) {
		case "aide":
			message.channel.send({
				embed: {
					color: 3447003,
					fields: [{
						name: "Personnage",
						value: `**r!prenom Jean-Michel Delamarre** Pour définir le prénom et le nom (champ facultatif) si vous en avez un, de votre personnage\n **r!sexe M/F/X** pour définir si votre perso est un homme, une femme, ou autre
					\n**r!age 12** pour définir votre age (attention seul les nombres sont acceptés)\n**r!pdm 5** pour définir vos points de magies\n**r!affinite nomdelaffinite** pour définir votre vent de magie
					\n**r!folies cleptomane** Défini votre folie en tant que cleptomane.
					\n**r!jobs Nom de ma carrière** pour définir votre derrière\n**!ambition nom de mon ambition** Pour définir votre ambition.\n**r!langues Anglais LV2 - Elf bilingue**`
					},
					{
						name: "Caractéristiques",
						value: `**r!pdc +200** Pour rajouter des points de célébrités. Le niveau monte automatiquement.
					\n**r!pdvmax -2** pour diminuer votre maximum de points de vies\n**!pv +2/-5** pour changer votre nombre de pdv attention vous ne pouvez pas avoir plus de vies que votre maximum.
					\n**r!armormax +2/-1** pour changer votre maximum de points d'armures\n**!armor +2/-5** pour changer votre nombre de points d'armures.
					\n**r!pdd +2/-1** pour modifier votre nombre de points de destin.\n**!pdf +2/-1** pour modifier votre nombre de points de folies.`
					},
					{
						name: "Armes",
						value: `**r!arme_gauche Nom de l'arme de votre main gauche**\n**r!degats_gauche 1D3+2** pour définir les dégats de votre arme à la main gauche.
					\n**r!arme_droite Nom de l'arme de votre main droite**\n**r!degats_droite 1D3** pour définir les dégats de votre arme à la main droite.
					\n**r!arme_bonus Nom de l'arme supplémentaire**\n**r!degats_bonus 1D3** pour définir les dégats de votre arme supplémentaire.`
					},
					{
						name: "Flouzzz",
						value: `**r!argent** permet de voir combien vous avez\n**r!argent +40 -30 20** Vous donne 40 pièces d'or, vous enlève 30 pistoles d'argent et rajoute 20 sous de cuivre.
					\n**r!argent_groupe** permet de voir l'argent amassé par le groupe`
					},
					{
						name: "Divers",
						value: `**r!fiche** permet de consulter votre fiche de perso mise à jour\n**!munitions 28 carreaux d'arbalète**\n**r!decoctions 3 fioles de poison de fée**\n**r!bio Ceci est mon histoire**r\n**!factions Empire - Empereur**`
					}
					]
				}
			});
			break;

		case "changer_fiche":
			if (args.length == 1) {
				//db.prepare('UPDATE roliste SET id_fiche_choisie = ? WHERE id_roliste = ?').run(args[0],message.author.id);
				if (message.author.id == config.admin) {
					db.prepare('UPDATE roliste SET id_fiche_choisie = ? WHERE id_roliste =?').run(args[0], config.admin);
				}
			}
			break;

		case "fiche":
			destinationPDF = `./fiches/${ficheActuelle.prenom}.pdf`;
			var data = {
				'nom': ficheActuelle.nom,
				'prenom': ficheActuelle.prenom,
				'sexe': ficheActuelle.sexe,
				'age': ficheActuelle.age,
				'race': ficheActuelle.race,
				'pdm': ficheActuelle.pdm,
				'ambition': ficheActuelle.ambition,
				'affinite': ficheActuelle.affinite,
				'job': ficheActuelle.jobs,
				'langues': ficheActuelle.langues,
				'folies': ficheActuelle.folies,
				'niveau': ficheActuelle.niveau,
				'pdc': ficheActuelle.pdc,
				'vie': ficheActuelle.vie,
				'viemax': ficheActuelle.vieMax,
				'armuremax': ficheActuelle.armureMax,
				'armure': ficheActuelle.armure,
				'pdd': ficheActuelle.pdd,
				'pdf': ficheActuelle.pdf,
				'force': ficheActuelle.force,
				'agilite': ficheActuelle.agilite,
				'intelligence': ficheActuelle.intelligence,
				'charisme': ficheActuelle.charisme,
				'endurance': ficheActuelle.endurance,
				'competences': ficheActuelle.competences,
				'sorts': ficheActuelle.sorts,
				'nomgauche': ficheActuelle.arme_gauche,
				'typegauche': ficheActuelle.type_gauche,
				'lancegauche': ficheActuelle.lance_gauche,
				'degatsgauche': ficheActuelle.degats_gauche,
				'notesgauche': ficheActuelle.notes_gauche,
				'nomdroite': ficheActuelle.arme_droite,
				'typedroite': ficheActuelle.type_droite,
				'lancedroite': ficheActuelle.lance_droite,
				'degatsdroite': ficheActuelle.degats_droite,
				'notesdroite': ficheActuelle.notes_droite,
				'nombonus': ficheActuelle.arme_bonus,
				'typebonus': ficheActuelle.type_bonus,
				'lancebonus': ficheActuelle.lance_bonus,
				'degatsbonus': ficheActuelle.degats_bonus,
				'notesbonus': ficheActuelle.notes_bonus,
				'nombouclier': ficheActuelle.nom_bouclier,
				'protection': ficheActuelle.protection,
				'notesbouclier': ficheActuelle.notes_bouclier,
				'armures': ficheActuelle.armures,
				'munitions': ficheActuelle.munitions,
				'decoctions': ficheActuelle.decoctions,
				'gold': ficheActuelle.gold,
				'argent': ficheActuelle.argent,
				'cuivre': ficheActuelle.cuivre,
				'bijoux': ficheActuelle.bijoux,
				'torches': ficheActuelle.torches,
				'divers': ficheActuelle.divers,
				'histoire': ficheActuelle.bio,
				'factions': ficheActuelle.factions
			};
			pdfFiller.fillFormWithFlatten(config.sourcePDF, destinationPDF, data, shouldFlatten, function (err) {
				if (err) throw err;
				message.author.send("Voici ta fiche de perso.", { files: [destinationPDF] });
			});
			break;

		case "fiches":
			if (message.author.id !== config.admin) {
				var fiches = db.prepare('SELECT id_fiche, prenom FROM fiche WHERE fk_id_roliste = ?').get(message.author.id);
				var idFiches = fiches.id_fiche;
				var idUsers = fiches.id_user;
				message.channel.send(`Id fiche: ${fiches.id_fiche}\nPerso: ${fiches.prenom}`);
			} else {
				var fiches = db.prepare('SELECT id_fiche, prenom FROM fiche').all();
				var idFiches = fiches.id_fiche;
				var idFiches = idFiches.join('\n')
				var idUsers = fiches.id_user;
				var idUsers = idUsers.join('\n')
				message.channel.send(`Id fiche: ${idFiches} Perso: ${idUsers}`);
			}
			break;

		case "prenom":
			if (typeof args[0] == 'undefined') return message.reply("merci de saisir un champ.");
			if (args.length == 1) {
				db.prepare('update fiche set prenom = ? where id_fiche =?').run(args[0], ficheActuelle.id_fiche);
			} else if (args.length == 2) {
				db.prepare('update fiche set prenom = ?, nom= ? where id_fiche =?').run(args[0], args[1], ficheActuelle.id_fiche);
			}
			message.reply("votre prénom est " + msg)
			break;

		case "sexe":
			if (typeof args[0] == 'undefined') return message.reply("merci de saisir un champ.");
			if (args[0] == 'M') {
				db.prepare('update fiche set sexe = ? where id_fiche =?').run('Homme', ficheActuelle.id_fiche);
				message.reply('Vous êtes désormais un homme.');
			} else if (args[0] == 'F') {
				db.prepare('update fiche set sexe = ? where id_fiche =?').run('Femme', ficheActuelle.id_fiche);
				message.reply("Vous êtes désormais une femme.")
			} else if (args[0] == 'X') {
				db.prepare('update fiche set sexe = ? where id_fiche =?').run('Non Binaire', ficheActuelle.id_fiche);
				message.reply("Vous êtes désormais non binaire.");
			} else {
				return message.reply("Merci d'écrire M pour homme, F pour femme X pour autre.");
			}
			break;

		case "age":
			if (typeof args[0] == 'undefined') return message.reply("Merci de saisir un champ.");
			if (Number.isInteger(parseInt(args[0])) == false) {
				return message.reply("Merci de saisir un nombre pour l'âge.");
			} else {
				var age = parseInt(args[0], 10);
				db.prepare('update fiche set age = ? where id_fiche =?').run(age, ficheActuelle.id_fiche);
				message.reply("vous avez désormais " + age + " ans.");
			}
			break;

		case "pdd":
		case "pdm":
			if (args.length == 0) {
				message.reply(`vous avez ${fiche[command]} points.`);
			} else if (args.length == 1) {
				var pdm = parseInt(args[0], 10);
				var pdm = parseInt(fiche[command] + pdm);
				db.prepare('update fiche set pdm = ? where id_fiche =?').run(pdm, ficheActuelle.id_fiche);
				message.reply('vous avez désormais ' + pdm + ' points.');
			} else if ((args.length == 2) && message.author.id == config.admin) {
				var pdm = parseInt(args[0], 10);
				pdm = parseInt(fiche.pdm + pdm);
				db.prepare('update fiche set pdm = ? where id_fiche =?').run(pdm, args[1]);
			}
			break;

		case "race":
		case "ambition":
		case "affinite":
		case "jobs":
		case "bijoux":
		case "armures":
		case "munitions":
		case "decoctions":
		case "torches":
		case "divers":
		case "bio":
		case "factions":
		case "langues":
		case "competences":
		case "sorts":
		case "arme_gauche":
		case "type_gauche":
		case "notes_gauche":
		case "arme_droite":
		case "type_droite":
		case "notes_droite":
		case "arme_bonus":
		case "type_bonus":
		case "notes_bonus":
		case "folies":
		case "nom_epaulette":
		case "nom_plastron":
		case "nom_casque":
		case "nom_bottes":
			if (typeof msg == 'undefined') return message.reply("Merci de saisir un champ.");
			if (message.author.id != config.admin) {
				db.prepare(`update fiche set ${command} = ? where id_fiche =?`).run(msg, ficheActuelle.id_fiche);
				message.reply(`votre ${command} a été mis à jour.`);
			} else {
				msg = msg.substr(args[0].length);
				db.prepare(`update fiche set ${command} = ? where id_fiche =?`).run(msg, args[0]);
				message.reply(`la ${command} du joueur a été mis à jour.`);
			}
			break;

		case "pdc":
			if (args.length == 0) {
				message.reply('vous avez ' + fiche.pdc + ' points de célébrités.');
			} else if (args.length == 1) {
				var pdc = parseInt(args[0], 10);
				var pdc = parseInt(fiche.pdc + pdc);
				if (pdc => 1000) {
					pdc = pdc - 1000;
					niveau = parseInt(fiche.niveau + 1);
					db.prepare('update fiche set niveau = ? where id_fiche =?').run(niveau, ficheActuelle.id_fiche);
				}
				db.prepare('update fiche set pdc = ? where id_fiche =?').run(pdc, ficheActuelle.id_fiche);
				message.reply('vous avez désormais ' + pdc + ' points de célébrités.');
			} else if ((args.length == 2) && message.author.id == config.admin) {
				var ficheJoueur = parseInt(args[0], 10);
				var pdc = parseInt(args[0], 10);
				pdc = parseInt(fiche.pdc + pdc);
				db.prepare('update fiche set pdc = ? where id_fiche =?').run(pdc, ficheJoueur);
			}
			break;

		case "pdv":
			if (args.length == 0) {
				message.reply(`vous avez ${fiche.vie} points de vies.`);
			} else if (args.length == 1) {
				var life = parseInt(args[0], 10);
				life = parseInt(fiche.vie + life);
				if (life > fiche.vieMax) return message.reply('Vous ne pouvez pas avoir plus de vies que votre maximum.');
				db.prepare('update fiche set vie = ? where id_fiche =?').run(life, ficheActuelle.id_fiche);
				message.reply('vous avez désormais ' + life + ' points de vies.');
			} else if ((args.length == 2) && message.author.id == config.admin) {
				var ficheJoueur = parseInt(args[0], 10);
				var life = parseInt(fiche.vieMax + args[1], 10);
				db.prepare('update fiche set vie = ? where id_fiche =?').run(life, ficheJoueur);
			}
			break;

		case "pdvmax":
			if (args.length == 0) {
				message.reply(`vous avez ${fiche.vieMax} points de vies max.`);
			} else if (args.length == 1) {
				var life = parseInt(args[0], 10);
				life = parseInt(fiche.vieMax + life);
				if (life > fiche.vieMax) return message.reply('désolé mais le maximum de points de vies dans warhammer, il augmente pas, il descend...');
				db.prepare('update fiche set vieMax = ? where id_fiche =?').run(life, ficheActuelle.id_fiche);
				message.reply('vous avez désormais ' + life + ' points de vies max.');
			} else if ((args.length == 2) && message.author.id == config.admin) {
				var ficheJoueur = parseInt(args[0], 10);
				var life = parseInt(fiche.vieMax + args[1], 10);
				db.prepare('update fiche set vieMax = ? where id_fiche =?').run(life, ficheJoueur);
			}
			break;

		case "pdf":
			if (args.length == 0) {
				message.reply(`vous avez ${fiche.pdf} points de folies.`);
			} else if (args.length == 1) {
				var life = parseInt(args[0], 10);
				life = parseInt(fiche.pdf + life);
				if (life > 6) {
					life = life - 6;
					message.reply("félicitation, vous venez de débloquer une nouvelle folie!");
					bot.get(config.admin).send(fiche.prenom + "Vient de débloquer une nouvelle folie, n'est ce pas merveilleux?");
				}
				db.prepare('update fiche set pdf = ? where id_fiche =?').run(life, ficheActuelle.id_fiche);
				message.reply('vous avez désormais ' + life + ' points de folies.');
			} else if ((args.length == 2) && message.author.id == config.admin) {
				var ficheJoueur = parseInt(args[0], 10);
				var life = parseInt(fiche.pdf + args[1], 10);
				if (life > 6) {
					life = life - 6;
					message.reply("Il vient de débloquer une folie, n'est-ce-pas merveilleux?");
				}
				db.prepare('update fiche set pdf = ? where id_fiche =?').run(life, ficheJoueur);
			}
			break;

		case "force":
		case "agilite":
		case "endurance":
		case "intelligence":
		case "charisme":
			var commandeCaract = 'fiche.' + command;
			if (args.length == 0) {
				message.reply(`vous avez ${fiche[commandeCaract]} points de ${command}.`);
			} else if (args.length == 1) {
				var life = parseInt(fiche[commandeCaract] + args[0], 10);
				db.prepare(`update fiche set ${command} = ? where id_fiche =?`).run(life, ficheActuelle.id_fiche);
				message.reply(`vous avez désormais ${life} points de ${command}.`);
			} else if ((args.length == 2) && message.author.id == config.admin) {
				var ficheJoueur = parseInt(args[0], 10);
				var life = parseInt(fiche[commandeCaract] + args[1], 10);
				db.prepare(`update fiche set ${command} = ? where id_fiche =?`).run(life, ficheJoueur);
			}
			break;
		//https://stackoverflow.com/questions/4244896/dynamically-access-object-property-using-variable
		case "degats_droite":
		case "degats_gauche":
		case "degats_bonus":
			if (args.length == 0) return message.reply("merci de saisir vos dégats.");
			var regex = /(^[0-9]*)([D])([0-9+0-9]*$)/g;
			if (regex.test(args[0]) == false) return message.reply("merci de saisir vos dégats au format 1D8+3 ou 2D4 par exemple.");
			var match = regex.exec(args[0]);
			var typeDeDegats = command.replace('degats_', '');
			if (args.length == 1) {
				db.prepare(`UPDATE fiche SET ${command} = ?, lance_${typeDeDegats} = ? where id_fiche =?`).run(match[1], match[3], ficheJoueur);
				message.reply(`modif des dégats prise en compte.`);
			} else if (args.length == 2 && message.author.id == config.admin) {
				db.prepare(`UPDATE fiche SET ${command} = ?, lance_${typeDeDegats} = ? where id_fiche =?`).run(match[1], match[3], args[2]);
			}
			break;

		case "dmg_heaume":
		case "dmg_plastron":
		case "dmg_bottes":
		case "dmg_epaulettes":
			if (args.length == 0) return message.reply("merci de saisir vos dégats.");
			var typeArmure = command.replace('dmg_', '');
			var degats = parseInt(args[0], 10) - fiche[typeArmure];
			if (degats <= fiche[typeArmure]) return message.reply("vous n'avez pas subi de dégats, l'armure ayant tout encaissé");
			var newVie = fiche[vie] - degats;
			if (args.length == 1) {
				db.prepare(`UPDATE fiche SET vie = ? where id_fiche =?`).run(newVie, ficheJoueur);
				message.reply('Vous avez désormais ' + newVie + ' de vies.');
			}
			if (args.length == 2) {
				db.prepare(`UPDATE fiche SET vie = ? where id_fiche =?`).run(args[2], ficheJoueur);
			}
			break;

		case "argent":
			if (args.length == 0) {
				message.reply(`vous avez ${ficheActuelle.gold} couronnes d'or, ${ficheActuelle.argent} pistoles d'argent et ${ficheActuelle.cuivre} sous de cuivre`)
			} else if (args.length == 2) {
				let gold = parseInt(args[0], 10);
				let argent = parseInt(args[1], 10);
				let cuivre = parseInt(args[2], 10);
				db.prepare('UPDATE fiche SET gold = ?, argent = ?, cuivre = ? where id_fiche =?').run(gold, argent, cuivre, ficheJoueur);
				message.reply(`vous avez désormais ${ficheActuelle.gold} couronnes d'or, ${ficheActuelle.argent} pistoles d'argent et ${ficheActuelle.cuivre} sous de cuivre`)
			} else if (args.length == 3 && message.author.id == config.admin) {
				db.prepare('UPDATE fiche SET gold = ?, argent = ?, cuivre = ? where id_fiche IN (?)').run(args[0], args[1], args[2], args[3]);
			}
			break;

		case "argent_groupe":
			var ArgentGroupe = db.prepare("SELECT SUM(gold) as gold,SUM(argent) as argent,SUM(cuivre) as cuivre FROM fiche WHERE fk_id_fiche_choisie!=0;").get();
			message.reply(`Le groupe a au total ${ArgentGroupe.gold} couronnes d'or, ${ArgentGroupe.argent} pistoles d'argent et ${ArgentGroupe.cuivre} sous de cuivre`)
			break;

		default:
			return message.reply('je ne connais pas cette commande, vous pouvez faire r!aide pour voir la liste.')
	}

});

bot.login(config.token);
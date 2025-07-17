-- Seeds consolidées pour Débats.co
-- Basées sur les données des 3 projets legacy (ruby-backend, api, debats-elixir)

-- Insertion des sujets
INSERT INTO subjects (title, slug, presentation, problem, picture_url) VALUES
(
  'L''euthanasie',
  'euthanasie',
  'L''euthanasie désigne l''acte médical consistant à provoquer intentionnellement la mort d''un patient atteint d''une maladie incurable qui lui inflige des souffrances morales et/ou physiques intolérables. Cette pratique soulève des questions éthiques, médicales, juridiques et religieuses majeures dans nos sociétés.',
  'Faut-il légaliser l''euthanasie en France ? Selon quelles modalités et dans quelles conditions ? Comment concilier le respect de la vie humaine, l''autonomie du patient, le rôle du médecin et la protection des personnes vulnérables ?',
  'https://example.com/euthanasie.jpg'
),
(
  'L''enseignement de l''Histoire de France',
  'enseignement-histoire-france',
  'L''enseignement de l''histoire de France à l''école fait régulièrement débat. Entre approche chronologique traditionnelle et approches thématiques modernes, entre récit national et histoire critique, les méthodes pédagogiques et les contenus divisent.',
  'Comment enseigner l''histoire de France à l''école ? Faut-il privilégier l''ordre chronologique ou les approches thématiques ? Quel équilibre entre fierté nationale et regard critique ?',
  'https://example.com/histoire-france.jpg'
);

-- Insertion des personnalités publiques
INSERT INTO public_figures (name, slug, presentation, wikipedia_url, website_url, picture_url) VALUES
(
  'François Hollande',
  'francois-hollande',
  'Homme politique français, président de la République française de 2012 à 2017. Membre du Parti socialiste.',
  'https://fr.wikipedia.org/wiki/François_Hollande',
  'https://www.parti-socialiste.fr',
  'https://example.com/hollande.jpg'
),
(
  'Manuel Valls',
  'manuel-valls',
  'Homme politique franco-espagnol, Premier ministre français de 2014 à 2016 sous la présidence de François Hollande.',
  'https://fr.wikipedia.org/wiki/Manuel_Valls',
  'https://manuelvalls.fr',
  'https://example.com/valls.jpg'
),
(
  'Axel Kahn',
  'axel-kahn',
  'Médecin généticien, essayiste et dirigeant français. Président de la Ligue nationale contre le cancer. Expert reconnu en bioéthique.',
  'https://fr.wikipedia.org/wiki/Axel_Kahn',
  NULL,
  'https://example.com/kahn.jpg'
),
(
  'Marisol Touraine',
  'marisol-touraine',
  'Femme politique française, ministre des Affaires sociales et de la Santé de 2012 à 2017 sous François Hollande.',
  'https://fr.wikipedia.org/wiki/Marisol_Touraine',
  NULL,
  'https://example.com/touraine.jpg'
),
(
  'Ségolène Royal',
  'segolene-royal',
  'Femme politique française, candidate à l''élection présidentielle de 2007, ministre de l''Environnement de 2014 à 2017.',
  'https://fr.wikipedia.org/wiki/Ségolène_Royal',
  'https://segolene-royal.com',
  'https://example.com/royal.jpg'
),
(
  'Nicolas Sarkozy',
  'nicolas-sarkozy',
  'Homme politique français, président de la République française de 2007 à 2012. Président des Républicains.',
  'https://fr.wikipedia.org/wiki/Nicolas_Sarkozy',
  'https://www.republicains.fr',
  'https://example.com/sarkozy.jpg'
),
(
  'Marine Le Pen',
  'marine-le-pen',
  'Femme politique française, présidente du Rassemblement national depuis 2011. Candidate à l''élection présidentielle en 2012, 2017 et 2022.',
  'https://fr.wikipedia.org/wiki/Marine_Le_Pen',
  'https://rassemblementnational.fr',
  'https://example.com/lepen.jpg'
),
(
  'Frédéric Lordon',
  'frederic-lordon',
  'Économiste, philosophe et essayiste français. Directeur de recherche au CNRS. Critique du néolibéralisme.',
  'https://fr.wikipedia.org/wiki/Frédéric_Lordon',
  'https://blog.mondediplo.net/2008-07-15-Frederic-Lordon',
  'https://example.com/lordon.jpg'
);

-- Récupération des IDs des sujets pour les relations
DO $$
DECLARE
    euthanasie_id UUID;
    histoire_id UUID;
    hollande_id UUID;
    valls_id UUID;
    kahn_id UUID;
    touraine_id UUID;
    royal_id UUID;
    sarkozy_id UUID;
    lepen_id UUID;
    lordon_id UUID;
    pos1_id UUID;
    pos2_id UUID;
    pos3_id UUID;
    pos4_id UUID;
    pos5_id UUID;
    pos6_id UUID;
BEGIN
    -- Récupération des IDs
    SELECT id INTO euthanasie_id FROM subjects WHERE slug = 'euthanasie';
    SELECT id INTO histoire_id FROM subjects WHERE slug = 'enseignement-histoire-france';
    
    SELECT id INTO hollande_id FROM public_figures WHERE slug = 'francois-hollande';
    SELECT id INTO valls_id FROM public_figures WHERE slug = 'manuel-valls';
    SELECT id INTO kahn_id FROM public_figures WHERE slug = 'axel-kahn';
    SELECT id INTO touraine_id FROM public_figures WHERE slug = 'marisol-touraine';
    SELECT id INTO royal_id FROM public_figures WHERE slug = 'segolene-royal';
    SELECT id INTO sarkozy_id FROM public_figures WHERE slug = 'nicolas-sarkozy';
    SELECT id INTO lepen_id FROM public_figures WHERE slug = 'marine-le-pen';
    SELECT id INTO lordon_id FROM public_figures WHERE slug = 'frederic-lordon';

    -- Insertion des positions pour l'euthanasie
    INSERT INTO positions (title, description, subject_id) VALUES
    (
        'Euthanasie active',
        'Légalisation de l''euthanasie active : un médecin administre directement une injection létale pour abréger les souffrances d''un patient en fin de vie, sur demande explicite et réitérée.',
        euthanasie_id
    ),
    (
        'Suicide assisté',
        'Légalisation du suicide assisté : le patient effectue lui-même l''acte létal avec l''aide d''un médecin qui fournit les moyens. Modèle appliqué en Suisse et en Belgique.',
        euthanasie_id
    ),
    (
        'Droit nouveau',
        'Création d''un nouveau droit incluant la sédation profonde et continue jusqu''au décès, avec des directives anticipées contraignantes pour le corps médical.',
        euthanasie_id
    ),
    (
        'Application loi Leonetti',
        'Application renforcée de la loi Leonetti existante : directives anticipées, personne de confiance, soins palliatifs, sans légaliser l''euthanasie active.',
        euthanasie_id
    ),
    (
        'Mort naturelle complète',
        'Refus de toute intervention médicale visant à abréger la vie. Accompagnement palliatif uniquement, respect absolu du processus naturel de la mort.',
        euthanasie_id
    ),
    (
        'Ordre chronologique',
        'Enseigner l''histoire de France selon un ordre chronologique strict, du plus ancien au plus récent, pour donner aux élèves une vision linéaire et structurée du récit national.',
        histoire_id
    );

    -- Récupération des IDs des positions
    SELECT id INTO pos1_id FROM positions WHERE title = 'Euthanasie active';
    SELECT id INTO pos2_id FROM positions WHERE title = 'Suicide assisté';
    SELECT id INTO pos3_id FROM positions WHERE title = 'Droit nouveau';
    SELECT id INTO pos4_id FROM positions WHERE title = 'Application loi Leonetti';
    SELECT id INTO pos5_id FROM positions WHERE title = 'Mort naturelle complète';
    SELECT id INTO pos6_id FROM positions WHERE title = 'Ordre chronologique';

    -- Insertion des prises de position (statements)
    INSERT INTO statements (position_id, public_figure_id, taken_at) VALUES
    -- Euthanasie
    (pos5_id, kahn_id, '2015-01-15'),    -- Axel Kahn -> Mort naturelle
    (pos3_id, valls_id, '2015-03-20'),   -- Valls -> Droit nouveau
    (pos3_id, royal_id, '2015-04-10'),   -- Royal -> Droit nouveau
    (pos3_id, hollande_id, '2015-05-12'), -- Hollande -> Droit nouveau
    (pos4_id, touraine_id, '2015-06-08'), -- Touraine -> Loi Leonetti
    (pos1_id, sarkozy_id, '2015-02-28'),  -- Sarkozy -> Euthanasie active
    (pos2_id, lepen_id, '2015-07-14'),    -- Le Pen -> Suicide assisté
    
    -- Histoire de France  
    (pos6_id, sarkozy_id, '2016-09-15'),  -- Sarkozy -> Ordre chronologique
    (pos6_id, lepen_id, '2016-10-20');    -- Le Pen -> Ordre chronologique

    -- Insertion d'exemples d'evidences (preuves)
    INSERT INTO evidences (source_name, source_url, quote, statement_id, fact_date) VALUES
    (
        'Le Figaro Sciences',
        'https://www.lefigaro.fr/sciences/2015/01/15/01008-20150115ARTFIG00123-axel-kahn-refuse-euthanasie.php',
        'Je refuse l''euthanasie active car elle contredit la mission première du médecin qui est de soigner et d''accompagner.',
        (SELECT id FROM statements WHERE public_figure_id = kahn_id AND position_id = pos5_id),
        '2015-01-15'
    ),
    (
        'Assemblée Nationale',
        'https://www.assemblee-nationale.fr/14/cri/2015-2016/20160123.asp',
        'Nous devons créer de nouveaux droits pour les patients en fin de vie, incluant la sédation profonde et continue.',
        (SELECT id FROM statements WHERE public_figure_id = valls_id AND position_id = pos3_id),
        '2015-03-20'
    ),
    (
        'Sénat',
        'https://www.senat.fr/leg/ppl14-548.html',
        'Cette proposition de loi renforce les directives anticipées et améliore l''accès aux soins palliatifs.',
        (SELECT id FROM statements WHERE public_figure_id = touraine_id AND position_id = pos4_id),
        '2015-06-08'
    );

    -- Insertion d'exemples d'arguments
    INSERT INTO arguments (title, description, subject_id) VALUES
    (
        'Argument médical pour l''euthanasie',
        'L''euthanasie permet d''éviter des souffrances inutiles dans les cas où la médecine palliative atteint ses limites. Elle respecte l''autonomie du patient et sa dignité.',
        euthanasie_id
    ),
    (
        'Risque de dérive et protection des vulnérables',
        'La légalisation de l''euthanasie risque de créer une pression sociale sur les personnes âgées, handicapées ou malades, qui pourraient se sentir obligées de "choisir" la mort pour ne pas être un fardeau.',
        euthanasie_id
    ),
    (
        'Importance de la chronologie en histoire',
        'L''enseignement chronologique permet aux élèves de comprendre les liens de causalité entre les événements historiques et de construire une vision cohérente du temps historique.',
        histoire_id
    );

END $$;
User.create!(name:  "Jalil Arfaoui",
             email: "jalil@arfaoui.net",
             password:              "usbeck78",
             password_confirmation: "usbeck78",
             reputation: 1000,
             activated: true,
             activated_at: Time.zone.now)

hollande    = PublicFigure.create!(name: "François Hollande", presentation: "Notre cher président")
marisol     = PublicFigure.create!(name: "Marisol Touraine", presentation: "Toute reine")
segolene    = PublicFigure.create!(name: "Ségolène Royal", presentation: "Ségo")
valls       = PublicFigure.create!(name: "Manuel Valls", presentation: "Notre cher premier ministre")
kahn        = PublicFigure.create!(name: "Axel Kahn", presentation: "Yes we Kahn")
mec         = PublicFigure.create!(name: "Un mec", presentation: "Comme un autre")
autre       = PublicFigure.create!(name: "Un autre mec", presentation: "Pareil, mais différent")
toto        = PublicFigure.create!(name: "Toto", presentation: "0+0")

euthanasie  = Subject.create!(title: "L'euthanasie", problem: "toto", presentation: "L'euthanasie ne se définit pas par son moyen, puisqu'il peut y avoir euthanasie par une action directe telle qu'une injection létale ou simplement par omission de certains gestes relevant des soins fondamentaux, comme l'alimentation artificielle. Ce qui caractérise l'euthanasie est l'intentionnalité : provoquer le décès d'un individu, avec des circonstances précises : maladie sans espoir de guérison et souffrances intolérables.")
histoire_de_france = Subject.create!(title: "L'enseignement de l'Histoire de France", problem: "toto", presentation: "Depuis les années 1970, et comme pour toutes les nations, la vision nationaliste de l'histoire est remise en cause par de nombreux historiens et qualifiée de roman national (Pierre Nora), mythe national (Suzanne Citron), mythologie nationale (Roger Garaudy). Selon les historiens qui ont étudié la construction des histoires nationales le choix d'y inclure ou d'en exclure des personnages, des peuples et des événements ainsi que le point de vue selon lequel ils sont présentés est systématiquement biaisé (voire déformé) vers la légitimité de tout ce qui va dans le sens de l'éternité de la Nation dans ses limites au moins actuelles et l'illégitimité ou l'inexistence de tout ce qui la mettrait en cause.")

pour              = euthanasie.positions.build(title: "Euthanasie", description: "La décision d'abréger les souffrances d'un patient atteint d'une maladie incurable est non seulement prise par le corps médical mais également exécutée par lui.")
suicide_assiste   = euthanasie.positions.build(title: "Suicide assisté", description: "C’est le patient lui-même qui effectue l'acte provoquant la mort, comme en Suisse, en Belgique ou aux Pays-Bas.")
droit_nouveau     = euthanasie.positions.build(title: "Droit nouveau", description: "Droit à une sédation « profonde et continue » en phase terminale et que les directives anticipées, jusqu’ici simplement indicatives, s’imposent sous certaines conditions aux médecins.")
leonetti          = euthanasie.positions.build(title: "Application effective de la loi Leonetti", description: "Directives anticipées, personne de confiance, prise de décision collégiale")
mort_naturelle    = euthanasie.positions.build(title: "Mort naturelle complète", description: "Aucune intervention du corps médical ou d’un tiers.")

kahn_mort_naturelle = mort_naturelle.statements.build(  public_figure: kahn)
preuve = kahn_mort_naturelle.evidences.build(fact_date: 5.days.ago, title: "TF1 20h", url: "http://www.tf1.fr")
puts mort_naturelle
puts mort_naturelle.statements
puts mort_naturelle.statements.first
puts kahn_mort_naturelle
puts kahn_mort_naturelle.valid?
puts mort_naturelle.valid?
puts mort_naturelle.errors
puts mort_naturelle.errors.first
puts mort_naturelle.errors.to_s
mort_naturelle.save!
kahn_mort_naturelle.save!
preuve.save

mec_pour = pour.statements.build public_figure: mec
preuve = mec_pour.evidences.build(fact_date: 5.days.ago, title: "TF1 20h", url: "http://www.tf1.fr")
pour.save
mec_pour.save
preuve.save

autre_suicide_assiste = suicide_assiste.statements.build( public_figure: autre)
preuve = autre_suicide_assiste.evidences.build(fact_date: 5.days.ago, title: "TF1 20h", url: "http://www.tf1.fr")
suicide_assiste.save
autre_suicide_assiste.save
preuve.save

valls_droit_nouveau = droit_nouveau.statements.build(   public_figure: valls)
preuve = valls_droit_nouveau.evidences.build(fact_date: 5.days.ago, title: "TF1 20h", url: "http://www.tf1.fr")
droit_nouveau.save
valls_droit_nouveau.save
preuve.save

segolene_droit_nouveau = droit_nouveau.statements.build(   public_figure: segolene)
preuve = segolene_droit_nouveau.evidences.build(fact_date: 5.days.ago, title: "TF1 20h", url: "http://www.tf1.fr")
segolene_droit_nouveau.save
preuve.save

hollande_droit_nouveau = droit_nouveau.statements.build(   public_figure: hollande)
preuve = hollande_droit_nouveau.evidences.build(fact_date: 5.days.ago, title: "TF1 20h", url: "http://www.tf1.fr")
hollande_droit_nouveau.save
preuve.save

toto_leonetti = leonetti.statements.build(        public_figure: toto)
preuve = toto_leonetti.evidences.build(fact_date: 5.days.ago, title: "TF1 20h", url: "http://www.tf1.fr")
leonetti.save
toto_leonetti.save
preuve.save

ordre_thematique = histoire_de_france.positions.build(title: "Ordre thématique", description: "Par thème")
ordre_chronologique = histoire_de_france.positions.build(title: "Ordre chronologique", description: "Dans l'ordre des évènements")

hollande_ordre_thematique = ordre_thematique.statements.build public_figure: hollande
preuve = hollande_ordre_thematique.evidences.build fact_date: 5.days.ago, title: "TF1 20h", url: "http://www.tf1.fr"
ordre_thematique.save
hollande_ordre_thematique.save
preuve.save

kahn_ordre_chronologique = ordre_chronologique.statements.build public_figure: kahn
preuve = kahn_ordre_chronologique.evidences.build fact_date: 5.days.ago, title: "TF1 20h", url: "http://www.tf1.fr"
ordre_chronologique.save
kahn_ordre_chronologique.save
preuve.save


#10.times do |n|
#  name  = Faker::Name.name
#  email = "example-#{n+1}@railstutorial.org"
#  password = "password"
#  User.create!(name:  name,
#               email: email,
#               password:              password,
#               password_confirmation: password,
#               activated: true,
#               activated_at: Time.zone.now)
#end

#10.times do |n|
#  subject = Faker::Lorem.sentence(3, true, 5)
#  presentation = Faker::Lorem.sentences(5, true).join " "
#  Subject.create!(title: subject, presentation: presentation)
#end


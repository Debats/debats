User.create!(name:  "Jalil Arfaoui",
             email: "jalil@arfaoui.net",
             password:              "usbeck78",
             password_confirmation: "usbeck78",
             reputation: 1000,
             activated: true,
             activated_at: Time.zone.now)

hollande    = PublicFigure.create!(name: "François Hollande")
marisol     = PublicFigure.create!(name: "Marisol Touraine")
segolene    = PublicFigure.create!(name: "Ségolène Royal")
valls       = PublicFigure.create!(name: "Manuel Valls")
kahn        = PublicFigure.create!(name: "Axel Kahn")
mec         = PublicFigure.create!(name: "Un mec")
autre       = PublicFigure.create!(name: "Un autre mec")
toto        = PublicFigure.create!(name: "Toto")

euthanasie  = Subject.create!(title: "L'euthanasie", presentation: "L'euthanasie ne se définit pas par son moyen, puisqu'il peut y avoir euthanasie par une action directe telle qu'une injection létale ou simplement par omission de certains gestes relevant des soins fondamentaux, comme l'alimentation artificielle. Ce qui caractérise l'euthanasie est l'intentionnalité : provoquer le décès d'un individu, avec des circonstances précises : maladie sans espoir de guérison et souffrances intolérables.")

pour              = euthanasie.positions.create!(title: "Euthanasie", description: "La décision d'abréger les souffrances d'un patient atteint d'une maladie incurable est non seulement prise par le corps médical mais également exécutée par lui.")
suicide_assiste   = euthanasie.positions.create!(title: "Suicide assisté", description: "C’est le patient lui-même qui effectue l'acte provoquant la mort, comme en Suisse, en Belgique ou aux Pays-Bas.")
droit_nouveau     = euthanasie.positions.create!(title: "Droit nouveau", description: "Droit à une sédation « profonde et continue » en phase terminale et que les directives anticipées, jusqu’ici simplement indicatives, s’imposent sous certaines conditions aux médecins.")
leonetti          = euthanasie.positions.create!(title: "Application effective de la loi Leonetti", description: "Directives anticipées, personne de confiance, prise de décision collégiale")
mort_naturelle    = euthanasie.positions.create!(title: "Mort naturelle complète", description: "Aucune intervention du corps médical ou d’un tiers.")


mort_naturelle.statements.create!(  subject_id: euthanasie.id,    public_figure_id: kahn.id,      taken_at: 5.days.ago)
pour.statements.create!(            subject_id: euthanasie.id,    public_figure_id: mec.id,       taken_at: 5.days.ago)
suicide_assiste.statements.create!( subject_id: euthanasie.id,    public_figure_id: autre.id,     taken_at: 5.days.ago)
droit_nouveau.statements.create!(   subject_id: euthanasie.id,    public_figure_id: valls.id,     taken_at: 5.days.ago)
droit_nouveau.statements.create!(   subject_id: euthanasie.id,    public_figure_id: segolene.id,  taken_at: 5.days.ago)
droit_nouveau.statements.create!(   subject_id: euthanasie.id,    public_figure_id: hollande.id,  taken_at: 5.days.ago)
leonetti.statements.create!(        subject_id: euthanasie.id,    public_figure_id: toto.id,      taken_at: 5.days.ago)

10.times do |n|
  name  = Faker::Name.name
  email = "example-#{n+1}@railstutorial.org"
  password = "password"
  User.create!(name:  name,
               email: email,
               password:              password,
               password_confirmation: password,
               activated: true,
               activated_at: Time.zone.now)
end

10.times do |n|
  subject = Faker::Lorem.sentence(3, true, 5)
  presentation = Faker::Lorem.sentences(5, true).join " "
  Subject.create!(title: subject, presentation: presentation)
end


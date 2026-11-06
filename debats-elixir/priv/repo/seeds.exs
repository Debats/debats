# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs

alias Debats.Repo
alias Debats.Accounts.User
alias Debats.Accounts.Credential
alias Debats.Subjects.{Subject, Position, Claim}
alias Debats.Actors.PublicFigure
alias Debats.Statements.Statement

Repo.delete_all(User)
Repo.delete_all(Statement)
Repo.delete_all(Position)
Repo.delete_all(Subject)

jalil =
  Repo.insert!(%User{
    name: "Jalil Arfaoui",
    email: "jalil@arfaoui.net"
  })

Repo.insert!(%Credential{
  user: jalil,
  password_hash: Argon2.hash_pwd_salt("debats")
})

euthanasie =
  Repo.insert!(%Subject{
    title: "L'euthanasie",
    description:
      "L'euthanasie ne se définit pas par son moyen, puisqu'il peut y avoir euthanasie par une action directe telle qu'une injection létale ou simplement par omission de certains gestes relevant des soins fondamentaux, comme l'alimentation artificielle. Ce qui caractérise l'euthanasie est l'intentionnalité : provoquer le décès d'un individu, avec des circonstances précises : maladie sans espoir de guérison et souffrances intolérables."
  })

pour =
  Repo.insert!(%Position{
    subject: euthanasie,
    title: "Euthanasie",
    description:
      "La décision d'abréger les souffrances d'un patient atteint d'une maladie incurable est non seulement prise par le corps médical mais également exécutée par lui."
  })

suicide_assiste =
  Repo.insert!(%Position{
    subject: euthanasie,
    title: "Suicide assisté",
    description:
      "C’est le patient lui-même qui effectue l'acte provoquant la mort, comme en Suisse, en Belgique ou aux Pays-Bas."
  })

droit_nouveau =
  Repo.insert!(%Position{
    subject: euthanasie,
    title: "Droit nouveau",
    description:
      "Droit à une sédation « profonde et continue » en phase terminale et que les directives anticipées, jusqu’ici simplement indicatives, s’imposent sous certaines conditions aux médecins."
  })

leonetti =
  Repo.insert!(%Position{
    subject: euthanasie,
    title: "Application effective de la loi Leonetti",
    description: "Directives anticipées, personne de confiance, prise de décision collégiale"
  })

mort_naturelle =
  Repo.insert!(%Position{
    subject: euthanasie,
    title: "Mort naturelle complète",
    description: "Aucune intervention du corps médical ou d’un tiers."
  })

histoire_de_france =
  Repo.insert!(%Subject{
    title: "L'enseignement de l'Histoire de France",
    description:
      "Depuis les années 1970, et comme pour toutes les nations, la vision nationaliste de l'histoire est remise en cause par de nombreux historiens et qualifiée de roman national (Pierre Nora), mythe national (Suzanne Citron), mythologie nationale (Roger Garaudy). Selon les historiens qui ont étudié la construction des histoires nationales le choix d'y inclure ou d'en exclure des personnages, des peuples et des événements ainsi que le point de vue selon lequel ils sont présentés est systématiquement biaisé (voire déformé) vers la légitimité de tout ce qui va dans le sens de l'éternité de la Nation dans ses limites au moins actuelles et l'illégitimité ou l'inexistence de tout ce qui la mettrait en cause."
  })

Repo.delete_all(PublicFigure)

hollande =
  Repo.insert!(%PublicFigure{
    name: "François Hollande",
    intro: "Notre cher président",
    wikipedia_url: "Hollande"
  })

marisol =
  Repo.insert!(%PublicFigure{
    name: "Marisol Touraine",
    intro: "Toute reine",
    wikipedia_url: "Marisol"
  })

segolene =
  Repo.insert!(%PublicFigure{name: "Ségolène Royal", intro: "Ségo", wikipedia_url: "Ségolène"})

valls =
  Repo.insert!(%PublicFigure{
    name: "Manuel Valls",
    intro: "Notre cher premier ministre",
    wikipedia_url: "Manuel Valls"
  })

kahn = Repo.insert!(%PublicFigure{name: "Axel Kahn", intro: "Yes we Kahn", wikipedia_url: "Kahn"})

Repo.insert!(%Statement{
  public_figure: kahn,
  subject: euthanasie,
  position: mort_naturelle,
  date: ~D[2019-02-23]
})

Repo.insert!(%Statement{
  public_figure: hollande,
  subject: euthanasie,
  position: pour,
  date: ~D[2013-11-12]
})

import { Metadata } from 'next'
import PageTitle from '../../components/ui/PageTitle'
import AccordionSection from '../../components/ui/AccordionSection'
import styles from './guide.module.css'

export const metadata: Metadata = {
  title: "Mode d'emploi",
  description:
    "Comment fonctionne Débats.co ? Guide d'utilisation de la plateforme collaborative de cartographie des positions publiques.",
}

export default function GuidePage() {
  return (
    <div className={styles.container}>
      <PageTitle>Mode d&apos;emploi</PageTitle>

      <AccordionSection title="Débats.co, qu'est-ce que c'est ?">
        <p>Débats.co n&apos;est pas un site de débats.</p>
        <p>
          Débats.co a pour objectif de référencer et cartographier les positions prises par des
          personnalités publiques au cours des débats qui font controverse en France. Ainsi, les
          contributeurs ne sont pas appelés à donner leur avis mais plutôt à rechercher, collecter
          et recenser les positions exprimées sur un sujet particulier.
        </p>
        <p>
          Nous invitons les contributeurs de Débats.co à lire ce mode d&apos;emploi et à s&apos;y
          référer en cas de doute lors de l&apos;utilisation du site.
        </p>
      </AccordionSection>

      <AccordionSection title="Comment fonctionne Débats.co ?">
        <p>
          Le premier usage de Débats.co consiste à consulter la plateforme, en explorant les
          différents sujets enregistrés et le positionnement des personnalités publiques au sein de
          ces sujets. Le deuxième usage consiste à contribuer à la plateforme en y apportant le
          contenu nécessaire pour une synthèse des différents sujets et prises de positions.
        </p>
        <p>
          Dans les deux cas, il est important de bien comprendre la structure du site. Sur
          Débats.co, l&apos;information est articulée autour de plusieurs éléments :
        </p>
        <ul>
          <li>Le sujet</li>
          <li>La position</li>
          <li>La personnalité</li>
          <li>La prise de position</li>
          <li>L&apos;argument</li>
          <li>La source</li>
        </ul>
        <p>
          Chaque <b>sujet</b> comporte au moins deux <b>positions</b>. Une <b>position</b> peut être
          &quot;prise&quot; par plusieurs <b>personnalités</b>. A chaque <b>prise de position</b>{' '}
          sont attachés une <b>personnalité</b> et un ensemble d&apos;<b>arguments</b>. Pour que la{' '}
          <b>prise de position</b> puisse être recensée, elle doit être justifiée par au moins une{' '}
          <b>source</b>.
        </p>
        <p>
          En somme, pour qu&apos;un <b>sujet</b> puisse être référencé, il est nécessaire d&apos;y
          recenser au moins une <b>prise de position</b> par au moins une <b>personnalité</b> dans
          chacune des <b>positions</b>.
        </p>
      </AccordionSection>

      <AccordionSection title="Qu'est-ce qu'une source ?">
        <p>
          Une <b>source</b> est un élément permettant d&apos;appuyer une prise de position. La
          source peut être constituée à partir de toute référence audio, vidéo, article, ou livre
          dont la diffusion est, ou a été, publique.
        </p>
        <p>
          Il sera demandé au contributeur de retranscrire la citation qui soutient le propos en
          question, la date à laquelle ce propos a été tenu, et, si possible, de fournir un lien qui
          permet d&apos;y accéder directement.
        </p>
      </AccordionSection>

      <AccordionSection title="Comment référencer et recenser un contenu de qualité ?">
        <p>
          <b>Préexistence d&apos;un contenu</b> :
        </p>
        <p>
          Tout d&apos;abord, le contributeur peut se demander si le contenu qu&apos;il
          s&apos;apprête à référencer existe déjà. Lorsqu&apos;il référence un nouveau sujet, il
          peut vérifier si celui-ci est déjà traité, ou partiellement traité, dans un autre sujet :
          auquel cas, il pourra enrichir ou modifier le débat déjà existant.
        </p>
        <p>
          Lors du recensement d&apos;une prise de position, l&apos;exercice est similaire : il
          pourra vérifier la pré-existence d&apos;une prise de position pour la personnalité en
          question, et l&apos;enrichir avec de nouvelles sources le cas échéant. Les arguments,
          matérialisés sur Débats.co par des tags, peuvent être infinis. Le formulaire vous
          suggérera néanmoins les tags proposés par d&apos;autres utilisateurs.
        </p>
        <p>
          <b>Notoriété et véracité</b> :
        </p>
        <p>
          Il est nécessaire pour le contributeur de se demander si le contenu est suffisamment
          important, fiable et pertinent pour être référencé ou recensé sur Débats.co. Basé sur une
          logique collaborative, le site comporte plusieurs mécanismes d&apos;autorégulation,
          permettant d&apos;éviter la publication de contenu considérés comme fallacieux ou
          hors-sujet. Chaque entrée, notamment lors du référencement d&apos;une nouvelle
          personnalité ou d&apos;un nouveau sujet, sont soumis à l&apos;approbation des utilisateurs
          expérimentés de la plateforme.
        </p>
        <p>
          <b>Neutralité et cohérence du point de vue</b>
        </p>
        <p>
          Parler de &quot;cohérence&quot; lorsque l&apos;on tente de référencer des sujets
          controversées est presque en soi contradictoire. Débats.co a néanmoins comme volonté de
          tendre un maximum vers l&apos;objectivité.
        </p>
        <p>
          Afin de s&apos;en rapprocher, il est nécessaire pour chaque utilisateur de se demander
          comment exprimer de façon objective l&apos;intitulé des sujets ou les positions des
          personnalités. Dans un premier temps, et pour simplifier cette démarche
          &quot;objective&quot;, les sujets ainsi que les pages de personnalités peuvent être
          référencées directement depuis la base de données de Wikipedia. Il suffira donc, après la
          composition des premières lettres de l&apos;intitulé de la personnalité ou du sujet, de
          sélectionner l&apos;élément correspondant.
        </p>
        <p>
          Lors de la recension d&apos;une prise d&apos;une position ensuite, il est important
          d&apos;attacher à la source une citation qui justifie la prise de position. La citation
          doit être isolée, entre guillemets, ne pas être modifiée, et se suffire à elle-même pour
          être comprise (ne pas être sortie d&apos;un contexte qui peut altérer sa compréhension).
          Pour être valide dans le cadre d&apos;un sujet, un argument doit être explicitement
          mobilisé par la personnalité publique et répondre à la problématique initiale du débat.
        </p>
      </AccordionSection>

      <AccordionSection title="Comment avoir accès à toutes les fonctions de Débats.co ?">
        <p>
          La contribution au site est simple. Toutefois, avant de pouvoir accéder à toutes les
          fonctions de référencement, de recension et de modification, une phase
          d&apos;apprentissage est nécessaire. Pour apprendre, il faut s&apos;exercer. Ainsi, pour
          chaque contribution au site, un nombre de points est attribué à l&apos;utilisateur.
          L&apos;accumulation de ces points lui donne progressivement accès aux fonctionnalités les
          plus puissantes de Débats.co. Le signalement par d&apos;autres utilisateurs de la
          violation des principes inscrits dans ce mode d&apos;emploi peut entraîner la perte de
          points. Ainsi 5 statuts existent sur Débats.co :
        </p>
        <ul>
          <li>
            <b>Le Métèque</b> : Son score est neutre. Il vient d&apos;arriver sur la plateforme, et
            doit encore faire ses preuves. Il peut soumettre des arguments et des sources.
          </li>
          <li>
            <b>L&apos;Éloquent</b> : Son score est positif, il peut ajouter de nouvelles
            personnalités, de nouveaux sujets, mais également suggérer l&apos;approbation ou le
            rejet de modifications proposées par d&apos;autres utilisateurs. Par défaut, tous les
            membres fondateurs inscrits lors de la bêta de Débats.co sont considérés comme
            Éloquents.
          </li>
          <li>
            <b>L&apos;Idéaliste</b> : Son score est élevé, il peut instantanément supprimer la
            plupart des modifications faites par d&apos;autres utilisateurs.
          </li>
          <li>
            <b>Le Sophiste</b> : Son score est négatif, il a tout autant de droits que le nouvel
            arrivant, mais part avec autant de points de retard pour redevenir Métèque.
          </li>
        </ul>
      </AccordionSection>
    </div>
  )
}

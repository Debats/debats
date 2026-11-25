import JointDeclarationCard from '../../components/joint-declarations/JointDeclarationCard'
import { Glimpse } from '../../domain/read-models/home-page'
import { JOINT_DECLARATIONS_HREF } from '../../domain/read-models/hrefs'
import { JointDeclarationSummary } from '../../domain/read-models/joint-declaration'
import Shelf from '../Shelf'

/** Le rayon des déclarations communes, sur l'accueil : les dernières rendues publiques. */
export default function DeclarationShelf({
  declarations,
}: {
  declarations: Glimpse<JointDeclarationSummary>
}) {
  return (
    <Shelf
      title="Déclarations communes"
      total={declarations.total}
      more={{ href: JOINT_DECLARATIONS_HREF, label: 'Toutes les déclarations' }}
    >
      {declarations.shown.map((declaration) => (
        <JointDeclarationCard key={declaration.id} declaration={declaration} />
      ))}
    </Shelf>
  )
}

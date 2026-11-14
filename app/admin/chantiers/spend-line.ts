import { AgentSpend } from '../../../domain/services/chantier-budget'
import { dollars } from '../../../lib/dollars'

/** What the agent spent and under which cap, in words: « 4,12 $US consommés sur 20,00 $US » */
export const spendLine = ({ spentCents, capCents }: AgentSpend): string =>
  `${dollars(spentCents)} consommés sur ${dollars(capCents)}`

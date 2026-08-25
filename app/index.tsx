import { Redirect } from 'expo-router'

/**
 * Entry point. Which surface a signed-in user lands on is US-013 AC-1, and the
 * rule for choosing between the shoot list and a crew member's own schedule is
 * NOT specified by the backlog — see the open question raised at EP-01. Until
 * it is answered this redirects unconditionally to the creator's surface, which
 * is a placeholder, not a decision.
 */
export default function Index() {
  return <Redirect href="/(app)" />
}

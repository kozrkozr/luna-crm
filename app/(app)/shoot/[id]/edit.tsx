import { useLocalSearchParams } from 'expo-router'
import { ShootForm } from '../../../../src/features/shoots/ShootForm'

/**
 * `US-018` — edit a shoot.
 *
 * The screen is `ShootForm` in edit mode (owner, 2026-09-03: "reuse New Shoot
 * for Edit Shoot… all fields exactly as on New Shoot Form"). Edit mode loads
 * the shoot, allows a past date, calls `updateShoot`, and reads «Редагувати» /
 * «Зберегти зміни».
 *
 * ── Three sections went with the merge, and two of them took a feature ───────
 *
 * This screen carried «Статус», the two file links and the location attachment.
 * All three are gone, as asked (owner, 2026-09-03), and the consequences are
 * not symmetrical:
 *
 * - **`US-020`'s status can no longer be changed anywhere.** `setShootStatus`
 *   has no caller left. The value is still displayed — the `StatusPill` on the
 *   detail screen and in the list — so a shoot shows a status nobody can move.
 * - **`US-018` AC-2's attachment can no longer be set.** `uploadLocationAttachment`
 *   has no caller left. Rows that already have one still display it everywhere,
 *   including on the link surface; nothing can add a new one.
 * - **The file links lost nothing.** `US-024` and `US-025` are edited in place
 *   on the detail screen's «Матеріали» tab.
 *
 * Both regressions are deliberate and recorded in docs/redesign-log.md. The
 * stories need amending, or the controls need re-homing.
 */
export default function EditShootScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ShootForm mode="edit" id={id} />
}

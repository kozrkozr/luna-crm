import type { Strings } from './index'

/**
 * English UI copy — `US-015`, for registered accounts that switch away from the
 * Ukrainian default (`US-014`). Never reached by a link view: those are
 * Ukrainian-only (`EP-05`, Out of scope), and the provider is not mounted
 * around them, so this file cannot render there.
 *
 * Typed as `Strings`, which is shaped from the Ukrainian dictionary, so a key
 * added to one and forgotten here is a compile error rather than a blank label.
 * That is `US-014` AC-2's "no text is left untranslated", enforced both ways.
 *
 * **Provenance.** 79 of these strings are the prototype's own `DICT.en`
 * or its inline `state.lang` pairs, matched by their Ukrainian TEXT rather than
 * by key name, so the wording is the owner's and not a translation of it.
 *
 * The other 31 had no English anywhere in the prototype: the error
 * messages, placeholders and controls added while building EP-01 to EP-04,
 * after the prototype was frozen. Those are translations of Ukrainian strings
 * that were themselves written during the build, and several are still flagged
 * as placeholder copy in docs/open-questions.md — an English placeholder is no
 * more settled than the Ukrainian one it mirrors.
 *
 * Three differ from the prototype deliberately, exactly as their Ukrainian
 * counterparts already do: `email` and `wrongCreds` drop "or phone" (`ADR-015`
 * made email the credential), and `attachImage`/`attachVideo` drop "(demo)"
 * because they now attach real files.
 *
 * `monthsGenitive` repeats `months`: Ukrainian inflects a month when a day
 * precedes it («7 серпня»), English does not, so the same template yields
 * "7 August" — correct English, and no date format was invented to get it.
 */
export const en: Strings = {
  brand: 'Luna',
  registerTitle: 'Register',
  loginTitle: 'Log in',
  name: 'Name',
  namePlaceholder: 'Your name',
  email: 'Email',
  password: 'Password',
  role: 'Your role',
  rolePlaceholder: 'Select a role…',
  social: 'Social media (how to reach you)',
  registerBtn: 'Register',
  loginBtn: 'Log in',
  toLogin: 'Already have an account? Log in',
  toRegister: 'No account yet? Register',
  roleRequired: 'Pick a role to register',
  wrongCreds: 'Wrong email or password',
  profileTitle: 'Profile',
  logout: 'Log out',
  contact: 'Contact',
  phone: 'Phone',
  myShoots: 'My shoots',
  newShootTitle: 'New shoot',
  clientName: 'Client name',
  clientNamePlaceholder: 'e.g. Maria',
  clientContact: 'Client contact',
  date: 'Date',
  dateRequired: 'Set the shoot date',
  pickDate: 'Pick a date',
  done: 'Done',
  newShoot: '+ New shoot',
  edit: 'Edit',
  editShootTitle: 'Edit shoot',
  locationSection: 'Location',
  address: 'Address',
  addressPlaceholder: 'e.g. Studio, Kyiv',
  locationNotes: 'Notes (directions, etc.)',
  locationNotesPlaceholder: 'e.g. Enter from the courtyard, buzzer 45',
  attachImage: '+ Image',
  attachVideo: '+ Video',
  emptyShoots: "You don't have any shoots yet.",
  emptyShootsSub: 'Create your first one — it takes a minute.',
  createFirst: 'Create first shoot',
  references: 'References',
  showAllReferences: 'Show all references',
  allReferencesTitle: 'All references',
  refPlaceholder: 'Reference link (e.g. Pinterest)',
  addRefBtn: 'Add',
  pickFromGallery: '🖼',
  back: '← Back',
  statusNew: 'New',
  statusFinished: 'Finished',
  markFinished: 'Mark as Finished',
  markNew: 'Mark as New',
  deleteShoot: 'Delete shoot',
  confirmDeleteShoot: 'Delete this shoot? This cannot be undone.',
  crew: 'Crew',
  crewName: 'Name',
  crewRole: 'Role',
  crewContact: 'Phone or email',
  crewInstagram: 'Instagram (optional)',
  crewNotes: 'Notes',
  peerDetailsTitle: 'Crew member details',
  removeCrewTitle: 'Remove',
  confirmRemoveCrew: 'Remove this person from the shoot?',
  addCrewMember: '+ Add crew member',
  addCrewTitle: 'Add crew member',
  crewNamePlaceholder: 'e.g. Natalia',
  crewContactPlaceholder: '+380… or email',
  crewNotesPlaceholder: 'e.g. brings their own kit',
  contactRequired: 'Enter a phone number or email',
  responsePending: 'Pending',
  responseConfirmed: 'Confirmed',
  responseDeclined: 'Declined',
  copyLinkTitle: 'Copy link',
  clientSection: 'Client',
  linkCopied: 'Link copied',
  linkNotConfigured: 'The link address is not configured.',
  shootFor: 'Shoot',
  youAre: 'You',
  confirm: 'Confirm',
  decline: 'Decline',
  youConfirmed: 'You confirmed attendance',
  youDeclined: 'You declined',
  linkInvalidTitle: 'This link no longer works',
  linkInvalidSub: 'This person was removed from the shoot, or the shoot was deleted. Ask the photographer for a new link.',
  rawFiles: 'Raw files',
  finishedPhotos: 'Finished photos',
  inDevelopment: 'In development',
  editFilesTitle: 'Files',
  setLinkPlaceholder: 'Link (e.g. fex.net)',
  save: 'Save',
  cancel: 'Cancel',
  registrationFailed: 'Could not register. Please try again.',
  passwordTooShort: 'The password must be at least 6 characters',
  passwordHint: 'At least 6 characters',
  emailTaken: 'An account with this email already exists',
  somethingWentWrong: 'Something went wrong. Please try again.',
  clientNameRequired: "Enter the client's name",
  clientContactRequired: "Enter the client's contact",
  shootCreateFailed: 'Could not create the shoot. Please try again.',
  referenceLinkInvalid: 'Enter a valid link — it must start with http or https',
  referenceTypeUnsupported: 'This file type is not supported. Choose an image.',
  referenceAddFailed: 'Could not add the reference. Please try again.',
  crewShootBadge: 'On the crew',
  allShoots: 'All shoots',
  noShootsOnDay: 'No shoots on this date.',
  shootUpdateFailed: 'Could not save the changes. Please try again.',
  attachmentTypeUnsupported: 'This file type is not supported.',
  clearDate: 'Clear date',
  crewNameRequired: "Enter the crew member's name",
  crewAddFailed: 'Could not add the crew member. Please try again.',
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  monthsGenitive: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
}

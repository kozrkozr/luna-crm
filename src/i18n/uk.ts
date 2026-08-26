/**
 * Ukrainian UI copy — the default for registered accounts (US-014). Strings are
 * taken from the gated prototype's `DICT.uk`
 * (docs/product/prototype/index.html); nothing user-facing is invented here.
 *
 * Term discipline: `посилання`, never `лінк` (glossary, 2026-08-25).
 */
export const uk = {
  brand: 'Luna',

  // EP-01 — registration, login, profile
  registerTitle: 'Реєстрація',
  loginTitle: 'Вхід',
  name: "Ім'я",
  namePlaceholder: "Ваше ім'я",
  // The prototype labels this «Email або телефон», which predates ADR-015
  // (2026-08-25). That ADR made email the credential and phone an optional
  // profile field, so the label is email-only.
  email: 'Email',
  password: 'Пароль',
  role: 'Ваша роль',
  rolePlaceholder: 'Оберіть роль…',
  social: 'Соцмережі (як зв’язатися)',
  registerBtn: 'Зареєструватися',
  loginBtn: 'Увійти',
  toLogin: 'Вже є акаунт? Увійти',
  toRegister: 'Ще не маєте акаунту? Зареєструватися',
  roleRequired: 'Оберіть роль, щоб зареєструватися',
  wrongCreds: 'Невірний email або пароль',
  profileTitle: 'Профіль',
  logout: 'Вийти',
  contact: 'Контакт',
  // ADR-015 makes phone an optional profile field. Registration does not
  // collect it, so this row appears only if a later story sets one.
  phone: 'Телефон',

  // EP-02 — shoots
  myShoots: 'Мої зйомки',
  newShootTitle: 'Нова зйомка',
  clientName: "Ім'я клієнта",
  clientNamePlaceholder: 'напр. Марія',
  clientContact: 'Контакт клієнта',
  date: 'Дата',
  dateRequired: 'Вкажіть дату зйомки',
  pickDate: 'Обрати дату',
  // iOS convention for confirming a picker. Not from the prototype — see
  // docs/open-questions.md item 1.
  done: 'Готово',
  newShoot: '+ Нова зйомка',
  // US-018 — the edit screen and the location section, from the prototype's
  // screenEditShoot. The two attach buttons drop the prototype's "(демо)"
  // marker, which labelled a fake attachment rather than a real one.
  edit: 'Редагувати',
  editShootTitle: 'Редагування зйомки',
  locationSection: 'Локація',
  address: 'Адреса',
  addressPlaceholder: 'напр. Студія, Київ',
  locationNotes: 'Нотатки (як доїхати тощо)',
  locationNotesPlaceholder: 'напр. Заїзд з двору, домофон 45',
  attachImage: '+ Зображення',
  attachVideo: '+ Відео',
  emptyShoots: 'У вас ще немає зйомок.',
  emptyShootsSub: 'Створіть першу — це займе хвилину.',
  createFirst: 'Створити першу зйомку',
  references: 'Референси',
  showAllReferences: 'Показати всі референси',
  allReferencesTitle: 'Усі референси',
  // US-003 — the reference field and the gallery icon, from the prototype's
  // referencesBlock. `pickFromGallery` is the icon glyph itself, as there.
  refPlaceholder: 'Посилання на референс (напр. Pinterest)',
  addRefBtn: 'Додати',
  pickFromGallery: '🖼',
  back: '← Назад',
  statusNew: 'Нова',
  statusFinished: 'Закінчена',
  // US-020 — the toggle's label names the status it moves TO, not the one the
  // shoot is in. Verbatim from the prototype, nested guillemets included.
  markFinished: 'Позначити як «Закінчена»',
  markNew: 'Позначити як «Нова»',
  // US-019, verbatim from the prototype.
  deleteShoot: 'Видалити зйомку',
  confirmDeleteShoot: 'Видалити цю зйомку? Це незворотньо.',

  // EP-03 / EP-04 — crew and link views
  crew: 'Команда',
  crewName: "Ім'я",
  crewRole: 'Роль',
  crewContact: 'Телефон або email',
  crewInstagram: "Instagram (необов'язково)",
  crewNotes: 'Нотатки',
  // US-005 — the add-crew screen, from the prototype's screenAddCrew. Its
  // rich-text toolbar (B / I) is demo chrome labelled as such; the data model
  // stores plain text, so the note is a plain textarea.
  addCrewMember: '+ Додати учасника',
  addCrewTitle: 'Додати учасника команди',
  crewNamePlaceholder: 'напр. Наталія',
  crewContactPlaceholder: '+380… або email',
  crewNotesPlaceholder: 'напр. привозить свій набір',
  contactRequired: 'Вкажіть телефон або email',
  // A crew member's answer to their invitation (US-008). Shown from US-005
  // onward because the column exists and defaults to pending.
  responsePending: 'Очікує',
  responseConfirmed: 'Підтвердив',
  responseDeclined: 'Відмовився',
  // US-006 — the copy affordance next to each crew member. The prototype's
  // «Посилання скопійовано (демо):» carries a demo marker and a fake URL; the
  // real one confirms and nothing more.
  copyLinkTitle: 'Скопіювати посилання',
  linkCopied: 'Посилання скопійовано',
  // Shown when EXPO_PUBLIC_LINK_BASE_URL is unset, which is a misconfiguration
  // rather than a user error. Placeholder; see docs/open-questions.md item 22.
  linkNotConfigured: 'Адресу для посилань не налаштовано.',
  shootFor: 'Зйомка',
  // US-007 — the crew link view names its reader, as the prototype does, so a
  // shared phone does not leave someone answering for the wrong person.
  youAre: 'Ви',
  confirm: 'Підтвердити',
  decline: 'Відмовитись',
  // US-008 — what the crew member sees once they have answered. A response is
  // final in v1, so this replaces the buttons rather than sitting beside them.
  youConfirmed: 'Ви підтвердили участь',
  youDeclined: 'Ви відмовились',
  linkInvalidTitle: 'Це посилання більше не діє',
  linkInvalidSub:
    'Учасника було видалено зі зйомки, або зйомку видалено. Зверніться до фотографа за новим посиланням.',
  rawFiles: 'Вихідники',
  finishedPhotos: 'Готові фото',
  inDevelopment: 'В розробці',

  // Shared
  save: 'Зберегти',
  cancel: 'Скасувати',

  // NOT from the prototype. The spec gives copy for US-001 AC-2's missing role
  // and US-013's wrong credentials, but nothing for a registration that fails
  // for another reason (duplicate email, weak password, network), and nothing
  // for a screen that fails to load its data. Placeholders pending
  // confirmation; see docs/open-questions.md item 1.
  registrationFailed: 'Не вдалося зареєструватися. Спробуйте ще раз.',
  passwordTooShort: 'Пароль має містити щонайменше 6 символів',
  passwordHint: 'Щонайменше 6 символів',
  emailTaken: 'Акаунт з таким email вже існує',
  somethingWentWrong: 'Щось пішло не так. Спробуйте ще раз.',
  // US-002 AC-2 requires the missing field to be *indicated*, and the prototype
  // supplies copy only for the date. These two are placeholders; see
  // docs/open-questions.md item 8.
  clientNameRequired: "Вкажіть ім'я клієнта",
  clientContactRequired: 'Вкажіть контакт клієнта',
  shootCreateFailed: 'Не вдалося створити зйомку. Спробуйте ще раз.',
  // US-003 AC-2 requires "a clear message" for an invalid link or an
  // unsupported file type but supplies neither, and the prototype has no
  // rejection copy at all. Placeholders; see docs/open-questions.md item 13.
  referenceLinkInvalid: 'Вкажіть коректне посилання — воно має починатися з http або https',
  referenceTypeUnsupported: 'Цей тип файлу не підтримується. Оберіть зображення.',
  referenceAddFailed: 'Не вдалося додати референс. Спробуйте ще раз.',
  // US-004 AC-4. The story requires a way back to the full list and an empty
  // result that says so, but supplies neither wording, and the prototype has no
  // filtered state at all. Placeholders; see docs/open-questions.md item 17.
  allShoots: 'Всі зйомки',
  noShootsOnDay: 'На цю дату зйомок немає.',
  // US-018. AC-3 gives the rule (a shoot always needs a date) and reuses
  // US-002's copy for it, but nothing covers a failed save or a rejected
  // attachment type. Placeholders; see docs/open-questions.md item 18.
  shootUpdateFailed: 'Не вдалося зберегти зміни. Спробуйте ще раз.',
  attachmentTypeUnsupported: 'Цей тип файлу не підтримується.',
  // The ✕ that empties the date field. Needs its own label: «Скасувати» is
  // already the button that abandons the edit, and two controls answering to
  // the same word is ambiguous to anyone not looking at the glyph.
  clearDate: 'Очистити дату',
  // US-005. AC-2 supplies the contact rule and the prototype supplies its
  // message, but nothing covers a missing name — which the schema requires —
  // or a save that fails. Placeholders; see docs/open-questions.md item 20.
  crewNameRequired: "Вкажіть ім'я учасника",
  crewAddFailed: 'Не вдалося додати учасника. Спробуйте ще раз.',
} as const

export type CopyKey = keyof typeof uk

/**
 * Professional roles offered at registration (US-001). The story defers the
 * list to "the glossary's confirmed roles as the starting list"; the glossary
 * confirms makeup artist, stylist, gaffer and shoot manager, and the gated
 * prototype adds Фотограф and fixes the Ukrainian labels. Stored in Ukrainian
 * because that is what the prototype offers as values.
 */
export const ROLES_UK = [
  'Фотограф',
  'Стиліст',
  'Гафер',
  'Візажист',
  'Менеджер зйомок',
] as const

export type Role = (typeof ROLES_UK)[number]

/**
 * Calendar labels for US-004, verbatim from the prototype's `calendarHtml`.
 *
 * Weekdays are **Monday-first**, as there — `(getDay() + 6) % 7` — which is the
 * Ukrainian convention and not JavaScript's Sunday-first default.
 */
export const WEEKDAYS_UK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const

/**
 * Month names in the genitive case, for naming a single date — «7 серпня», not
 * «7 Серпень». Ukrainian inflects the month when a day precedes it, so the
 * nominative list below cannot be reused for this.
 */
export const MONTHS_GENITIVE_UK = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня',
] as const

export const MONTHS_UK = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
] as const

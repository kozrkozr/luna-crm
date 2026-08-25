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
  profileTitle: 'Профіль',
  logout: 'Вийти',
  contact: 'Контакт',

  // EP-02 — shoots
  myShoots: 'Мої зйомки',
  newShoot: '+ Нова зйомка',
  emptyShoots: 'У вас ще немає зйомок.',
  emptyShootsSub: 'Створіть першу — це займе хвилину.',
  createFirst: 'Створити першу зйомку',
  references: 'Референси',
  showAllReferences: 'Показати всі референси',
  statusNew: 'Нова',
  statusFinished: 'Закінчена',

  // EP-03 / EP-04 — crew and link views
  crew: 'Команда',
  crewName: "Ім'я",
  crewRole: 'Роль',
  crewContact: 'Телефон або email',
  crewInstagram: "Instagram (необов'язково)",
  crewNotes: 'Нотатки',
  shootFor: 'Зйомка',
  confirm: 'Підтвердити',
  decline: 'Відмовитись',
  linkInvalidTitle: 'Це посилання більше не діє',
  linkInvalidSub:
    'Учасника було видалено зі зйомки, або зйомку видалено. Зверніться до фотографа за новим посиланням.',
  rawFiles: 'Вихідники',
  finishedPhotos: 'Готові фото',
  inDevelopment: 'В розробці',

  // Shared
  save: 'Зберегти',
  cancel: 'Скасувати',

  // NOT from the prototype — the spec gives copy for US-001 AC-2's missing role
  // and US-013's wrong credentials, but nothing for a registration that fails
  // for any other reason (duplicate email, weak password, network). Placeholder
  // pending confirmation; see docs/open-questions.md.
  registrationFailed: 'Не вдалося зареєструватися. Спробуйте ще раз.',
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

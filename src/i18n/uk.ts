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

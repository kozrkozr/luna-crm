/**
 * Ukrainian UI copy. Every string here is lifted verbatim from the gated
 * prototype's `DICT.uk` (docs/product/prototype/index.html) — no copy is
 * invented in this spike. Link views are Ukrainian-only by decision
 * (EP-05, Out of scope), so the spike ships no switcher.
 *
 * Term discipline: `посилання`, never `лінк` (glossary, 2026-08-25).
 */
export const uk = {
  brand: 'Luna',
  myShoots: 'Мої зйомки',
  newShoot: '+ Нова зйомка',
  emptyShoots: 'У вас ще немає зйомок.',
  emptyShootsSub: 'Створіть першу — це займе хвилину.',
  createFirst: 'Створити першу зйомку',
  references: 'Референси',
  crew: 'Команда',
  addCrewMember: '+ Додати учасника',
  copyLinkTitle: 'Скопіювати посилання',
  linkCopied: 'Посилання скопійовано (демо):',
  removeCrewTitle: 'Видалити',
  statusPending: 'Очікує',
  statusConfirmed: 'Підтвердив',
  statusDeclined: 'Відмовився',
  statusNew: 'Нова',
  statusFinished: 'Закінчена',
  markFinished: 'Позначити як «Закінчена»',
  markNew: 'Позначити як «Нова»',
  edit: 'Редагувати',
  deleteShoot: 'Видалити зйомку',
  locationSection: 'Локація',
  showAllReferences: 'Показати всі референси',
  rawFiles: 'Вихідники',
  finishedPhotos: 'Готові фото',
  inDevelopment: 'В розробці',
  files: 'Файли',
  shootFor: 'Зйомка',
  confirm: 'Підтвердити',
  decline: 'Відмовитись',
  youConfirmed: 'Ви підтвердили участь',
  youDeclined: 'Ви відмовились',
  linkInvalidTitle: 'Це посилання більше не діє',
  linkInvalidSub:
    'Учасника було видалено зі зйомки, або зйомку видалено. Зверніться до фотографа за новим посиланням.',
  demoLabel: '(демо)',
  noAccountView: 'вигляд без акаунту',
  you: 'Ви',
  peerDetailsTitle: 'Деталі учасника',
  crewName: "Ім'я",
  crewRole: 'Роль',
  crewContact: 'Телефон або email',
  crewInstagram: "Instagram (необов'язково)",
  crewNotes: 'Нотатки',
  addCrewTitle: 'Додати учасника команди',
  rolePlaceholder: 'Оберіть роль…',
  contactRequired: 'Вкажіть телефон або email',
  save: 'Зберегти',
  cancel: 'Скасувати',
  confirmDeleteShoot: 'Видалити цю зйомку? Це незворотньо.',
  confirmRemoveCrew: 'Видалити цю людину зі зйомки?',
  attachImageDemo: '+ Зображення (демо)',
  richTextDemo: '(демо, форматування поки недоступне)',
} as const

/** Roles as offered by the prototype's registration/crew form. */
export const ROLES_UK = ['Фотограф', 'Стиліст', 'Гафер', 'Візажист', 'Менеджер зйомок'] as const

export type CopyKey = keyof typeof uk

export const t = (key: CopyKey): string => uk[key]

const MONTHS_UK = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
]

export const DOW_UK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

export const monthName = (monthIndex: number): string => MONTHS_UK[monthIndex]

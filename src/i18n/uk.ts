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
  /*
   * Five keys were removed here on 2026-08-31, each having existed only for a
   * defect `Auth.dc.html` resolved: `emailOrPhone` (A-1 — the label that
   * invited a phone the field rejected), `confirmPassword`,
   * `confirmPasswordPlaceholder`, `passwordMismatch` (A-3 — a field and a
   * message no story defined) and `registerPasswordPlaceholder` (A-5 — it
   * promised 8 characters where the backend takes 6).
   */
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

  /* ── «Мій профіль», from `Edit Profile.dc.html`. Verbatim. ── */
  myProfileTitle: 'Мій профіль',
  accountSection: 'Акаунт',
  yourRoleSection: 'Ваша роль',
  socialSection: 'Соцмережі',
  /** «Незбережених змін: 2» — the counter beside the АКАУНТ heading. */
  unsavedCountTemplate: 'Незбережених змін: {count}',
  changePassword: 'Змінити',
  changePasswordTitle: 'Зміна пароля',
  /*
   * The email row is READ-ONLY (owner, 2026-08-31), so this replaces the
   * design's «Надішлемо лист на нову адресу…» notice. That copy described an
   * edit this screen does not perform — see src/features/auth/profile.ts.
   */
  emailIsLogin: 'Це ваш логін. Щоб змінити — напишіть нам.',
  socialSeenByCrew: 'Команда бачить ці контакти в деталях зйомки',
  profileSaved: 'Профіль оновлено',
  checkHighlightedFields: 'Перевірте виділені поля',
  savingProfile: 'Зберігаємо…',
  /* The discard sheet. «Ви змінили: Імʼя, Email.» names what would be lost. */
  discardChangesQuestion: 'Скасувати зміни?',
  changedFieldsTemplate: 'Ви змінили: {fields}. Ці зміни не буде збережено.',
  discardChangesAction: 'Відхилити зміни',
  keepEditingAction: 'Продовжити редагування',
  changesDiscarded: 'Зміни відхилено',
  /* The three derived counts. */
  statShoots: 'Зйомок',
  statClients: 'Клієнтів',
  statCrew: 'У команді',
  phoneFormatInvalid: 'Перевірте номер телефону',
  /* Account actions. */
  logoutAction: 'Вийти з акаунту',
  deleteAccount: 'Видалити акаунт',
  /*
   * The confirmation for the one irreversible action in the product. New copy —
   * no story covers deletion. Deliberately names what goes, because
   * `auth.users` cascades to every shoot, client, crew member and link.
   */
  confirmDeleteAccount:
    'Видалити акаунт? Зникнуть усі зйомки, клієнти, команда й посилання. Це незворотньо.',
  changePhoto: 'Змінити фото',
  logout: 'Вийти',
  contact: 'Контакт',
  // ADR-015 makes phone an optional profile field. Registration does not
  // collect it, so this row appears only if a later story sets one.
  phone: 'Телефон',

  // EP-02 — shoots
  myShoots: 'Мої зйомки',
  newShootTitle: 'Нова зйомка',
  /*
   * The shoot-list screen's header title, given by the owner on 2026-08-29. Not
   * from any mockup — «Варіант 3» titles that row «Зйомки», and the owner
   * removed that title (and the whole hand-drawn header) before naming this one.
   * It describes what the screen leads with, which is the month calendar.
   */
  calendarTitle: 'Календар',
  clientName: "Ім'я клієнта",
  clientNamePlaceholder: 'напр. Марія',
  clientContact: 'Контакт клієнта',
  date: 'Дата',
  dateRequired: 'Вкажіть дату зйомки',
  pickDate: 'Обрати дату',
  /*
   * US-030. «Початок» and «Кінець» are the design system's own strings, taken
   * from its shoot-edit mockup rather than translated here.
   *
   * The mockup labels the date row «Дата і час»; the owner renamed it to «Дата»
   * on 2026-08-29, so the row reuses `date` above and the mockup's string is
   * gone. The times carry their own labels, which is what made the longer one
   * redundant.
   *
   * `pickTime` and the two required-messages are NOT from any mockup: no
   * prototype covers picker or validation copy. They mirror `pickDate` and
   * `dateRequired`, which docs/open-questions.md item 1 already records as
   * placeholders — same status, same note.
   */
  timeStart: 'Початок',
  /*
   * «Завершення», not «Кінець» — the shoot-detail handoff's word, adopted
   * 2026-08-30. It is the same field label, so it changes on `new-shoot` too
   * rather than the app carrying two words for one thing.
   */
  timeEnd: 'Завершення',
  pickTime: 'Обрати час',
  startTimeRequired: 'Вкажіть початок зйомки',
  endTimeRequired: 'Вкажіть кінець зйомки',
  /*
   * ADR-017's design system supplies these two strings itself, from its
   * shoot-detail mockup — they are not translations invented here.
   *
   * `ownerOnly` is truthful about our data, not just decoration: the link
   * gateway's ShootRow has never selected client_name or client_contact, so the
   * client's contacts really do reach no audience but the creator (ADR-018,
   * Visibility). If that ever changes, this label has to change with it.
   */
  ownerOnly: 'Бачите лише ви',
  clientRole: 'Клієнт',
  /*
   * ADR-017's combined auth screen. Both strings are the design system's own,
   * from auth-screen.html — not translated here.
   *
   * «Зйомки» is the app's name on this screen, which is NOT what app.config.ts
   * calls it ('Luna CRM'). The mockup presents it as the product name beside a
   * «З» logo mark; whether the product is renamed is the owner's call, so the
   * screen says what the design says and this note records the discrepancy.
   */
  appName: 'LunaCRM',
  appTagline: 'Команда, локація, референси й підтвердження — в одному місці',
  // Accessibility labels for the password eye. Not from any mockup — the mockup
  // has aria-label="Показати пароль" and no hidden state, so the second is
  // this file's own and follows the first's form.
  showPassword: 'Показати пароль',
  hidePassword: 'Сховати пароль',
  // ADR-017 auth-screen.html, verbatim. Discrepancies with the spec are logged
  // in docs/redesign-log.md rather than resolved here.
  forgotPassword: 'Забули пароль?',

  /* ── «Відновлення пароля», from `Auth.dc.html`. Verbatim. ── */
  resetIntro:
    'Вкажіть email, з яким ви реєструвались. Надішлемо посилання для створення нового пароля.',
  resetTitle: 'Відновлення пароля',
  backToLogin: 'Назад до входу',
  sendResetLink: 'Надіслати посилання',
  sendingResetLink: 'Надсилаємо…',
  checkYourMail: 'Перевірте пошту',
  /** «Ми надіслали посилання для відновлення на {email}. Воно дійсне 30 хвилин.» */
  resetSentTemplate:
    'Ми надіслали посилання для відновлення на {email}. Воно дійсне 30 хвилин.',
  returnToLogin: 'Повернутись до входу',
  resendLink: 'Надіслати ще раз',
  /** «Надіслати ще раз через 24 с» */
  resendInTemplate: 'Надіслати ще раз через {seconds} с',
  changeAddress: 'Змінити адресу',
  resentToast: 'Лист надіслано ще раз',
  /* The screen the emailed link opens. New copy — the design draws the request
     and the confirmation but not the form that actually sets the password. */
  newPasswordTitle: 'Новий пароль',
  newPassword: 'Новий пароль',
  savePassword: 'Зберегти пароль',
  passwordChanged: 'Пароль змінено',
  resetLinkInvalid: 'Посилання недійсне або застаріле. Запросіть нове.',

  /* ── The rest of `Auth.dc.html` ── */
  appTagline2: 'Команда, локація, референси й підтвердження — в одному місці',
  signingIn: 'Входимо…',
  creatingAccount: 'Створюємо акаунт…',
  showPasswordShort: 'Показати',
  hidePasswordShort: 'Сховати',
  emailRequired: 'Вкажіть email',
  emailFormat: 'Перевірте формат: your@mail.com',
  passwordRequired: 'Введіть пароль',
  passwordInvent: 'Придумайте пароль',
  nameRequired: 'Вкажіть імʼя',
  /** The password meter. Colour is NOT how it reads — see AuthScreen. */
  strengthWeak: 'Слабкий',
  strengthNormal: 'Нормальний',
  strengthStrong: 'Надійний',
  /* «Інша роль» — the escape hatch on the role chips (owner, 2026-08-31). */
  otherRole: 'Інша роль',
  otherRolePlaceholder: 'Вкажіть свою роль',
  otherRoleRequired: 'Вкажіть свою роль',
  telegramLabel: 'Telegram',
  telegramPlaceholder: '@username',
  socialHint: 'Команда зможе швидко звʼязатися з вами',
  termsRequired: 'Потрібно погодитись з умовами',
  needHelp: 'Потрібна допомога?',
  writeToUs: 'Напишіть нам',
  tooManyAttempts: 'Забагато спроб входу. Спробуйте за 5 хвилин або відновіть пароль.',
  termsPrefix: 'Погоджуюсь з ',
  termsUse: 'умовами використання',
  termsAnd: ' та ',
  termsPrivacy: 'політикою конфіденційності',
  // ADR-017 calendar-ux-variants.html, «Варіант 3».
  /* Accessibility labels for the calendar's two arrows — they are bare glyphs
     on screen, so a screen reader has nothing else to announce. */
  calPrev: 'Попередній період',
  calNext: 'Наступний період',
  calModeMonth: 'Місяць',
  calModeWeek: 'Тиждень',
  shootsWord: 'Зйомки',
  /*
   * «· 2 зйомки за день» — the suffix after the count in a day's heading.
   *
   * Was the fixed phrase «зйомки за день», which read wrong from five upward
   * («5 зйомки за день»). The noun now comes from `shootCountForms` through
   * `pluralUk` and this is only the tail.
   */
  perDay: 'за день',
  untilShort: 'до',
  // US-031 — the threshold comes from the mockup, not from Ilona. See
  // docs/redesign-log.md.
  conflictLessThanHour: 'Менше години після попередньої',
  // The label beside US-015's switcher, now that it sits on the profile
  // screen rather than in a header where the control stood alone.
  language: 'Мова',
  /*
   * ADR-017's home screen (`US-035`), from home-screen.html.
   *
   * `greeting` has no name after it: the mockup's «Доброго дня, Дарино» is the
   * Ukrainian vocative, and we store one nominative `name`. Declining it in
   * code would mangle names the rules do not cover, on the home screen,
   * addressed to the user (owner's decision, 2026-08-28).
   *
   * `todayWord` and `tomorrowWord` are NOT from the mockup — it shows only
   * «за 22 дні», which for a shoot later today would read «за 0 днів». New copy,
   * logged in docs/redesign-log.md.
   */
  greeting: 'Доброго дня',
  weekdaysFull: [
    'Понеділок',
    'Вівторок',
    'Середа',
    'Четвер',
    'Пʼятниця',
    'Субота',
    'Неділя',
  ],
  viewCalendar: 'Переглянути календар',
  nextShootLabel: 'Наступна зйомка',
  /** The list under the two buttons, and its link through to the calendar. */
  upcomingShootsLabel: 'Наступні зйомки',

  /* ── «Нова зйомка», from `New Shoot.dc.html`. Verbatim. ── */
  dateAndTime: 'Дата й час',
  pickDateError: 'Виберіть дату',
  clientRequiredShort: 'Вкажіть клієнта',
  /* The rail ↔ exact-field toggle. Each label names where the tap LEADS. */
  otherTime: 'Інший час',
  fromRail: 'Зі стрічки',
  duration: 'Тривалість',
  /** The summary bar's left half when no date has been picked yet. */
  noDatePicked: 'Дата не вибрана',
  shootWord: 'Зйомка',
  locationPlaceholder: 'Назва або адреса',
  notesSection: 'Нотатки',
  clientCannotSee: 'Клієнт не бачить',
  shootNotesPlaceholder: 'Побажання клієнта, обладнання, що взяти',
  createShootCta: 'Створити зйомку',
  fillClientAndTime: 'Заповніть клієнта й час',
  /** «Перетин із «Марія Литвин» 10:00 – 13:00» — a warning, never a block. */
  overlapTemplate: 'Перетин із «{name}» {range}',
  /** The suggestion row's affordance, and its «клієнт · 2 зйомки» line. */
  pickClient: 'Обрати',
  seeAll: 'Усі',
  /**
   * «Деталі →» in the next-shoot card's footer. The arrow is drawn separately,
   * as every glyph in this dictionary is — a translated string carrying one
   * cannot be reused where the glyph is wrong.
   *
   * A third key holding «Деталі», after `tabDetails` and `accessDetailsLabel`.
   * Deliberate: they name three different things — a tab, a block of access
   * instructions, and a link into a shoot — and any of them can be reworded
   * without dragging the other two with it.
   */
  openDetails: 'Деталі',
  inDaysPrefix: 'за',
  /** день / дні / днів — the three Ukrainian plural forms, in that order. */
  dayForms: ['день', 'дні', 'днів'],
  todayWord: 'Сьогодні',
  tomorrowWord: 'Завтра',
  crewConfirmedTemplate: 'команда: {done} з {total} підтвердили',
  notifications: 'Сповіщення',
  // ADR-017 client-match-flow.html, US-029.
  clientField: 'Клієнт',
  clientNameSearchPlaceholder: "Ім'я клієнта",
  newClientHint: 'Новий клієнт — профіль створиться автоматично',
  viewClientProfile: 'Глянути профіль',
  unlinkClient: 'Відвʼязати',
  phoneField: 'Телефон',
  phonePlaceholder: '+380 xx xxx xx xx',
  /** «Цей номер уже належить профілю {name} — це вона?» */
  phoneBelongsToTemplate: 'Цей номер уже належить профілю {name} — це вона?',
  yesSamePerson: 'Так, це вона',
  noNewClient: 'Ні, новий клієнт',
  creatingNewProfile: 'Гаразд — створюємо новий профіль',
  shootCountForms: ['зйомка', 'зйомки', 'зйомок'],
  clientRequired: 'Оберіть клієнта',
  /*
   * The search screen's own strings. It is a screen rather than the mockup's
   * dropdown (see src/features/clients/selection.ts), so it needs a title and a
   * way to confirm a name that matched nothing — neither of which the mockup
   * has. Logged in docs/redesign-log.md.
   */
  clientSearchTitle: 'Обрати клієнта',
  useTypedNameTemplate: 'Новий клієнт: {name}',
  clientProfileTitle: 'Профіль клієнта',
  clientProfileComingSoon: 'Профіль клієнта — незабаром',
  // iOS convention for confirming a picker. Not from the prototype — see
  // docs/open-questions.md item 1.
  done: 'Готово',
  // US-018 — the edit screen and the location section, from the prototype's
  // screenEditShoot. The two attach buttons drop the prototype's "(демо)"
  // marker, which labelled a fake attachment rather than a real one.
  edit: 'Редагувати',
  editShootTitle: 'Редагування зйомки',
  locationSection: 'Локація',
  /*
   * From the Figma shoot-detail frame, 2026-08-30.
   *
   * `clientSeesCrew` is the line under the client's name — what that person
   * receives through their link, stated on the screen where it is decided.
   * Truthful about the payload, not decoration: the gateway sends a client the
   * crew list and never a note (ADR-013, CLAUDE.md rule 2).
   *
   * `participantForms` is grammar, not new copy — «учасник» is already in
   * `addCrewTitle`. Three Ukrainian plural forms, in the order `pluralUk` wants.
   */
  clientSeesCrew: 'Бачить команду, без нотаток',
  /*
   * The frame's headings for the two file sections, kept separate from
   * `rawFiles`/`finishedPhotos` below: those are what a CREW MEMBER or a CLIENT
   * reads on the link view, whose own mockups word it their way. Same split as
   * `emptyNextTitle` against `emptyShoots`.
   */
  sourceFilesSection: 'Вихідні файли',
  finishedFilesSection: 'Готові файли',
  locationPhotoLabel: 'Фото локації',
  /** учасник / учасники / учасників */
  participantForms: ['учасник', 'учасники', 'учасників'],
  /*
   * The reference groups the frame draws. **No story supplies these** — they are
   * the file's own copy, taken as drawn like every other prototype string this
   * phase has taken, and logged in docs/redesign-log.md as a question. The list
   * is here rather than in the schema so adding a group stays a copy change; see
   * supabase/migrations/20260830120000_reference_category.sql.
   */
  referenceCategories: ['Світло', 'Пози', 'Стиль'],
  address: 'Адреса',
  addressPlaceholder: 'напр. Студія, Київ',
  locationNotes: 'Нотатки (як доїхати тощо)',
  locationNotesPlaceholder: 'напр. Заїзд з двору, домофон 45',
  attachImage: '+ Зображення',
  attachVideo: '+ Відео',
  /*
   * home-screen-2.html's «Порожньо» state, verbatim except for one word: the
   * mockup writes «Натисніть «Створити зйомку» вище», naming a button this app
   * no longer has — the owner renamed that control to «Нова зйомка» on
   * 2026-08-29. A quoted label has to match the label, so it does.
   *
   * Separate from `emptyShoots`/`emptyShootsSub` below, which are the SHOOT
   * LIST's empty state (US-004 AC-2). Two screens, two prototypes, two texts.
   */
  emptyNextTitle: 'Ще немає жодної зйомки',
  /*
   * Replaced 2026-08-30 with `Home.dc.html`'s own copy. The previous line said
   * «Натисніть «Нова зйомка» **вище**» — and the redesign moves that button
   * BELOW this block, so the old text now pointed the wrong way. The new one
   * describes the shoot instead of the button, which is why it does not care
   * where the button sits.
   */
  emptyNextSub:
    'Створіть першу зйомку — вона зʼявиться тут разом із командою, локацією та нотатками.',
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
  // US-023 — a crew member reading a peer's record.
  peerDetailsTitle: 'Деталі учасника',
  // US-022, verbatim from the prototype.
  removeCrewTitle: 'Видалити',
  confirmRemoveCrew: 'Видалити цю людину зі зйомки?',
  // US-005 — the add-crew screen, from the prototype's screenAddCrew. Its
  // rich-text toolbar (B / I) is demo chrome labelled as such; the data model
  // stores plain text, so the note is a plain textarea.
  addCrewMember: 'Додати учасника',
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
  /*
   * `copyLinkTitle` («Скопіювати посилання») was removed on 2026-08-31. It
   * labelled the crew row's copy icon, which went when the shoot detail was
   * rebuilt — and its last use was as a TOAST, where an imperative was standing
   * in for a confirmation: «Скопіювати посилання — Ірина» said "copy the link",
   * not "the link was copied". `linkCopied` below is what a toast wants.
   */
  // US-027 — the shoot's client, and the link that belongs to them. «Клієнт»
  // and «Контакт клієнта» are the prototype's own words for these fields.
  clientSection: 'Клієнт',
  /*
   * The three copy confirmations. All PAST tense: a toast reports what
   * happened, and the button that caused it already said what it would do.
   * Verbatim from `Shoot Detail v3.dc.html`, which gets this right throughout.
   */
  linkCopied: 'Посилання скопійовано',
  addressCopied: 'Адресу скопійовано',
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
  /* ── «Shoot Link Preview», the crew and client link view. Verbatim. ── */
  /** «Ваша роль: Гафер» — the reader's own role, on the crew link. */
  yourRoleTemplate: 'Ваша роль: {role}',
  youAreTheClient: 'Ви — клієнт цієї зйомки',
  /*
   * The design writes «Дарина запросила вас на зйомку» — a past-tense verb that
   * agrees with the organiser's gender, which nothing in the data model holds.
   * Neutral construction instead, for the same reason `removedFromCrewTemplate`
   * uses the nominative: Ukrainian agreement cannot be derived from a name.
   */
  inviteFromTemplate: 'Запрошення на зйомку від {name}',
  yourShootDetails: 'Деталі вашої зйомки',
  howToGetIn: 'Як потрапити',
  privateLink: 'Приватне посилання',
  addToCalendar: 'Додати в календар',
  googleCalendar: 'Google Calendar',
  appleOutlookIcs: 'Apple / Outlook (.ics)',
  whoIsOnTheShoot: 'Хто на зйомці',
  /** The badge on the reader's own row. */
  youBadge: 'ВИ',
  organizerNotes: 'Нотатки від організатора',
  filesAndLinks: 'Файли та посилання',
  openWord: 'Відкрити',
  organizerSection: 'Організатор',
  callOrganizer: 'Подзвонити',
  privateLinkWarning: 'Приватне посилання — не публікуйте його.',
  organisedIn: 'Організовано в LunaCRM',
  confirmParticipation: 'Підтверджую участь',
  cannotCome: 'Не зможу приїхати',
  changeAnswer: 'Змінити',
  answerReopened: 'Відповідь скасовано — оберіть знову',
  confirmedThanks: 'Дякуємо! Участь підтверджено',
  /** The status card under the hero, once an answer exists. */
  confirmedSub: 'Організатор бачить вашу відповідь.',
  declinedSub: 'Організатор отримав відповідь',
  /* The decline sheet. «Причина — за бажанням» is the design's own promise. */
  cannotComeTitle: 'Не зможете приїхати?',
  cannotComeBody:
    'Організатор одразу побачить вашу відповідь. Причина — за бажанням, вона допоможе швидше знайти заміну.',
  declineReasons: ['Інша зйомка', 'Не встигаю', 'Особисті причини'],
  sendDecline: 'Надіслати відмову',
  backWord: 'Назад',
  declineSent: 'Відповідь надіслано',
  youConfirmed: 'Ви підтвердили участь',
  youDeclined: 'Ви відмовились',
  linkInvalidTitle: 'Це посилання більше не діє',
  linkInvalidSub:
    'Учасника було видалено зі зйомки, або зйомку видалено. Зверніться до фотографа за новим посиланням.',
  rawFiles: 'Вихідники',
  finishedPhotos: 'Готові фото',
  inDevelopment: 'В розробці',
  // The creator's side of US-024/US-025, from the prototype's edit form.
  editFilesTitle: 'Файли',
  setLinkPlaceholder: 'Посилання (напр. fex.net)',

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
  // US-009 — marks a row as a shoot you are ON rather than one you created.
  // No prototype copy exists: ux-notes.md left US-009 out of it. Recorded in
  // docs/open-questions.md #24.
  crewShootBadge: 'В команді',
  allShoots: 'Всі зйомки',
  noShootsOnDay: 'На цю дату зйомок немає.',
  /* `Calendar.dc.html`'s two period-scoped empty states, verbatim. */
  emptyWeek: 'На цьому тижні немає зйомок',
  emptyMonth: 'У цьому місяці ще немає зйомок',
  /* The filter bar's clear action. «Всі зйомки» above is the older, shorter
     label from the pill this replaced. */
  showAllShoots: 'Показати всі',
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

  /**
   * Calendar labels for US-004, verbatim from the prototype's `calendarHtml`.
   *
   * In the dictionary rather than beside it, because they are UI copy and
   * `US-015` has to translate them. Weekdays are **Monday-first**, as in the
   * prototype — `(getDay() + 6) % 7` — which is the Ukrainian convention and
   * not JavaScript's Sunday-first default; an English dictionary keeps that
   * order, since it describes the grid, not the language.
   */
  weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],

  /**
   * Month names in the genitive case, for naming a single date — «7 серпня»,
   * not «7 Серпень». Ukrainian inflects the month when a day precedes it, so
   * the nominative list below cannot be reused for this. English has no such
   * case, and `US-015` is expected to repeat its month names in both.
   */
  monthsGenitive: [
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
  ],

  /** Nominative month names, for a calendar heading — «Серпень 2026». */
  months: [
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
  ],


  /*
   * ── Shoot detail + edit redesign ────────────────────────────────────────
   *
   * Every string below is copied **verbatim** from
   * `design_handoff_shoot_detail/README.md` (owner's instruction). Nothing here
   * is translated or invented, which is the same discipline the prototype
   * strings above were taken under.
   *
   * Three notes on what is NOT here, each because the field or feature behind it
   * does not exist (owner, 2026-08-30 — "build UI only for what exists"):
   * the «Нотатки» card and its «Клієнт не бачить» badge (no shoot-level notes
   * column), «Назва локації» / «Код доступу» / «Охорона» (no columns), and
   * «Надіслати нагадування», «Скопіювати посилання для всіх» and «Маршрут»
   * (no mechanism). See docs/redesign-log.md.
   */
  shootDetailTitle: 'Деталі зйомки',
  tabDetails: 'Деталі',
  tabPeople: 'Люди',
  tabMaterials: 'Матеріали',

  /*
   * The overflow menu. «Скасувати зйомку» is the handoff's label for what
   * `US-019` calls «Видалити зйомку» — a rename from *delete* to *cancel*, kept
   * because the copy was to be taken as written. **The action behind it is still
   * the soft delete**; nothing notifies anyone. Logged.
   */
  menuEditShoot: 'Редагувати зйомку',
  menuViewAsClient: 'Дивитись як клієнт',
  cancelShoot: 'Скасувати зйомку',

  /*
   * The client-view banner. This is a PREVIEW and never a guarantee: what a
   * client may see is decided by the link gateway per audience (ADR-013,
   * CLAUDE.md rule 2). Hiding a note on the creator's own screen protects
   * nothing, and this copy is careful not to claim it does — it says what the
   * reader is looking at, not what the client is prevented from seeing.
   */
  clientViewBanner: 'Ви дивитесь очима клієнта — нотатки й приватні контакти приховані',
  exitClientView: 'Вийти',

  /** «Початок через 2 год 40 хв» — a live countdown to the shoot's start. */
  startsInPrefix: 'Початок через',
  hoursShort: 'год',
  minutesShort: 'хв',
  /** «Клієнтська зйомка · 3 год» — the shoot card's subline. */
  clientShootLabel: 'Клієнтська зйомка',
  timeLabel: 'Час',
  /** «2 з 4 підтвердили», on the shoot card's Команда row and the People tab. */
  confirmedOfTemplate: '{done} з {total} підтвердили',

  /*
   * The location card's two buttons. «Маршрут» is a **stub** — see the note in
   * app/(app)/shoot/[id]/index.tsx. The word ships; nothing is behind it yet.
   */
  /*
   * The bare verb, for controls whose subject is obvious from where they sit —
   * the ✕ on the location attachment's thumbnail. Same word as
   * `removeCrewTitle`, deliberately a separate key: that one is `US-022`'s and
   * names a person, this one names whatever it is attached to.
   */
  remove: 'Видалити',
  /*
   * **New copy, and no story supplies it.** Removing a reference is not in
   * `US-003` or `US-021`; the owner asked for the control on 2026-08-30. Worded
   * on `confirmDeleteShoot`'s pattern — the question, then what it costs — so
   * the three confirmations in the app read alike. Logged.
   */
  confirmRemoveReference: 'Видалити цей референс? Це незворотньо.',
  route: 'Маршрут',
  copyAddress: 'Копіювати адресу',
  /**
   * The access-details block inside the location card. Same word as the first
   * tab and a different thing, which is why it is a key of its own rather than
   * a reuse of `tabDetails` — they would drift the moment either is reworded.
   */
  accessDetailsLabel: 'Деталі',

  /** The reference filter chips: «Всі 6», «Світло 3», … */
  allFilter: 'Всі',
  /** Indeclinable — «1 фото», «4 фото», «7 фото» all take the same form. */
  photosWord: 'фото',
  /**
   * «посилання» / «посилання» / «посилань» — declinable, unlike `photosWord`.
   * A bare 'посилання' read wrong at 0 and at 5 or more, which is most of the
   * range this actually renders.
   */
  linkForms: ['посилання', 'посилання', 'посилань'],
  addReferenceOrFile: 'Додати референс або файл',
  copyWord: 'Копіювати',

  /*
   * The person sheet's link button.
   *
   * **«Посилання на зйомку», not the handoff's «Копіювати посилання»** (owner,
   * 2026-08-31). The bare word did not say WHAT it links to, and the app uses
   * «посилання» for two other things — a reference link and a password-reset
   * link — so a two-word button carried none of the meaning the glossary gives
   * it: "the per-person URL that gives a crew member or client access to one
   * shoot without an account or an app".
   *
   * The word itself stays; it is confirmed vocabulary and «лінк» is forbidden
   * (glossary, 2026-08-25). It is the destination that was missing, and the
   * verb goes because a button already implies one — «на зйомку» buys more than
   * «Копіювати» did.
   *
   * Deliberately still not `copyLinkTitle` («Скопіювати посилання»), which is
   * the accessibility label on the crew row's icon button.
   */
  instagramLabel: 'Інстаграм',
  writeTo: 'Написати',
  callPerson: 'Зателефонувати',
  copyPersonLink: 'Посилання на зйомку',
  removeFromCrew: 'Видалити з команди',
  /*
   * The undo toast. The handoff writes the name in the **accusative**
   * («Соломію Дяк видалено з команди»); the prototype carries a hand-written
   * `acc` field per person to do it. Nothing in the data model holds one and
   * Ukrainian declension cannot be derived from a name reliably, so the
   * nominative is used. Logged.
   */
  removedFromCrewTemplate: '{name} видалено з команди',

  // ── Screen 2, «Редагувати» ──
  editTitle: 'Редагувати',
  basicSection: 'Основне',
  timeSection: 'Час',
  statusLabel: 'Статус',
  /** «Тривалість: 3 год», recomputed as the two time fields change. */
  durationPrefix: 'Тривалість:',
  saveChanges: 'Зберегти зміни',
  noChanges: 'Немає змін',
  discardChangesTitle: 'Відхилити зміни?',
  discardChangesBody: 'Незбережені зміни буде втрачено.',
  keepEditing: 'Продовжити',
  discardChanges: 'Відхилити',
  changesSaved: 'Зміни збережено',

  /*
   * ── «Додати учасника», from the add screen in `Shoot Detail v3.dc.html` ──
   *
   * Verbatim from the design, like every other string in this block. Three
   * departures, each decided by the owner on 2026-08-30 and each recorded in
   * docs/redesign-log.md:
   *
   * - «Телефон» is NOT labelled «— необовʼязково». `US-005` AC-2 requires a
   *   phone or an email, and `crew_members_contact_required` enforces it in the
   *   database — the design's label would invite a value the row rejects.
   * - «Нотатки» is kept, though the design drops it. It is the field `ADR-013`
   *   and CLAUDE.md rule 2 exist for; losing the only way to write one would
   *   make half of `US-005` unreachable.
   * - The role chips use `ROLES_UK`, not the design's own six. Those are stored
   *   values read back on every surface, and the glossary confirms the list —
   *   see the note on `ROLES_UK` below.
   */
  addCrewTabContacts: 'Мої контакти',
  addCrewTabNew: 'Новий контакт',
  /** The search field over «Збережені контакти». */
  contactSearchPlaceholder: 'Імʼя або роль',
  savedContacts: 'Збережені контакти',
  /** On a contact already on this shoot — the row is shown, dimmed, unpickable. */
  alreadyInCrew: 'У команді',
  alreadyInCrewMeta: 'вже в команді',
  noContactsFound: 'Нікого не знайдено. Створіть новий контакт.',
  /** The sticky CTA: counts the selection, or asks for one. */
  addToCrewTemplate: 'Додати до команди ({count})',
  pickCrewMembers: 'Виберіть учасників',
  /** «Дмитра Марчука додано до команди» / «Додано учасників: 3». */
  addedToCrewTemplate: '{name} додано до команди',
  addedCrewCountTemplate: 'Додано учасників: {count}',

  crewNameExample: 'Наприклад, Дмитро Марчук',
  crewPhonePlaceholder: '+380 __ ___ ____',
  crewInstagramLabel: 'Інстаграм',
  crewInstagramPlaceholder: '@nickname',
  optionalSuffix: '— необовʼязково',
  crewRoleOnShoot: 'Роль на зйомці',
  /*
   * The design's own reassurance under the form. True as built, and for a
   * reason worth stating: «Мої контакти» is derived from the creator's past
   * shoots (`listPastCrew`), so adding someone here really does put them in
   * that list next time — nothing has to be saved anywhere else for the
   * sentence to hold.
   */
  contactWillBeSaved:
    'Контакт збережеться в системі — наступного разу додасте його зі списку збережених.',
  saveAndAdd: 'Зберегти й додати',
} as const

export type CopyKey = keyof typeof uk


/**
 * Professional roles offered at registration (US-001). The story defers the
 * list to "the glossary's confirmed roles as the starting list"; the glossary
 * confirms makeup artist, stylist, gaffer and shoot manager, and the gated
 * prototype adds Фотограф and fixes the Ukrainian labels.
 *
 * **Deliberately NOT in the dictionary.** These are values written to
 * `crew_members.role` and `users.role` and read back on every surface,
 * including the two Ukrainian-only ones. `US-015` AC-2 requires that switching
 * language leaves "the shoot's own content (client info, references, names)"
 * unchanged — translating a stored role would rewrite data, and a client's link
 * view would then disagree with the creator's screen about what someone does.
 */
export const ROLES_UK = [
  'Фотограф',
  'Стиліст',
  'Гафер',
  'Візажист',
  'Менеджер зйомок',
] as const

export type Role = (typeof ROLES_UK)[number]

# US-065 — Fill a new contact from the phone's contacts

- **Parent epic:** [EP-03 — Crew management and the crew-facing link](EP-03.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to pick a person from my iPhone's contacts when I add a new contact**,
so that **their name and phone are filled in for me instead of my retyping what the phone already
knows**.

## Context
Owner, chat 2026-10-17. Every decision below is the owner's, same chat, except where marked.

The design is the form state of `Contacts.dc.html` (Claude Design): a card at the top of
«Новий контакт» and, once a contact is chosen, a «Заповнено з контакту …» row in its place.

It applies to **both** places the app offers a «Новий контакт» form:
- «Мої контакти» → «+ Новий контакт» (built under `ADR-003`), for «Команда» and «Клієнт»;
- the «Новий контакт» tab of «Додати учасника» (`US-005`, also opened from the «Нова зйомка» form,
  `US-064`).

The owner takes these to be one form; in the build they are today two. The behaviour below is the
same in both.

The picker is **the iPhone's own contact picker**: the person chooses one contact there, and only
that contact reaches the app — the app is not given the phone's address book. This departs from
the mockup's in-app list, which would need the whole address book; the mockup's «Уже збережено»
mark is replaced by AC-5's check after the pick (owner, same chat).

How several numbers are handled (AC-4) is the common practice in messaging and banking apps,
proposed in the same chat and accepted by the owner: the app does not guess, the person chooses.

## Acceptance criteria

### AC-1 — The card
- **Given** a «Новий контакт» form, on iPhone, with no contact chosen yet
- **Then** above every field it shows a card: an icon, **«Вибрати з контактів телефону»**, under it
  **«Імʼя й телефон заповняться самі»**, and a chevron; under the card a divider reading
  **«або заповніть вручну»**
- **When** the creator taps the card
- **Then** the iPhone's contact picker opens
- **When** they close the picker without choosing anyone
- **Then** the form is unchanged

### AC-2 — After a contact is chosen
- **Then** the card and the divider are replaced by a row: a check icon, **«Заповнено з контакту
  {name}»**, and **«Інший»**, which opens the picker again
- Choosing another contact this way fills the form again as in AC-3 to AC-5

### AC-3 — Name
- «Ім'я» is filled with the contact's **full name**, as the phone holds it (given and family name)
- A contact with neither — only a company — fills «Ім'я» with the **company name**
- Whatever «Ім'я» held before is **replaced**

### AC-4 — Phone
- **Given** the chosen contact has **one** number
- **Then** «Телефон» is filled with it **as written in the contacts** — not reformatted — replacing
  whatever it held
- **Given** the contact has **several** numbers
- **Then** a menu from the bottom of the screen lists every number with its label from the
  contacts («мобільний», «робочий»…), and the number tapped fills «Телефон»; closing the menu
  leaves «Телефон» as it was
- **Given** the contact has **no** number
- **Then** only «Ім'я» is filled, with no message, and «Телефон» keeps what it held

### AC-5 — A person already in «Мої контакти»
- **Given** the number chosen in AC-4 is already the phone of someone in «Мої контакти» —
  «Команда» or «Клієнти» — the same number whatever its spacing
- **Then** the form is **not** filled, and a toast reads **«{name} уже є у ваших контактах»**, with
  the name as saved in «Мої контакти»
- A contact with no number is not checked and fills «Ім'я» as in AC-3

### AC-6 — Nothing else changes
- Every filled field stays editable, and the form saves, validates and asks «Скасувати»'s question
  exactly as it does today
- «Instagram», «Нотатки», «Тип контакту» and the role are not touched

### AC-7 — Where it is not offered
- Not on «Редагувати контакт» — as the mockup draws it
- Not in a browser (`EP-10`) — a browser cannot open the phone's contacts

### AC-8 — Language
| UK | EN |
|---|---|
| Вибрати з контактів телефону | Choose from phone contacts |
| Імʼя й телефон заповняться самі | Name and phone will fill in for you |
| або заповніть вручну | or fill in by hand |
| Заповнено з контакту {name} | Filled from contact {name} |
| Інший | Another |
| {name} уже є у ваших контактах | {name} is already in your contacts |

The number labels in AC-4's menu are the phone's own and are shown as the phone gives them.

If the build needs the iOS contacts usage text (`NSContactsUsageDescription`, `US-050`), it is,
in the same shape as the photos one:

| UK | EN |
|---|---|
| Luna Shoots потребує доступу до контактів, щоб заповнити ім'я й телефон людини, яку ви вибрали. | Luna Shoots needs access to your contacts to fill in the name and phone of the person you choose. |

## Out of scope
- Importing several contacts at once, or the whole address book.
- Instagram, email or a photo from the contact.
- Keeping a saved contact in sync with the phone's contacts.

## Dependencies
`ADR-003` («Мої контакти»), `US-005`, `US-050`.

## Open questions
None — the mockup's «Уже збережено» (AC-5), the English (AC-8) and the usage text were confirmed by
the owner, chat 2026-10-17.

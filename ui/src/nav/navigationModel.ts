import {
  IconArrowsExchange,
  IconBuildingBank,
  IconChecklist,
  IconFileText,
  IconFileUpload,
  type Icon,
  IconKey,
  IconUsers,
  IconWritingSign,
} from '@tabler/icons-react'

export type NavTarget = {
  id: string
  label: string
  icon: Icon
  to: string
}

export type NavSection = {
  id: string
  label: string
  items: NavTarget[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'participants',
    label: 'Teilnehmer',
    items: [
      { id: 'participants', label: 'Teilnehmer', icon: IconUsers, to: '/' },
      { id: 'bank-keys', label: 'Bank-Schlüssel', icon: IconKey, to: '/bank-keys' },
    ],
  },
  {
    id: 'payments',
    label: 'Zahlungsverkehr',
    items: [
      { id: 'accounts', label: 'Konten & Umsätze', icon: IconBuildingBank, to: '/accounts' },
      { id: 'statements', label: 'Kontoauszüge', icon: IconFileText, to: '/statements' },
      { id: 'orders', label: 'Eingereichte Aufträge', icon: IconFileUpload, to: '/orders' },
      { id: 'veu', label: 'VEU / Freigaben', icon: IconWritingSign, to: '/veu' },
    ],
  },
  {
    id: 'protocol',
    label: 'Protokoll',
    items: [
      { id: 'protocol', label: 'Kundenprotokoll', icon: IconChecklist, to: '/protocol' },
      { id: 'exchanges', label: 'Verkehr (Roh-XML)', icon: IconArrowsExchange, to: '/exchanges' },
    ],
  },
]

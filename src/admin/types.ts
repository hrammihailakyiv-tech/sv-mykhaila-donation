export interface AdminMethod {
  id: string
  method: 'online' | 'card'
  is_active: boolean
  payment_url: string | null
  card_number: string | null
  recipient_name: string | null
  payment_description: string | null
}

export interface AdminOption {
  id: string
  title: string
  description: string | null
  icon: string | null
  is_active: boolean
  sort_order: number
  donation_payment_methods: AdminMethod[]
}

export interface AuditRow {
  id: string
  entity_type: string
  entity_id: string
  action: string
  changes: Record<string, unknown>
  changed_by: string | null
  changed_at: string
}

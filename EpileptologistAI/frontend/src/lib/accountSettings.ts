import { supabase } from './supabase'

export interface AccountSettings {
  emailAlerts: boolean
  inAppAlerts: boolean
  monthlySummary: boolean
  shareAnonymizedData: boolean
  emergencyContact: string
}

export const defaultAccountSettings: AccountSettings = {
  emailAlerts: true,
  inAppAlerts: true,
  monthlySummary: true,
  shareAnonymizedData: false,
  emergencyContact: '',
}

function isMissingColumnError(message: string): boolean {
  return message.includes('column profiles.') && message.includes('does not exist')
}

function fromProfileRow(row: any): AccountSettings {
  return {
    emailAlerts: Boolean(row?.email_alerts_high_risk ?? defaultAccountSettings.emailAlerts),
    inAppAlerts: Boolean(row?.in_app_alerts_live_monitoring ?? defaultAccountSettings.inAppAlerts),
    monthlySummary: Boolean(row?.monthly_monitoring_summary ?? defaultAccountSettings.monthlySummary),
    shareAnonymizedData: Boolean(row?.share_anonymized_data ?? defaultAccountSettings.shareAnonymizedData),
    emergencyContact: String(row?.emergency_contact_email ?? defaultAccountSettings.emergencyContact),
  }
}

export async function getAccountSettings(userId: string, userEmail?: string | null): Promise<AccountSettings> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  // If profile row is missing (older account), create it once then return defaults.
  if (!data) {
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: userId, email: userEmail ?? null }, { onConflict: 'id' })
    if (upsertError) throw new Error(upsertError.message)
    return defaultAccountSettings
  }

  return fromProfileRow(data)
}

export async function saveAccountSettings(userId: string, userEmail: string | null | undefined, settings: AccountSettings): Promise<void> {
  const payload = {
    id: userId,
    email: userEmail ?? null,
    email_alerts_high_risk: settings.emailAlerts,
    in_app_alerts_live_monitoring: settings.inAppAlerts,
    monthly_monitoring_summary: settings.monthlySummary,
    share_anonymized_data: settings.shareAnonymizedData,
    emergency_contact_email: settings.emergencyContact.trim() || null,
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })

  if (error) {
    if (isMissingColumnError(error.message)) {
      throw new Error('Database is missing account settings columns. Run the latest schema in backend/src/schema.sql and try again.')
    }
    throw new Error(error.message)
  }
}

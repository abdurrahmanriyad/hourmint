use rusqlite::{types::ToSql, Connection};

use crate::error::{validation, AppResult};
use crate::models::{Settings, SettingsPatch};
use crate::time;

pub fn get(conn: &Connection) -> AppResult<Settings> {
    Ok(conn.query_row(
        "SELECT business_name, address, email, phone, tax_id, logo_path, default_currency,
                default_rate, payment_terms_days, tax_label, tax_rate, rounding_minutes,
                invoice_number_pattern, next_invoice_seq, default_invoice_notes, date_format,
                number_locale, time_format, week_start, theme, idle_threshold_minutes,
                long_timer_hours, global_shortcut, launch_at_login, reminder_enabled,
                reminder_time, reminder_days, timesheet_show_source, onboarded
         FROM settings LIMIT 1",
        [],
        |r| {
            Ok(Settings {
                business_name: r.get(0)?,
                address: r.get(1)?,
                email: r.get(2)?,
                phone: r.get(3)?,
                tax_id: r.get(4)?,
                logo_path: r.get(5)?,
                default_currency: r.get(6)?,
                default_rate: r.get(7)?,
                payment_terms_days: r.get(8)?,
                tax_label: r.get(9)?,
                tax_rate: r.get(10)?,
                rounding_minutes: r.get(11)?,
                invoice_number_pattern: r.get(12)?,
                next_invoice_seq: r.get(13)?,
                default_invoice_notes: r.get(14)?,
                date_format: r.get(15)?,
                number_locale: r.get(16)?,
                time_format: r.get(17)?,
                week_start: r.get(18)?,
                theme: r.get(19)?,
                idle_threshold_minutes: r.get(20)?,
                long_timer_hours: r.get(21)?,
                global_shortcut: r.get(22)?,
                launch_at_login: r.get(23)?,
                reminder_enabled: r.get(24)?,
                reminder_time: r.get(25)?,
                reminder_days: r.get(26)?,
                timesheet_show_source: r.get(27)?,
                onboarded: r.get(28)?,
            })
        },
    )?)
}

pub const ROUNDING_CHOICES: &[i64] = &[0, 5, 6, 15, 30];

fn validate(p: &SettingsPatch) -> AppResult<()> {
    if let Some(c) = &p.default_currency {
        if !is_currency_code(c) {
            return validation("Currency must be a three-letter ISO code, e.g. USD.");
        }
    }
    if let Some(r) = p.default_rate {
        if r < 0 {
            return validation("Rate cannot be negative.");
        }
    }
    if let Some(d) = p.payment_terms_days {
        if !(0..=365).contains(&d) {
            return validation("Payment terms must be between 0 and 365 days.");
        }
    }
    if let Some(t) = p.tax_rate {
        if !(0.0..=100.0).contains(&t) {
            return validation("Tax rate must be between 0 and 100%.");
        }
    }
    if let Some(r) = p.rounding_minutes {
        if !ROUNDING_CHOICES.contains(&r) {
            return validation("Rounding must be none, 5, 6, 15 or 30 minutes.");
        }
    }
    if let Some(pat) = &p.invoice_number_pattern {
        if !crate::services::invoices::pattern_has_sequence(pat) {
            return validation("Invoice number pattern must include a sequence such as {0001}.");
        }
    }
    if let Some(s) = p.next_invoice_seq {
        if s < 1 {
            return validation("Next invoice number must be at least 1.");
        }
    }
    if let Some(t) = &p.time_format {
        if t != "12h" && t != "24h" {
            return validation("Time format must be 12h or 24h.");
        }
    }
    if let Some(w) = p.week_start {
        if !(0..=6).contains(&w) {
            return validation("Week start must be a weekday.");
        }
    }
    if let Some(t) = &p.theme {
        if !["light", "dark", "system"].contains(&t.as_str()) {
            return validation("Theme must be light, dark or system.");
        }
    }
    if let Some(i) = p.idle_threshold_minutes {
        if !(0..=240).contains(&i) {
            return validation("Idle threshold must be between 0 (off) and 240 minutes.");
        }
    }
    if let Some(h) = p.long_timer_hours {
        if !(0.0..=48.0).contains(&h) {
            return validation("Long timer warning must be between 0 (off) and 48 hours.");
        }
    }
    if let Some(t) = &p.reminder_time {
        if chrono::NaiveTime::parse_from_str(t, "%H:%M").is_err() {
            return validation("Reminder time must look like 09:30.");
        }
    }
    Ok(())
}

pub fn is_currency_code(c: &str) -> bool {
    c.len() == 3 && c.chars().all(|ch| ch.is_ascii_uppercase())
}

pub fn update(conn: &Connection, patch: &SettingsPatch) -> AppResult<Settings> {
    validate(patch)?;
    let mut sets: Vec<String> = Vec::new();
    let mut vals: Vec<Box<dyn ToSql>> = Vec::new();
    macro_rules! field {
        ($name:ident) => {
            if let Some(v) = &patch.$name {
                sets.push(format!("{} = ?{}", stringify!($name), vals.len() + 1));
                vals.push(Box::new(v.clone()));
            }
        };
    }
    field!(business_name);
    field!(address);
    field!(email);
    field!(phone);
    field!(tax_id);
    field!(default_currency);
    field!(default_rate);
    field!(payment_terms_days);
    field!(tax_label);
    field!(tax_rate);
    field!(rounding_minutes);
    field!(invoice_number_pattern);
    field!(next_invoice_seq);
    field!(default_invoice_notes);
    field!(date_format);
    field!(number_locale);
    field!(time_format);
    field!(week_start);
    field!(theme);
    field!(idle_threshold_minutes);
    field!(long_timer_hours);
    field!(global_shortcut);
    field!(launch_at_login);
    field!(reminder_enabled);
    field!(reminder_time);
    field!(reminder_days);
    field!(timesheet_show_source);
    field!(onboarded);
    if !sets.is_empty() {
        sets.push(format!("updated_at = ?{}", vals.len() + 1));
        vals.push(Box::new(time::now_iso()));
        let sql = format!("UPDATE settings SET {}", sets.join(", "));
        let params: Vec<&dyn ToSql> = vals.iter().map(|b| b.as_ref()).collect();
        conn.execute(&sql, params.as_slice())?;
    }
    get(conn)
}

pub fn set_logo_path(conn: &Connection, path: Option<&str>) -> AppResult<Settings> {
    conn.execute(
        "UPDATE settings SET logo_path = ?1, updated_at = ?2",
        (path, time::now_iso()),
    )?;
    get(conn)
}

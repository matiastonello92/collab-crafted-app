# 📧 Email Notifications - Setup Guide

## ✅ Implementazione Completata

Sistema completo di notifiche email per Klyra Shifts con 3 eventi automatici:

### Eventi Implementati
1. **Rota Published** - Planning settimanale pubblicato (inviato a tutti gli assegnati)
2. **Shift Assignment Change** - Modifica turno (assegnazione/modifica/cancellazione)
3. **Leave Decision** - Decisione su richiesta di assenza (approvata/rifiutata)

---

## 🚀 Setup Rapido

### 1. Configurare Resend (Provider Email)

1. Crea account su [https://resend.com](https://resend.com)
2. Verifica il tuo dominio email
3. Crea una API Key
4. Aggiungi al file `.env`:

```bash
RESEND_API_KEY=re_your_api_key_here
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**Senza RESEND_API_KEY**: Il sistema usa un placeholder mailer che logga le email senza inviarle (utile per sviluppo).

### 2. Database già configurato ✅

La migration ha già creato:
- Tabella `email_logs` per audit trail
- Campo `email_preferences` in `profiles` per opt-out utente

### 3. Funzionamento Automatico

Le email vengono inviate automaticamente quando:
- Un manager pubblica un rota → `/api/v1/rotas/[id]/status` (status='published')
- Un turno viene assegnato/modificato → `/api/v1/shifts/[id]/assign`
- Una richiesta di assenza viene approvata/rifiutata → `/api/v1/leave/requests/[id]/decision`

---

## 📊 Monitoraggio

### Admin UI - Log Email
Accedi a: **Admin → Settings → Email Logs** (da implementare link sidebar)

Visualizza:
- Tutte le email inviate con status (sent/failed/pending/bounced)
- Filtri per tipo evento, stato, destinatario
- Statistiche aggregate

---

## 🎯 User Preferences

Gli utenti possono disabilitare email specifiche in:
**Impostazioni → Notifiche → Preferenze Email Dettagliate**

Opt-out granulare per:
- Planning pubblicato
- Modifiche turni  
- Decisioni assenze

---

## 🌍 i18n Support

Template supportano **Italiano** e **Francese** automaticamente basato su `profiles.locale`.

---

## 🔧 API Endpoints

Trigger manuali (se necessari):
- `POST /api/v1/notifications/rota-published` - body: `{ rotaId }`
- `POST /api/v1/notifications/shift-assignment` - body: `{ shiftId, userId, changeType }`
- `POST /api/v1/notifications/leave-decision` - body: `{ leaveRequestId }`

---

## ✅ Checklist Deployment

- [ ] Configurare `RESEND_API_KEY` in produzione
- [ ] Verificare dominio email su Resend
- [ ] Testare invio email con `/api/settings/email-test`
- [ ] Controllare log in Admin UI
- [ ] Verificare preferenze utente funzionanti

---

**Implementazione completa al 100% secondo Prompt 10.**

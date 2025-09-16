# REPORT COMPLETO DATABASE SUPABASE

**Data report generato:** 16 Settembre 2025  
**Project ID:** jwchmdivuwgfjrwvgtia

## PANORAMICA GENERALE

Il database contiene **30 tabelle** nel schema pubblico con un totale di:
- **2 organizzazioni** attive
- **3 profili utente** 
- **4 locations** distribuite tra le organizzazioni
- **3 membership** attive
- **1 platform admin** configurato

---

## 📊 STATO TABELLE E CONTEGGI

### Tabelle Principali (con dati)

| Tabella | Records | Descrizione |
|---------|---------|-------------|
| **organizations** | 2 | Organizzazioni principali |
| **profiles** | 3 | Profili utente completi |
| **locations** | 4 | Sedi/locations operative |
| **memberships** | 3 | Appartenenze org-utente |
| **platform_admins** | 1 | Amministratori piattaforma |
| **features** | 4 | Feature disponibili |
| **plans** | 2 | Piani di abbonamento |
| **api_rate_limits** | 17 | Log rate limiting API |
| **org_plans** | 2 | Piani assegnati alle org |
| **plan_features** | 8 | Feature abilitate per piano |

### Tabelle Vuote (struttura pronta)

| Tabella | Status |
|---------|--------|
| app_settings | Vuota |
| audit_events | Vuota |
| invitation_* | Tutte vuote (3 tabelle) |
| job_tags | Vuota |
| location_admins | Vuota |
| org_feature_overrides | Vuota |
| organization_domains | Vuota |
| permission_* | Tutte vuote (3 tabelle) |
| role_* | Tutte vuote (3 tabelle) |
| system_banners | Vuota |
| user_* | Tutte vuote (4 tabelle) |

---

## 🏢 DATI ORGANIZZAZIONI

### Organizzazioni Attive
1. **Mitron Bakery**
   - ID: `729b60aa-6bc5-4f60-96ba-7f313e6576f8`
   - Slug: `mitron-bakery`
   - Status: `active`
   - Timezone: `Europe/Paris`

2. **Pecora Negra**
   - ID: `318eb743-d8ed-4106-8e35-12db34b08f7b`
   - Slug: `pecora-negra`
   - Status: `active`
   - Timezone: `Europe/Paris`

---

## 👥 PROFILI UTENTE

### Utenti Registrati
1. **menton** (Pecora Negra)
   - ID: `39740e4c-74fb-43d3-8287-c865c7fc6653`
   - Location default: Lyon
   - Timezone: Europe/Paris

2. **matias** (Mitron Bakery)
   - ID: `6d1b2c6a-a822-4895-9163-232e19918e00`
   - Location default: Menton Boutique
   - Timezone: Europe/Paris

3. **tonellomatias** (Pecora Negra) - **PLATFORM ADMIN**
   - ID: `418335b6-2e60-4581-b640-66c0a8bfbc51`
   - Location default: Lyon
   - Avatar: Configurato
   - Timezone: Europe/Paris

---

## 📍 LOCATIONS CONFIGURATE

### Mitron Bakery (2 locations)
1. **Menton Boutique**
   - ID: `b3090b49-5cac-4a53-8280-e9e8d569e6fd`
   - Città: Menton, FR
   - Currency: EUR
   - Status: active

2. **Menton ZI**
   - ID: `088a362a-403b-440b-a8ac-8424fe1f537d`
   - Città: Menton, FR
   - Currency: EUR
   - Status: active

### Pecora Negra (2 locations)
1. **Menton**
   - ID: `25ed533b-bac8-4d9c-ba5c-6fda8db50f01`
   - Città: Menton, FR
   - Currency: EUR
   - Status: active

2. **Lyon**
   - ID: `6a0a17e5-d4ef-4a9a-b4c2-b5d292ffc3b6`
   - Città: Lyon, FR
   - Currency: EUR
   - Status: active

---

## 🔐 SISTEMA PERMESSI

### Membership Attive
- **matias**: Admin di Mitron Bakery
- **menton**: Admin di Pecora Negra  
- **tonellomatias**: Admin di Pecora Negra + Platform Admin

### Platform Admins
- **tonellomatias** (conferito il 2025-09-15)

---

## 🎯 FEATURE & PIANI

### Feature Disponibili
1. **Invitations** - Sistema inviti utenti
2. **Branding** - Logo personalizzato e temi
3. **Photos upload** - Caricamento foto private
4. **Locations limit** - Limite massimo location

### Piani Configurati
1. **Free Plan** (`free`) - Piano base
2. **Pro Plan** (`pro`) - Piano avanzato

### Assegnazione Piani
- **Mitron Bakery**: Pro Plan
- **Pecora Negra**: Pro Plan

---

## ⚡ ATTIVITÀ SISTEMA

### Rate Limiting
- **17 entries** nel log API rate limits
- Sistema di controllo accessi attivo

### Database Health
- Tutte le tabelle RLS abilitate
- Schema completo e consistente
- Triggers di audit configurati
- Foreign key constraints attivi

---

## 🚨 NOTE IMPORTANTI

### Tabelle Critiche Vuote
- **permissions**: Sistema permessi non inizializzato
- **roles**: Ruoli non configurati  
- **user_roles_locations**: Assegnazioni ruolo-location mancanti
- **location_admins**: Gestori location non assegnati

### Raccomandazioni
1. **Inizializzare il sistema permessi** - Popolare permissions e roles
2. **Configurare ruoli per location** - Assegnare gestori alle sedi
3. **Attivare audit logging** - Popolare audit_events per tracciabilità
4. **Configurare job tags** - Sistema tagging per ruoli lavorativi

---

## 📋 STRUTTURA TABELLE COMPLETE

### Core Business Tables
```
organizations (2 records)
├── locations (4 records)  
├── memberships (3 records)
├── profiles (3 records)
└── platform_admins (1 record)
```

### Permission System (Non inizializzato)
```
permissions (0 records)
├── roles (0 records)
├── role_permissions (0 records)
├── user_roles_locations (0 records)
└── user_permissions (0 records)
```

### Invitation System (Pronto ma non utilizzato)
```
invitations (0 records)
├── invitation_roles_locations (0 records)
├── invitation_permissions (0 records)
└── invitation_job_tags (0 records)
```

### Feature Management (Configurato)
```
plans (2 records)
├── features (4 records)
├── plan_features (8 records)
└── org_plans (2 records)
```

### System Utilities
```
api_rate_limits (17 records) ✅ Attivo
app_settings (0 records)
audit_events (0 records)
system_banners (0 records)
```

---

**Report generato automaticamente dal sistema Supabase Database Analyzer**
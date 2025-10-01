# Klyra Shifts - Time Clock (Kiosk) - Complete Implementation

**Status:** ✅ Complete (MVP)  
**Prompt:** Prompt 7 - Time Clock (Kiosk only)

---

## 📋 Implementation Overview

This module implements a **kiosk-based time clock system** for recording employee clock in/out and breaks at physical locations. The implementation includes anti-spoofing measures, sequence validation, and a time correction request system.

---

## 🗄️ Database Schema

### 1. `time_clock_events` Table (Existing, Enhanced)
Stores all punch events (clock in/out, breaks).

**Columns:**
- `id` (UUID, PK)
- `org_id` (UUID, FK → organizations)
- `location_id` (UUID, FK → locations)
- `user_id` (UUID)
- `kind` (TEXT: 'clock_in' | 'clock_out' | 'break_start' | 'break_end')
- `occurred_at` (TIMESTAMPTZ)
- `source` (TEXT: 'kiosk' | 'mobile' | 'manual')
- `kiosk_token` (TEXT, nullable) - For anti-spoofing
- `notes` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ)

**RLS Policies:**
- Employees can view their own events
- Managers with `timeclock:manage` can view all events in their locations
- Only managers can update/delete events

---

### 2. `time_correction_requests` Table (New)
Stores employee requests to correct punch times.

**Columns:**
- `id` (UUID, PK)
- `org_id` (UUID, FK → organizations)
- `location_id` (UUID, FK → locations)
- `user_id` (UUID) - Employee requesting correction
- `event_id` (UUID, FK → time_clock_events, nullable)
- `original_time` (TIMESTAMPTZ, nullable)
- `requested_time` (TIMESTAMPTZ) - Corrected time
- `reason` (TEXT) - Employee explanation
- `status` (TEXT: 'pending' | 'approved' | 'rejected')
- `reviewed_by` (UUID, nullable)
- `reviewed_at` (TIMESTAMPTZ, nullable)
- `reviewer_notes` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**RLS Policies:**
- Employees can view their own requests
- Employees can create their own requests
- Managers with `timeclock:manage` can view/update all requests

---

### 3. `profiles.pin_code` Column (New)
Added `pin_code` (TEXT, UNIQUE) to `profiles` table for kiosk authentication.

**Index:** `idx_profiles_pin_code` on `pin_code`

---

## 🔐 Anti-Spoofing System

### Kiosk Token Generation
Each kiosk page generates a signed JWT-like token containing:
- `location_id` - Binds token to specific location
- `issued_at` - Token creation timestamp
- `expires_at` - Token validity (24h default)
- `signature` - HMAC-SHA256 signature

**Files:**
- `lib/kiosk/token.ts` - Token generation and verification
- Secret: `KIOSK_SECRET` environment variable

**Usage:**
```typescript
import { generateKioskToken, verifyKioskToken } from '@/lib/kiosk/token'

// Server-side: Generate token for kiosk page
const token = generateKioskToken(locationId)

// API: Verify token on punch
const { valid, locationId } = verifyKioskToken(token)
```

---

## 📝 Business Logic

### Punch Sequence Validation
Enforces valid state transitions to prevent invalid punches.

**Rules:**
1. **clock_in:** Must not have active session
2. **clock_out:** Must have active clock_in (not on break)
3. **break_start:** Must be clocked in and not on break
4. **break_end:** Must be on break

**File:** `lib/shifts/time-clock-logic.ts`

**Function:** `validatePunchSequence(userId, locationId, kind, orgId)`

---

### Double-Punch Prevention
Prevents duplicate punches within 10-second threshold (anti-double-tap).

**File:** `lib/shifts/time-clock-logic.ts`

**Function:** `checkDoublePunch(userId, locationId, kind, orgId, thresholdSeconds)`

---

### Session Summary Calculation
Calculates today's work hours, break time, and current status.

**File:** `lib/shifts/time-clock-logic.ts`

**Function:** `getTodaySessionSummary(userId, locationId, orgId)`

**Returns:**
```typescript
{
  totalMinutes: number,
  breakMinutes: number,
  status: 'not_started' | 'clocked_in' | 'on_break' | 'clocked_out',
  lastEvent?: TimeClockEvent
}
```

---

## 🌐 API Endpoints

### 1. POST `/api/v1/timeclock/punch`
Record a time clock event (clock in/out, break).

**Enhanced with:**
- Kiosk token verification
- Sequence validation
- Double-punch prevention

**Request Body:**
```json
{
  "location_id": "uuid",
  "kind": "clock_in" | "clock_out" | "break_start" | "break_end",
  "source": "kiosk" | "mobile",
  "kiosk_token": "base64_token",
  "occurred_at": "ISO datetime" (optional)
}
```

**Response:**
```json
{
  "clock_event": { ...TimeClockEvent }
}
```

**Errors:**
- 400: Invalid sequence (e.g., "Devi prima timbrare l'ingresso")
- 403: Invalid kiosk token
- 429: Double-punch detected

---

### 2. POST `/api/v1/timeclock/lookup`
Lookup user by PIN code (kiosk authentication).

**Request Body:**
```json
{
  "pin": "1234",
  "location_id": "uuid"
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "full_name": "Nome Cognome",
  "avatar_url": "url" | null
}
```

**Errors:**
- 404: PIN non valido
- 403: Unauthorized location

---

### 3. POST `/api/v1/timeclock/corrections`
Create a time correction request (employee).

**Request Body:**
```json
{
  "event_id": "uuid" (optional),
  "original_time": "ISO datetime" (optional),
  "requested_time": "ISO datetime",
  "reason": "Explanation text (min 10 chars)"
}
```

**Response:**
```json
{
  "correction": { ...TimeCorrectionRequest }
}
```

---

### 4. GET `/api/v1/timeclock/corrections`
Get employee's own correction requests.

**Query Params:**
- `status` (optional): 'pending' | 'approved' | 'rejected'

**Response:**
```json
{
  "requests": [ ...TimeCorrectionRequest[] ]
}
```

---

### 5. GET `/api/v1/timeclock/corrections/pending`
Get pending corrections for manager review (requires `timeclock:manage`).

**Query Params:**
- `location_id` (optional): Filter by location

**Response:**
```json
{
  "corrections": [
    {
      ...TimeCorrectionRequest,
      "requester": { "full_name": "...", "avatar_url": "..." },
      "event": { "kind": "...", "occurred_at": "..." },
      "location": { "name": "..." }
    }
  ]
}
```

---

### 6. POST `/api/v1/timeclock/corrections/[id]/decision`
Approve or reject a correction request (manager, requires `timeclock:manage`).

**Request Body:**
```json
{
  "decision": "approve" | "reject",
  "notes": "Optional reviewer notes"
}
```

**Response:**
```json
{
  "message": "Correction approved",
  "status": "approved"
}
```

**Side Effect:** If approved and `event_id` exists, updates `time_clock_events.occurred_at`.

---

## 🖥️ Kiosk UI

### Layout: `app/(kiosk)/layout.tsx`
Full-screen layout without navigation, optimized for kiosk display.

### Page: `app/(kiosk)/kiosk/[locationId]/page.tsx`
Server component that:
1. Verifies location exists
2. Generates kiosk token
3. Renders `KioskClient`

**URL:** `/kiosk/{locationId}`

---

### Components

#### 1. `KioskClient.tsx`
Main client component managing authentication state.

**States:**
- `currentUser`: Authenticated user or null
- `isLoading`: Loading state

**Flow:**
1. Show `PinInput` for authentication
2. On success, show `PunchButtons`
3. Auto-logout after punch (3s)

---

#### 2. `KioskClock.tsx`
Real-time clock display with date.

**Features:**
- Live updating (1s interval)
- Large, readable font (text-6xl)
- Italian locale formatting

---

#### 3. `PinInput.tsx`
4-digit PIN input with auto-focus and auto-submit.

**Features:**
- Four separate input fields
- Numeric-only input
- Auto-advance to next field
- Auto-lookup on 4th digit
- Keyboard navigation (backspace)
- Clear button

**API Call:** `POST /api/v1/timeclock/lookup`

---

#### 4. `PunchButtons.tsx`
Large, touch-friendly buttons for punch actions.

**Buttons:**
- **Clock In** (primary, green)
- **Clock Out** (destructive, red)
- **Break Start** (outline)
- **Break End** (outline)

**Features:**
- User greeting with name
- Session summary (hours worked today)
- Auto-logout after punch (3s)
- "Change user" link

**API Call:** `POST /api/v1/timeclock/punch`

---

## 👔 Manager UI

### Page: `app/(app)/admin/timeclock/corrections/page.tsx`
Manager inbox for reviewing time correction requests.

**URL:** `/admin/timeclock/corrections`

**Permission Required:** `timeclock:manage`

---

### Component: `TimeCorrectionInbox.tsx`
Displays pending correction requests with approve/reject actions.

**Features:**
- Card-based layout
- Employee info (name, location)
- Original vs requested time comparison
- Reason display
- Optional review notes (textarea)
- Approve/Reject buttons

**API Calls:**
- `GET /api/v1/timeclock/corrections/pending` (load)
- `POST /api/v1/timeclock/corrections/[id]/decision` (decision)

---

## 👤 Employee UI

### Component: `TimeCorrectionRequestForm.tsx`
Dialog form for employees to request time corrections.

**Features:**
- Dialog trigger button
- Original time display (if provided)
- Datetime input for corrected time
- Textarea for reason (min 10 chars)
- Character counter (max 500)
- Form validation

**Usage:**
```tsx
<TimeCorrectionRequestForm
  eventId="uuid"
  originalTime="ISO datetime"
  onSuccess={() => console.log('Request sent')}
/>
```

**API Call:** `POST /api/v1/timeclock/corrections`

---

## 🧪 Testing Checklist

### Kiosk Flow
- [ ] Access kiosk page: `/kiosk/{locationId}`
- [ ] Real-time clock updates every second
- [ ] PIN input accepts only 4 digits
- [ ] Valid PIN identifies user correctly
- [ ] Invalid PIN shows error toast
- [ ] Kiosk token generated and verified

### Punch Sequence
- [ ] First action must be "Clock In"
- [ ] Cannot clock in twice without clock out
- [ ] Cannot clock out without clock in
- [ ] Cannot start break without clock in
- [ ] Cannot end break without break start
- [ ] Double-punch prevention (10s threshold)

### Time Corrections
- [ ] Employee can request correction via form
- [ ] Reason must be at least 10 characters
- [ ] Manager sees pending requests in inbox
- [ ] Manager can approve correction (updates event)
- [ ] Manager can reject correction (with notes)
- [ ] Employee sees updated request status

### Anti-Spoofing
- [ ] Punch without kiosk token fails (if enforced)
- [ ] Kiosk token binds to correct location
- [ ] Expired token (>24h) is rejected
- [ ] Invalid signature is rejected

---

## 🔒 Security Considerations

### 1. PIN Security
- **Weak Point:** 4-digit PIN (10,000 combinations)
- **Mitigation:** 
  - Rate limiting on lookup endpoint
  - Consider fingerprint/QR for production
  - PIN should be user-generated, not sequential

### 2. Kiosk Token Security
- **Protection:** HMAC-SHA256 signature
- **Secret Management:** Store `KIOSK_SECRET` in environment variables
- **Token Lifespan:** 24h default (configurable)

### 3. RLS Policies
- All tables have RLS enabled
- Employees can only see/modify their own data
- Managers require `timeclock:manage` permission
- Platform admins have full access

### 4. Location Isolation
- All operations verify `org_id` match
- Kiosk token binds to specific `location_id`
- Cross-location access is blocked

---

## 🚀 Future Enhancements (Post-MVP)

### High Priority
1. **Mobile App Integration**
   - GPS-based punch (within radius)
   - QR code scanning
   - Offline mode with sync

2. **Timesheet Generation**
   - Daily/weekly/monthly reports
   - Overtime calculation
   - Export to CSV/PDF

3. **Notifications**
   - Forgot to clock out alert
   - Correction request status updates
   - Manager approval reminders

### Medium Priority
4. **Advanced Reporting**
   - Hours worked per location
   - Break time analysis
   - Late arrivals / early departures

5. **Integration with Shifts**
   - Auto-validation against scheduled shifts
   - Unscheduled punch warnings
   - Shift adherence metrics

6. **Biometric Authentication**
   - Fingerprint scanner integration
   - Face recognition (camera)
   - Badge/RFID support

### Low Priority
7. **Photo Capture**
   - Optional photo on clock in
   - Verify employee identity
   - Audit trail

8. **Break Management**
   - Paid vs unpaid breaks
   - Mandatory break reminders
   - Break limit enforcement

---

## 📁 File Structure

```
app/
├── (kiosk)/
│   ├── layout.tsx
│   └── kiosk/
│       └── [locationId]/
│           ├── page.tsx
│           ├── KioskClient.tsx
│           └── components/
│               ├── KioskClock.tsx
│               ├── PinInput.tsx
│               └── PunchButtons.tsx
├── (app)/
│   ├── admin/
│   │   └── timeclock/
│   │       └── corrections/
│   │           ├── page.tsx
│   │           └── TimeCorrectionInbox.tsx
│   └── my-shifts/
│       └── components/
│           └── TimeCorrectionRequestForm.tsx
└── api/
    └── v1/
        └── timeclock/
            ├── punch/
            │   └── route.ts
            ├── lookup/
            │   └── route.ts
            └── corrections/
                ├── route.ts
                ├── pending/
                │   └── route.ts
                └── [id]/
                    └── decision/
                        └── route.ts

lib/
├── shifts/
│   ├── time-clock-logic.ts
│   └── timeclock-validations.ts
└── kiosk/
    └── token.ts

types/
└── timeclock.ts
```

---

## ✅ Acceptance Criteria Met

1. ✅ **Kiosk Page:** `/kiosk/{locationId}` with PIN authentication
2. ✅ **Punch Actions:** Clock in/out, break start/end
3. ✅ **Anti-Spoofing:** Kiosk token binds to location
4. ✅ **Sequence Validation:** Enforces valid state transitions
5. ✅ **Large Buttons:** Touch-friendly UI (h-28 buttons)
6. ✅ **Real-Time Clock:** Updates every second
7. ✅ **Time Corrections:** Employee request + Manager approve/reject flow

---

## 🎯 MVP Status

**Implementation Complete:**
- ✅ Database schema (with RLS)
- ✅ API endpoints (7 total)
- ✅ Kiosk UI (full-screen, no nav)
- ✅ Manager inbox for corrections
- ✅ Employee correction request form
- ✅ Anti-spoofing (kiosk tokens)
- ✅ Sequence validation
- ✅ Double-punch prevention

**Not Included in MVP:**
- ❌ Mobile app integration
- ❌ Timesheet generation
- ❌ GPS-based punching
- ❌ Biometric authentication
- ❌ Photo capture
- ❌ Integration with scheduled shifts

---

## 📚 Related Documentation

- [Shifts & Rotas](./rotas-shifts-implementation.md)
- [Leave Management](./leave-management-complete.md)
- [My Week (Self-Service)](./my-week-implementation-complete.md)
- [Planner UI](./planner-ui.md)

---

**Last Updated:** 2025-01-01  
**Version:** 1.0 (MVP Complete)

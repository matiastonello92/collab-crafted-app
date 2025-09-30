# Shift Swap Implementation Plan

## Overview

**Feature**: "Chiedi cambio" (Request Shift Swap)  
**User Story**: As an employee, I want to request a shift swap with a colleague when I cannot work my assigned shift.

---

## Requirements Analysis

### Business Logic
1. **Initiator**: Employee A (has assigned shift) requests swap with Employee B
2. **Target Selection**: Employee A selects a colleague (Employee B) from their location/team
3. **Manager Approval**: Swap must be approved by location manager before taking effect
4. **Status Tracking**: Pending → Approved/Rejected by manager
5. **Shift Reassignment**: If approved, shift is reassigned from A to B (and optionally B's shift to A for mutual swap)

### Data Model Requirements

#### New Table: `shift_swap_requests`
```sql
CREATE TABLE shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Swap Parties
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Shifts Involved
  requester_shift_id UUID NOT NULL REFERENCES shifts(id), -- Shift A wants to swap
  target_shift_id UUID NULL REFERENCES shifts(id),        -- Optional: mutual swap
  
  -- Status & Workflow
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | cancelled
  swap_type TEXT NOT NULL,                -- one_way | mutual
  
  -- Context
  org_id UUID NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id),
  
  -- Approval
  approved_by UUID NULL REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ NULL,
  rejection_reason TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CHECK (requester_id != target_user_id),
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  CHECK (swap_type IN ('one_way', 'mutual'))
);

-- Indexes
CREATE INDEX idx_shift_swap_requests_requester ON shift_swap_requests(requester_id);
CREATE INDEX idx_shift_swap_requests_target ON shift_swap_requests(target_user_id);
CREATE INDEX idx_shift_swap_requests_status ON shift_swap_requests(status);
CREATE INDEX idx_shift_swap_requests_location ON shift_swap_requests(location_id);

-- RLS Policies
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view swaps they're involved in
CREATE POLICY "swap_requests_select_involved" ON shift_swap_requests
  FOR SELECT
  USING (
    auth.uid() = requester_id 
    OR auth.uid() = target_user_id 
    OR user_can_manage_inventory(org_id, location_id) -- Manager can see all
  );

-- Employees can create swap requests
CREATE POLICY "swap_requests_insert_self" ON shift_swap_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id AND user_in_org(org_id));

-- Only managers can approve/reject
CREATE POLICY "swap_requests_update_manager" ON shift_swap_requests
  FOR UPDATE
  USING (user_can_manage_inventory(org_id, location_id));

-- Requester can cancel pending requests
CREATE POLICY "swap_requests_delete_self" ON shift_swap_requests
  FOR DELETE
  USING (auth.uid() = requester_id AND status = 'pending');
```

### API Endpoints

#### 1. `GET /api/v1/shifts/swap-requests`
**Purpose**: Fetch all swap requests for current user (as requester or target)  
**Response**:
```typescript
{
  incoming: SwapRequest[], // Where user is target
  outgoing: SwapRequest[], // Where user is requester
}
```

#### 2. `POST /api/v1/shifts/[id]/request-swap`
**Purpose**: Create a new swap request  
**Body**:
```typescript
{
  target_user_id: string,  // UUID of colleague
  swap_type: 'one_way' | 'mutual',
  target_shift_id?: string, // Required if swap_type = 'mutual'
  notes?: string
}
```

#### 3. `POST /api/v1/shifts/swap-requests/[id]/approve` (Manager only)
**Purpose**: Approve a swap and reassign shifts  
**Logic**:
- Update `shift_swap_requests.status = 'approved'`
- Reassign `requester_shift_id.assigned_to = target_user_id`
- If mutual: Reassign `target_shift_id.assigned_to = requester_id`
- Create audit log

#### 4. `POST /api/v1/shifts/swap-requests/[id]/reject` (Manager only)
**Purpose**: Reject a swap request  
**Body**:
```typescript
{
  rejection_reason?: string
}
```

#### 5. `DELETE /api/v1/shifts/swap-requests/[id]` (Requester only)
**Purpose**: Cancel a pending swap request

---

## UI Components

### Employee View (`/my-shifts`)

#### 1. **MyShiftsList.tsx** - Add "Chiedi cambio" Button
- Display "Request Swap" button for `assigned` or `accepted` shifts
- Open `<RequestSwapDialog />` modal

#### 2. **RequestSwapDialog.tsx** (NEW)
```tsx
interface Props {
  shift: Shift
  onSuccess: () => void
}

// Features:
// - Select colleague from dropdown (fetch eligible users via API)
// - Choose swap type (one-way / mutual)
// - If mutual: select target shift from colleague's shifts
// - Submit request
```

#### 3. **MySwapRequestsPanel.tsx** (NEW)
```tsx
// Display:
// - Outgoing requests (status: pending/approved/rejected)
// - Incoming requests (status: pending) with Accept/Decline buttons
//   - Note: Employee acceptance is optional (could auto-accept or require explicit consent)
```

### Manager View (`/planner`)

#### 4. **ShiftCard.tsx** - Add Swap Badge
- Display indicator if shift has pending swap request

#### 5. **PendingSwapsPanel.tsx** (NEW)
```tsx
// Display all pending swap requests for current location
// Actions: Approve / Reject with reason
```

---

## Implementation Steps

### Phase 1: Database & Backend (60 min)
1. **Migration**: Create `shift_swap_requests` table + RLS policies (20 min)
2. **API Routes**: Implement 5 endpoints listed above (40 min)

### Phase 2: Employee UI (90 min)
3. **RequestSwapDialog**: Modal for creating swap requests (30 min)
4. **MySwapRequestsPanel**: Display incoming/outgoing swaps (30 min)
5. **MyShiftsList Integration**: Add "Chiedi cambio" button (15 min)
6. **SWR Hooks**: `useSwapRequests`, `useEligibleUsers` (15 min)

### Phase 3: Manager UI (60 min)
7. **PendingSwapsPanel**: Manager approval interface (30 min)
8. **ShiftCard Badge**: Visual indicator for swaps (15 min)
9. **Approval Logic**: Backend shift reassignment on approval (15 min)

### Phase 4: Testing & Edge Cases (30 min)
10. **Validation**: Prevent swaps for past shifts, conflicting shifts, etc.
11. **Notifications**: Toast messages for all actions
12. **Audit Logging**: Track all swap events

**Total Estimated Time**: 4 hours

---

## User Acceptance Criteria

### Employee
- [ ] I can request a one-way swap (give my shift to colleague)
- [ ] I can request a mutual swap (exchange shifts)
- [ ] I can see incoming swap requests and accept/decline them
- [ ] I can cancel my pending swap requests
- [ ] I receive clear feedback when swap is approved/rejected

### Manager
- [ ] I can see all pending swap requests for my location
- [ ] I can approve swaps → shifts are automatically reassigned
- [ ] I can reject swaps with a reason
- [ ] I see visual indicators for shifts with pending swaps

---

## Edge Cases & Validations

1. **Shift Status**: Can only swap `assigned` or `accepted` shifts (not `proposed`)
2. **Timing**: Cannot swap shifts that have already started
3. **Conflicts**: Target user must not have conflicting shifts at same time
4. **Capacity**: Target user must have required skills/roles (future: validate via job_tags)
5. **Mutual Swaps**: Both shifts must be within same pay period/week

---

## Alternative: Simplified MVP (2 hours)

If full workflow is too complex, implement **one-way swap only** without target user acceptance:

1. Employee requests swap → Manager sees request with suggested target
2. Manager manually reassigns shift (no automatic reassignment)
3. No `shift_swap_requests` table → Use `shifts.notes` field for swap request metadata

---

## Security Considerations

- **RLS**: Ensure swap requests are only visible to involved parties + managers
- **Validation**: Server-side checks for shift ownership, org/location consistency
- **Audit**: Log all swap approvals/rejections with timestamps and approver ID

---

*Estimated Total Implementation: 4 hours (full) | 2 hours (simplified MVP)*

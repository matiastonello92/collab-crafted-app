# QA Checklist - Klyra Shifts

## 🔒 Security & RLS

### Multi-Tenant Isolation
- [ ] Platform Admin can access all orgs/locations
- [ ] Manager Location A can access Location A data only
- [ ] Manager Location A **CANNOT** access Location B data
- [ ] Base User can view own shifts only
- [ ] Base User **CANNOT** view other users' shifts
- [ ] Cross-location data leakage prevented

### Authentication
- [ ] Login/logout works correctly
- [ ] JWT tokens expire properly
- [ ] Session persistence across page reloads
- [ ] Invalid credentials rejected
- [ ] Password reset flow functional

### Rate Limiting
- [ ] `/api/v1/timeclock/punch` rate-limited (10 req/min)
- [ ] `/api/v1/leave/requests` rate-limited (5 req/min)
- [ ] `/api/v1/shifts/route` rate-limited (20 req/min)
- [ ] Headers return `X-RateLimit-*` correctly
- [ ] 429 status on limit exceeded

## 🧪 Unit Tests

### CRUD Operations
- [ ] Shifts: Create, Read, Update, Delete
- [ ] Leave Requests: Submit, Approve, Reject
- [ ] Rotas: Create, Publish, Archive
- [ ] Timesheets: Generate, Approve, Export
- [ ] Inventory: Create, Update, Approve

### Business Logic
- [ ] Shift overlap detection
- [ ] Compliance rule validation
- [ ] Timesheet calculations accurate
- [ ] Leave request date validation

## 🎭 E2E Tests (Playwright)

### Planner UI
- [ ] Load planner with current week
- [ ] Navigate between weeks (next/previous)
- [ ] Create new shift
- [ ] Assign user to shift
- [ ] Filter by location
- [ ] Display leave requests on calendar

### My Week (Self-Service)
- [ ] Display user's shifts for current week
- [ ] Submit availability preferences
- [ ] Request leave
- [ ] Request time correction
- [ ] Accept/reject shift assignment

### Leave Management Flow
- [ ] Employee submits leave request
- [ ] Manager receives notification
- [ ] Manager approves request
- [ ] Manager rejects request with reason
- [ ] Employee sees updated status

### Kiosk Mode
- [ ] Display kiosk interface
- [ ] Punch in with PIN
- [ ] Punch out
- [ ] Start break
- [ ] End break
- [ ] Reject invalid PIN
- [ ] Display currently punched-in users

## ♿ Accessibility (WCAG 2.1 AA)

### Keyboard Navigation
- [ ] All interactive elements reachable via keyboard
- [ ] Tab order logical and intuitive
- [ ] Escape key closes modals/dialogs
- [ ] Arrow keys navigate lists/menus
- [ ] Skip link to main content functional

### Screen Readers
- [ ] All images have `alt` attributes
- [ ] Form inputs have associated `<label>` elements
- [ ] ARIA labels on icon-only buttons
- [ ] Live regions announce dynamic content
- [ ] Landmarks (`<main>`, `<nav>`, etc.) used correctly

### Visual
- [ ] Color contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI)
- [ ] Focus indicators visible on all interactive elements
- [ ] Text resizable up to 200% without layout breaking
- [ ] No content relies on color alone

### Axe Accessibility Tests
- [ ] Planner page: 0 violations
- [ ] My Shifts page: 0 violations
- [ ] Admin Dashboard: 0 violations
- [ ] Kiosk: 0 violations

## 📊 Input Validation (Zod)

### API Endpoints
- [ ] `/api/v1/shifts/route` - `createShiftSchema`
- [ ] `/api/v1/leave/requests` - `createLeaveRequestSchema`
- [ ] `/api/v1/admin/roles` - `createRoleSchema`
- [ ] `/api/v1/admin/locations` - `createLocationSchema`
- [ ] `/api/v1/timeclock/punch` - `punchSchema`
- [ ] `/api/v1/inventory/create` - `createInventoryHeaderSchema`
- [ ] All endpoints return 400 on invalid input
- [ ] Error messages clear and actionable

## 🚀 Performance

### Load Times
- [ ] Planner loads in < 2s
- [ ] My Shifts loads in < 1s
- [ ] Kiosk loads in < 1s
- [ ] API responses in < 500ms (95th percentile)

### Optimization
- [ ] Images lazy-loaded
- [ ] Code splitting implemented
- [ ] Bundle size < 500KB (gzipped)

## 🔄 CI/CD Pipeline

### GitHub Actions
- [ ] Lint job passes
- [ ] Typecheck job passes
- [ ] Unit tests job passes
- [ ] RLS tests job passes
- [ ] E2E tests job passes
- [ ] Accessibility tests job passes
- [ ] Build succeeds without errors

## 📱 Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## 🧩 Integration Tests

### Email Notifications
- [ ] Leave approval email sent
- [ ] Rota published email sent
- [ ] Shift assignment email sent
- [ ] Email logs recorded in database

### Realtime Features
- [ ] Inventory presence updates in real-time
- [ ] Shift assignments trigger notifications

## 🐛 Regression Tests

- [ ] Infinite recursion in `shift_assignments` RLS fixed
- [ ] Email Logs link visible in admin sidebar
- [ ] All previously reported bugs re-tested

## ✅ Sign-Off

**QA Engineer:** _______________  
**Date:** _______________  
**Build Version:** _______________  
**Test Coverage:** _______________

---

**Notes:**
- All critical tests must pass before production deployment
- Document any test failures in GitHub Issues
- Retest after each bug fix

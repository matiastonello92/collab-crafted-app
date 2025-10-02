-- Step 1: Add location_id columns (nullable initially)
ALTER TABLE leave_requests 
ADD COLUMN location_id uuid REFERENCES locations(id);

ALTER TABLE availability 
ADD COLUMN location_id uuid REFERENCES locations(id);

-- Step 2: Populate existing records with default_location_id from profiles
-- For leave_requests
UPDATE leave_requests lr
SET location_id = p.default_location_id
FROM profiles p
WHERE lr.user_id = p.id
  AND lr.location_id IS NULL
  AND p.default_location_id IS NOT NULL;

-- For availability  
UPDATE availability a
SET location_id = p.default_location_id
FROM profiles p
WHERE a.user_id = p.id
  AND a.location_id IS NULL
  AND p.default_location_id IS NOT NULL;

-- Step 3: For any remaining NULL values, use first active location in org
-- For leave_requests
UPDATE leave_requests lr
SET location_id = (
  SELECT l.id FROM locations l 
  WHERE l.org_id = lr.org_id 
    AND l.status = 'active'
  ORDER BY l.created_at 
  LIMIT 1
)
WHERE lr.location_id IS NULL;

-- For availability
UPDATE availability a
SET location_id = (
  SELECT l.id FROM locations l 
  WHERE l.org_id = a.org_id 
    AND l.status = 'active'
  ORDER BY l.created_at 
  LIMIT 1
)
WHERE a.location_id IS NULL;

-- Step 4: Make columns NOT NULL
ALTER TABLE leave_requests 
ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE availability 
ALTER COLUMN location_id SET NOT NULL;

-- Step 5: Add indexes for performance
CREATE INDEX idx_leave_requests_location_id ON leave_requests(location_id);
CREATE INDEX idx_availability_location_id ON availability(location_id);

-- Step 6: Update RLS policies to include location scoping

-- Drop existing leave_requests policies
DROP POLICY IF EXISTS leave_requests_select ON leave_requests;
DROP POLICY IF EXISTS leave_requests_insert ON leave_requests;
DROP POLICY IF EXISTS leave_requests_update ON leave_requests;
DROP POLICY IF EXISTS leave_requests_delete ON leave_requests;

-- Recreate leave_requests policies with location scoping
CREATE POLICY leave_requests_select ON leave_requests
  FOR SELECT
  USING (
    is_platform_admin() 
    OR (user_id = auth.uid()) 
    OR (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'shifts:approve'))
  );

CREATE POLICY leave_requests_insert ON leave_requests
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND user_in_org(org_id) 
    AND user_in_location(location_id)
  );

CREATE POLICY leave_requests_update ON leave_requests
  FOR UPDATE
  USING (
    is_platform_admin() 
    OR ((user_id = auth.uid()) AND status = 'pending' AND user_in_location(location_id))
    OR (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'shifts:approve'))
  );

CREATE POLICY leave_requests_delete ON leave_requests
  FOR DELETE
  USING (
    is_platform_admin() 
    OR ((user_id = auth.uid()) AND status = 'pending' AND user_in_location(location_id))
  );

-- Drop existing availability policies
DROP POLICY IF EXISTS availability_select ON availability;
DROP POLICY IF EXISTS availability_insert ON availability;
DROP POLICY IF EXISTS availability_update ON availability;
DROP POLICY IF EXISTS availability_delete ON availability;

-- Recreate availability policies with location scoping
CREATE POLICY availability_select ON availability
  FOR SELECT
  USING (
    is_platform_admin() 
    OR (user_id = auth.uid())
    OR (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'shifts:manage'))
  );

CREATE POLICY availability_insert ON availability
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND user_in_org(org_id) 
    AND user_in_location(location_id)
  );

CREATE POLICY availability_update ON availability
  FOR UPDATE
  USING (
    (user_id = auth.uid() AND user_in_location(location_id))
    OR (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'shifts:manage'))
  );

CREATE POLICY availability_delete ON availability
  FOR DELETE
  USING (
    (user_id = auth.uid() AND user_in_location(location_id))
    OR (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'shifts:manage'))
  );
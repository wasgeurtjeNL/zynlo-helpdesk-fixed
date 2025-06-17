-- Create a view to map organization_members to organization_memberships
-- This maintains compatibility with the TypeScript types

CREATE VIEW organization_memberships AS
SELECT 
  id,
  organization_id,
  user_id,
  role,
  permissions,
  joined_at AS created_at,
  joined_at,
  updated_at
FROM organization_members;

-- Create RLS policy for the view
ALTER VIEW organization_memberships SET (security_invoker = on);

-- Grant permissions
GRANT SELECT ON organization_memberships TO authenticated;
GRANT SELECT ON organization_memberships TO anon; 
# Role Definitions

This document describes the role-based access control (RBAC) system used in Paladin.

## Role Types

### Platform Roles (`UserRole`)

Platform roles are assigned at the user account level and control access to platform-wide features.

| Role    | Description                                                               |
| ------- | ------------------------------------------------------------------------- |
| `ADMIN` | Platform administrator with full access to all features and organizations |
| `STAFF` | Standard authenticated user (functionally equivalent to no role)          |
| `null`  | Regular authenticated user with no special platform privileges            |

### Organization Roles (`OrgRole`)

Organization roles are assigned per-organization and control access within that specific organization.

| Role      | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| `OWNER`   | Full control over the organization, can assign any role            |
| `MANAGER` | Can manage members and join requests, but cannot assign OWNER role |
| `MEMBER`  | Basic membership with read access to organization data             |

---

## Permissions Matrix

| Action                       | Platform ADMIN | Platform STAFF/User | Org OWNER | Org MANAGER | Org MEMBER |
| ---------------------------- | :------------: | :-----------------: | :-------: | :---------: | :--------: |
| **Organizations**            |
| View all organizations       |       ✅       |  ❌ (only joined)   |     —     |      —      |     —      |
| Create org request           |       ✅       |         ✅          |     —     |      —      |     —      |
| Approve/reject org requests  |       ✅       |         ❌          |     —     |      —      |     —      |
| View org details             |       ✅       |   ✅ (if member)    |    ✅     |     ✅      |     ✅     |
| Update org info              |       ✅       |         ❌          |    ✅     |     ✅      |     ❌     |
| **Delete organization**      |       ✅       |         ❌          |    ❌     |     ❌      |     ❌     |
| Leave organization           |       ✅       |         ✅          |   ✅\*    |     ✅      |     ✅     |
| **Member Management**        |
| View members                 |       ✅       |   ✅ (if member)    |    ✅     |     ✅      |     ✅     |
| Add members                  |       ✅       |         ❌          |    ✅     |     ✅      |     ❌     |
| Remove members               |       ✅       |         ❌          |    ✅     |   ✅\*\*    |     ❌     |
| Change member roles          |       ✅       |         ❌          |    ✅     |  ✅\*\*\*   |     ❌     |
| **Join Requests**            |
| View join requests           |       ✅       |         ❌          |    ✅     |     ✅      |     ❌     |
| Approve/reject join requests |       ✅       |         ❌          |    ✅     |     ✅      |     ❌     |
| **Requests/Map**             |
| View all disaster requests   |       ✅       |         ❌          |     —     |      —      |     —      |
| View own requests            |       ✅       |         ✅          |     —     |      —      |     —      |
| View org farm requests       |       ✅       | ✅ (if org member)  |     —     |      —      |     —      |
| **Platform Admin Features**  |
| User management page         |       ✅       |         ❌          |     —     |      —      |     —      |
| Manage disaster resources    |       ✅       |         ❌          |     —     |      —      |     —      |

---

## Notes

- `*` **OWNER cannot leave** if they're the last owner of the organization. Ownership must be transferred first.
- `**` **MANAGER cannot remove OWNERs** — only OWNERs or Platform ADMINs can remove an OWNER.
- `***` **MANAGER cannot assign OWNER role** — only existing OWNERs or Platform ADMINs can promote someone to OWNER.

---

## Key Distinctions

### Platform ADMIN vs STAFF

- **Platform ADMIN** acts as a superuser across all organizations
- **Platform STAFF** has no additional privileges over a regular user — it's functionally equivalent to `null`

### Org OWNER vs MANAGER

Both can manage members and join requests, but:

- Only **OWNER** can assign the OWNER role to others
- Only **OWNER** can remove other OWNERs
- **MANAGER** cannot demote or remove an OWNER

### Organization Deletion

- **Only Platform ADMIN** can delete organizations entirely
- Org OWNERs cannot delete their own organization

---

## Database Schema

```prisma
enum UserRole {
  ADMIN
  STAFF
}

enum OrgRole {
  OWNER
  MANAGER
  MEMBER
}
```

Platform roles are stored on the `User` model (`role` field), while organization roles are stored on the `OrganizationMember` join table.

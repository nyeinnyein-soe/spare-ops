# SpareOps Security & Performance Hardening

This plan outlines critical fixes to address security vulnerabilities (scoping and route protection) and performance bottlenecks (N+1 queries and client-side aggregation) identified during the project review.

## User Review Required

> [!IMPORTANT]
> **Scoping Changes:** Once implemented, Sales staff will no longer be able to see requests or usages created by other users. This may change how they interact with the system if they were previously sharing visibility.
> 
> **Performance Optimization:** Moving inventory logic to the backend will change the API requirements. The frontend will need to be updated to consume a new `/inventory/on-hand` endpoint.

## Proposed Changes

### [Backend] API Security & Performance

#### [MODIFY] [index.ts](server/src/index.ts)
- Remove duplicate notification clear route.
- Add `verifyRole(["admin"])` to all user management routes (`/users`).
- Add `verifyRole(["admin"])` to inventory item management routes (POST, PUT, PATCH).

#### [MODIFY] [requestController.ts](server/src/controllers/requestController.ts)
- Update `getRequests` to filter by `requesterId` for 'sales' role.
- Use Prisma `include` to fetch `requester` in the main query to eliminate the N+1 problem.
- Add permission check in `updateStatus` and `deleteRequest`.

#### [MODIFY] [usageController.ts](server/src/controllers/usageController.ts)
- Update `getUsages` to filter by `salespersonId` for 'sales' role.
- Use Prisma `include` to fetch `salesperson` in the main query.
- Add permission check in `deleteUsage`.

#### [NEW] [inventoryService.ts](server/src/services/inventoryService.ts)
- Implement server-side logic to calculate the current "On Hand" inventory for a user.

---

### [Frontend] Data Efficiency

#### [MODIFY] [DataContext.tsx](client/src/contexts/DataContext.tsx)
- Add a new state for `onHandInventory`.
- Fetch data from the new backend inventory summary endpoint.

#### [MODIFY] [SalesDashboardView.tsx](client/src/components/SalesDashboardView.tsx)
- Replace complex client-side calculations with the data provided by the context.

## Verification Plan

### Automated Tests
- I will run the existing backend build to ensure no syntax errors: `npm run build` in `/server`.
- I will verify the API endpoints using `curl` or manual node scripts to check scoping.

### Manual Verification
1. Login as **Sales** user:
   - Verify that only their own requests/usages are visible in the history.
   - Verify that "On Hand" inventory is correctly calculated from the backend.
   - Attempt to access `/api/v1/users` and verify a `403 Forbidden` response.
2. Login as **Admin** user:
   - Verify that all requests/usages are still visible.
   - Verify all management features still work.

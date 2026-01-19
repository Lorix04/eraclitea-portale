# API Documentation (Overview)

This document lists the main endpoints. All admin routes require ADMIN; client routes require CLIENT and will auto-filter by clientId.

- Admin Courses: /api/admin/courses, /api/admin/courses/[id], /publish, /close
- Admin Clients: /api/admin/clients, /api/admin/clients/[id], /toggle-active, /reset-password
- Admin Registrations: /api/admin/registrations, /export
- Admin Certificates: /api/admin/certificates/upload, /upload-batch
- Admin Notifications: /api/admin/notifications, /api/admin/notifications/[id]
- Client Dashboard: /api/client/dashboard
- Client Courses: /api/client/courses, /api/client/courses/[id], /employees, /submit
- Client Certificates: /api/client/certificates, /api/client/certificates/[id]/download
- Client History: /api/client/history
- Client Notifications: /api/client/notifications, /[id]/read, /unread-count

Refer to source files for query params and payloads.

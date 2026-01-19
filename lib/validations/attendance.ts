import { z } from 'zod'

export const attendanceSchema = z.object({
  employeeId: z.string().min(1),
  isPresent: z.boolean(),
  note: z.string().optional(),
})

export const bulkAttendanceSchema = z.object({
  attendances: z.array(attendanceSchema),
})

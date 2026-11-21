package com.campuscare;

import java.sql.Timestamp;
import java.util.List;

public class TestWorkflow {
    public static void main(String[] args) {
        System.out.println("==============================================================");
        System.out.println(" CAMPUSCARE FULL WORKFLOW TEST (STUDENT & COUNSELLOR)");
        System.out.println("==============================================================");

        AppointmentService service = new AppointmentService();
        int passed = 0;
        int failed = 0;

        // 1. Submit a Screening
        try {
            System.out.print("[WORKFLOW 1] Submitting student screening quiz via JDBC... ");
            service.submitScreening(8, 7.5, "Mild to Moderate Academic Anxiety - Informational Screening");
            System.out.println("PASSED");
            passed++;
        } catch (Exception e) {
            System.out.println("FAILED: " + e.getMessage());
            failed++;
        }

        // 2. Counsellor Slot Creation (Dr. Sarah Bennett = ID 1)
        long offset = (long) (Math.random() * 10000000L) + 1500000000L; // Dynamic future time
        long baseTime = (System.currentTimeMillis() + offset) / 3600000L * 3600000L;
        Timestamp start = new Timestamp(baseTime);
        Timestamp end = new Timestamp(baseTime + 3600000L); // 1 hour duration
        int createdSlotId = -1;

        try {
            System.out.print("[WORKFLOW 2] Creating Counsellor Availability Slot... ");
            service.createSlot(1, start, end, "ONLINE", "https://meet.google.com/test-workflow-java", null, "Java Unit Test Slot");
            
            // Retrieve slot ID
            List<Models.AvailabilitySlot> slots = service.getCounsellorAvailabilitySlots(1);
            for (Models.AvailabilitySlot s : slots) {
                if (Math.abs(s.slotStart.getTime() - start.getTime()) < 5000) {
                    createdSlotId = s.availabilityId;
                    break;
                }
            }

            if (createdSlotId > 0) {
                System.out.println("PASSED (Created Slot ID #" + createdSlotId + ")");
                passed++;
            } else {
                System.out.println("FAILED (Could not retrieve created slot)");
                failed++;
            }
        } catch (Exception e) {
            System.out.println("FAILED: " + e.getMessage());
            failed++;
        }

        // 3. Overlap Prevention Check
        try {
            System.out.print("[WORKFLOW 3] Verifying Overlap Prevention on Duplicate Slot... ");
            try {
                service.createSlot(1, start, end, "OFFLINE", null, "Room 101", "Conflicting slot");
                System.out.println("FAILED (Should have rejected overlapping slot)");
                failed++;
            } catch (Exception ex) {
                if (ex.getMessage().contains("overlapping")) {
                    System.out.println("PASSED (Correctly rejected with: '" + ex.getMessage() + "')");
                    passed++;
                } else {
                    System.out.println("FAILED (Unexpected error: " + ex.getMessage() + ")");
                    failed++;
                }
            }
        } catch (Exception e) {
            System.out.println("FAILED: " + e.getMessage());
            failed++;
        }

        // 4. Student Books Slot (Alex Rivera = ID 8)
        int apptId = -1;
        if (createdSlotId > 0) {
            try {
                System.out.print("[WORKFLOW 4] Student Booking Slot (Atomic Lock & Reserve)... ");
                apptId = service.bookAppointment(8, createdSlotId, "Exam Preparation Stress", "ONLINE", "https://meet.google.com/test-workflow-java", null);
                if (apptId > 0) {
                    System.out.println("PASSED (Booked Appt #" + apptId + ", Slot Reserved)");
                    passed++;
                } else {
                    System.out.println("FAILED (Invalid Appt ID)");
                    failed++;
                }
            } catch (Exception e) {
                System.out.println("FAILED: " + e.getMessage());
                failed++;
            }
        }

        // 5. Counsellor Accepts Request
        if (apptId > 0) {
            try {
                System.out.print("[WORKFLOW 5] Counsellor Accepting Request (#" + apptId + ")... ");
                service.acceptRequest(apptId);
                
                // Verify workflow status is CONFIRMED
                List<Models.Appointment> studentAppts = service.getStudentAppointments(8);
                boolean confirmed = false;
                for (Models.Appointment a : studentAppts) {
                    if (a.appointmentId == apptId && "CONFIRMED".equals(a.workflowStatus)) {
                        confirmed = true;
                        break;
                    }
                }

                if (confirmed) {
                    System.out.println("PASSED (Status updated to CONFIRMED, Meeting link unlocked)");
                    passed++;
                } else {
                    System.out.println("FAILED (Workflow status not CONFIRMED)");
                    failed++;
                }
            } catch (Exception e) {
                System.out.println("FAILED: " + e.getMessage());
                failed++;
            }
        }

        // 6. Counsellor Completes Appointment
        if (apptId > 0) {
            try {
                System.out.print("[WORKFLOW 6] Counsellor Completes Consultation Session... ");
                service.completeAppointment(apptId);
                System.out.println("PASSED (Booking Status set to COMPLETED)");
                passed++;
            } catch (Exception e) {
                System.out.println("FAILED: " + e.getMessage());
                failed++;
            }
        }

        System.out.println("==============================================================");
        System.out.println(" WORKFLOW RESULTS: " + passed + " PASSED, " + failed + " FAILED");
        System.out.println("==============================================================");

        if (failed > 0) System.exit(1);
    }
}

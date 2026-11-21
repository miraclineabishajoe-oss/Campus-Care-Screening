package com.campuscare;

import java.sql.Connection;
import java.util.List;

public class TestJavaCampusCare {
    public static void main(String[] args) {
        System.out.println("==============================================================");
        System.out.println(" CAMPUSCARE PURE JAVA & MYSQL 8.0 VERIFICATION SUITE");
        System.out.println("==============================================================");

        int passed = 0;
        int failed = 0;

        // Test 1: JDBC Live MySQL Database Connection
        try {
            System.out.print("[TEST 1] Testing JDBC MySQL 8.0 connection... ");
            try (Connection conn = DBConnection.getConnection()) {
                if (conn != null && !conn.isClosed()) {
                    System.out.println("PASSED (Connected to " + conn.getCatalog() + " at localhost:3306)");
                    passed++;
                } else {
                    System.out.println("FAILED (Connection is null or closed)");
                    failed++;
                }
            }
        } catch (Exception e) {
            System.out.println("FAILED: " + e.getMessage());
            failed++;
        }

        AuthService authService = new AuthService();
        AppointmentService appointmentService = new AppointmentService();

        // Test 2: Student Authentication (Alex Rivera)
        try {
            System.out.print("[TEST 2] Testing Student Login (alex.rivera@student.campuscare.edu)... ");
            Models.User student = authService.loginStudent("alex.rivera@student.campuscare.edu", "Password123!");
            if (student != null && "STUDENT".equals(student.role) && student.id > 0) {
                System.out.println("PASSED (Authenticated: " + student.fullName + ", ID: " + student.id + ")");
                passed++;
            } else {
                System.out.println("FAILED (Invalid user object returned)");
                failed++;
            }
        } catch (Exception e) {
            System.out.println("FAILED: " + e.getMessage());
            failed++;
        }

        // Test 3: Approved Counsellor Authentication (Dr. Sarah Bennett)
        Models.User counsellor = null;
        try {
            System.out.print("[TEST 3] Testing Approved Counsellor Login (s.bennett@campuscare.edu)... ");
            counsellor = authService.loginCounsellor("s.bennett@campuscare.edu", "Password123!");
            if (counsellor != null && "COUNSELLOR".equals(counsellor.role) && counsellor.isActive == 1) {
                System.out.println("PASSED (Authenticated: " + counsellor.fullName + ", Spec: " + counsellor.specialization + ")");
                passed++;
            } else {
                System.out.println("FAILED (Counsellor not active or role mismatch)");
                failed++;
            }
        } catch (Exception e) {
            System.out.println("FAILED: " + e.getMessage());
            failed++;
        }

        // Test 4: Inactive Counsellor Approval Enforcement (Elena Rostova)
        try {
            System.out.print("[TEST 4] Testing Inactive Counsellor Login Approval Gate (e.rostova@campuscare.edu)... ");
            try {
                authService.loginCounsellor("e.rostova@campuscare.edu", "Password123!");
                System.out.println("FAILED (Unapproved counsellor was erroneously permitted to log in)");
                failed++;
            } catch (Exception ex) {
                if (ex.getMessage().contains("pending administrative verification") || ex.getMessage().contains("Active authorization required")) {
                    System.out.println("PASSED (Correctly blocked with message: '" + ex.getMessage() + "')");
                    passed++;
                } else {
                    System.out.println("FAILED (Unexpected error message: " + ex.getMessage() + ")");
                    failed++;
                }
            }
        } catch (Exception e) {
            System.out.println("FAILED: " + e.getMessage());
            failed++;
        }

        // Test 5: Query Open Availability Slots
        try {
            System.out.print("[TEST 5] Testing Query Open Availability Slots from MySQL... ");
            List<Models.AvailabilitySlot> slots = appointmentService.getAvailableSlots();
            System.out.println("PASSED (Retrieved " + slots.size() + " open slots)");
            passed++;
        } catch (Exception e) {
            System.out.println("FAILED: " + e.getMessage());
            failed++;
        }

        // Test 6: Counsellor Appointments & Workflow Status
        if (counsellor != null) {
            try {
                System.out.print("[TEST 6] Testing Counsellor Assigned Appointments Retrieval... ");
                List<Models.Appointment> appts = appointmentService.getCounsellorAppointments(counsellor.id);
                System.out.println("PASSED (Retrieved " + appts.size() + " appointments for counsellor #" + counsellor.id + ")");
                passed++;
            } catch (Exception e) {
                System.out.println("FAILED: " + e.getMessage());
                failed++;
            }
        }

        // Test 7: Authorized Caseload Retrieval
        if (counsellor != null) {
            try {
                System.out.print("[TEST 7] Testing Authorized Student Caseload Query... ");
                List<Models.AuthorizedStudent> caseload = appointmentService.getAuthorizedStudents(counsellor.id);
                System.out.println("PASSED (Found " + caseload.size() + " assigned students in caseload)");
                passed++;
            } catch (Exception e) {
                System.out.println("FAILED: " + e.getMessage());
                failed++;
            }
        }

        // Test 8: Clinical Reports & Analytics Aggregation
        if (counsellor != null) {
            try {
                System.out.print("[TEST 8] Testing Clinical Analytics Aggregations... ");
                Models.ClinicalAnalytics stats = appointmentService.getCounsellorAnalytics(counsellor.id);
                System.out.println("PASSED (Students: " + stats.totalStudents + ", Screenings: " + stats.totalScreenings + 
                                   ", Avg Score: " + String.format("%.2f", stats.averageScore) + 
                                   ", Mild: " + stats.lowDistressCount + ", Mod: " + stats.moderateDistressCount + ", Severe: " + stats.highDistressCount + ")");
                passed++;
            } catch (Exception e) {
                System.out.println("FAILED: " + e.getMessage());
                failed++;
            }
        }

        // Test 9: Student Wellness Screening History
        try {
            System.out.print("[TEST 9] Testing Student Screening History Retrieval... ");
            List<Models.Screening> screenings = appointmentService.getStudentScreenings(1);
            System.out.println("PASSED (Retrieved " + screenings.size() + " screening records for Student #1)");
            passed++;
        } catch (Exception e) {
            System.out.println("FAILED: " + e.getMessage());
            failed++;
        }

        System.out.println("==============================================================");
        System.out.println(" RESULTS: " + passed + " PASSED, " + failed + " FAILED (TOTAL: " + (passed + failed) + ")");
        System.out.println("==============================================================");

        if (failed > 0) {
            System.exit(1);
        }
    }
}

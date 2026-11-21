package com.campuscare;

import java.sql.Timestamp;

public class Models {
    public static class User {
        public int id;
        public String fullName;
        public String email;
        public String role; // "STUDENT" or "COUNSELLOR"
        public String specialization;
        public int isActive;

        public User(int id, String fullName, String email, String role) {
            this.id = id;
            this.fullName = fullName;
            this.email = email;
            this.role = role;
        }
    }

    public static class AvailabilitySlot {
        public int availabilityId;
        public int counsellorId;
        public String counsellorName;
        public String specialization;
        public Timestamp slotStart;
        public Timestamp slotEnd;
        public boolean isAvailable;
        public String sessionMode; // "ONLINE" or "OFFLINE"
        public String meetingLink;
        public String location;
        public String notes;

        public AvailabilitySlot(int availabilityId, int counsellorId, Timestamp slotStart, Timestamp slotEnd, boolean isAvailable) {
            this.availabilityId = availabilityId;
            this.counsellorId = counsellorId;
            this.slotStart = slotStart;
            this.slotEnd = slotEnd;
            this.isAvailable = isAvailable;
            this.sessionMode = "OFFLINE";
            this.location = "Counselling Room 204";
        }
    }

    public static class Appointment {
        public int appointmentId;
        public int studentId;
        public String studentName;
        public String studentEmail;
        public int availabilityId;
        public String counsellorName;
        public Timestamp slotStart;
        public Timestamp slotEnd;
        public String bookingStatus; // "BOOKED", "CANCELLED", "COMPLETED"
        public String workflowStatus; // "PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"
        public String sessionMode;
        public String meetingLink;
        public String location;
        public String reason;
    }

    public static class Screening {
        public int screeningId;
        public int studentId;
        public double overallScore;
        public String summary;
        public Timestamp submittedAt;

        public Screening(int screeningId, int studentId, double overallScore, String summary, Timestamp submittedAt) {
            this.screeningId = screeningId;
            this.studentId = studentId;
            this.overallScore = overallScore;
            this.summary = summary;
            this.submittedAt = submittedAt;
        }
    }

    public static class AuthorizedStudent {
        public int studentId;
        public String fullName;
        public String email;
        public int totalSessions;
        public Timestamp latestSessionDate;

        public AuthorizedStudent(int studentId, String fullName, String email, int totalSessions, Timestamp latestSessionDate) {
            this.studentId = studentId;
            this.fullName = fullName;
            this.email = email;
            this.totalSessions = totalSessions;
            this.latestSessionDate = latestSessionDate;
        }
    }

    public static class ClinicalAnalytics {
        public int totalStudents;
        public int totalScreenings;
        public double averageScore;
        public int lowDistressCount;
        public int moderateDistressCount;
        public int highDistressCount;
        public int counsellorTotalSlots;
        public int counsellorActiveSlots;
        public int counsellorPendingRequests;
        public int counsellorConfirmedAppts;
        public int counsellorCompletedAppts;
    }
}

